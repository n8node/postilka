package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var ErrTelegramBusinessDisabled = errors.New("telegram business stories disabled")

var errSkipDisabledBusinessConnection = errors.New("skip disabled business connection")

type TelegramBusinessService struct {
	registrations *repository.TelegramBusinessRegistrationRepository
	channels      *repository.ChannelRepository
	provider      *TelegramProviderSettingsService
	botClient     *TelegramBotClient
	wsSvc         *WorkspaceService
	quota         *QuotaService
	cipher        *SecretCipher
	cfg           *config.Config
	botSyncLocks  sync.Map
	notify        *NotificationService
}

func NewTelegramBusinessService(
	registrations *repository.TelegramBusinessRegistrationRepository,
	channels *repository.ChannelRepository,
	provider *TelegramProviderSettingsService,
	botClient *TelegramBotClient,
	wsSvc *WorkspaceService,
	quota *QuotaService,
	cipher *SecretCipher,
	cfg *config.Config,
) *TelegramBusinessService {
	return &TelegramBusinessService{
		registrations: registrations,
		channels:      channels,
		provider:      provider,
		botClient:     botClient,
		wsSvc:         wsSvc,
		quota:         quota,
		cipher:        cipher,
		cfg:           cfg,
	}
}

func (s *TelegramBusinessService) SetNotifier(n *NotificationService) {
	s.notify = n
}

func (s *TelegramBusinessService) ensureEnabled(ctx context.Context) error {
	cfg, err := s.provider.GetEffective(ctx)
	if err != nil {
		return err
	}
	if !cfg.Enabled {
		return ErrTelegramProviderDisabled
	}
	if !cfg.BusinessStoriesEnabled {
		return ErrTelegramBusinessDisabled
	}
	return nil
}

func (s *TelegramBusinessService) requireAdmin(ctx context.Context, userID string, r *http.Request) (*model.Workspace, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleAdmin); err != nil {
		return nil, err
	}
	return ws, nil
}

func (s *TelegramBusinessService) Connect(
	ctx context.Context,
	userID string,
	r *http.Request,
	botToken string,
) (*model.TelegramBusinessConnectResult, error) {
	if err := s.ensureEnabled(ctx); err != nil {
		return nil, err
	}
	ws, err := s.requireAdmin(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if s.cipher == nil {
		return nil, ErrCryptoUnavailable
	}
	botToken = strings.TrimSpace(botToken)
	if botToken == "" {
		return nil, ErrInvalidBotToken
	}
	bot, err := s.botClient.GetMe(ctx, botToken)
	if err != nil {
		return nil, fmt.Errorf("%w: %s", ErrInvalidBotToken, sanitizeTelegramError(err).Error())
	}
	encrypted, err := s.cipher.Encrypt(botToken)
	if err != nil {
		return nil, err
	}
	secret, err := randomWebhookSecret()
	if err != nil {
		return nil, err
	}
	rec, err := s.registrations.Upsert(ctx, repository.TelegramBusinessRegistrationUpsertParams{
		WorkspaceID:       ws.ID,
		BotUserID:         bot.ID,
		BotUsername:       bot.Username,
		BotTokenEncrypted: encrypted,
		WebhookSecret:     secret,
		Status:            "pending",
	})
	if err != nil {
		return nil, err
	}
	webhookURL := s.cfg.TelegramBusinessWebhookURL(rec.ID)
	if err := s.botClient.SetBusinessWebhook(ctx, botToken, webhookURL, secret); err != nil {
		_ = s.registrations.UpdateStatus(ctx, rec.ID, "pending", err.Error())
		return nil, fmt.Errorf("не удалось настроить webhook Telegram: %w", sanitizeTelegramError(err))
	}
	cfg, _ := s.provider.GetEffective(ctx)
	hint := strings.TrimSpace(cfg.BusinessConnectHelpText)
	if hint == "" {
		hint = model.DefaultTelegramProviderSettings().BusinessConnectHelpText
	}
	return &model.TelegramBusinessConnectResult{
		RegistrationID: rec.ID,
		BotUsername:    bot.Username,
		Connected:      []model.ChannelListItem{},
		Hint:           hint,
	}, nil
}

func (s *TelegramBusinessService) Sync(
	ctx context.Context,
	userID string,
	r *http.Request,
	registrationID string,
) (*model.TelegramBusinessConnectResult, error) {
	if err := s.ensureEnabled(ctx); err != nil {
		return nil, err
	}
	ws, err := s.requireAdmin(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	rec, err := s.registrations.GetByID(ctx, registrationID)
	if err != nil {
		return nil, err
	}
	if rec.WorkspaceID != ws.ID {
		return nil, repository.ErrNotFound
	}
	unlock := s.acquireBotSync(rec.BotUserID)
	defer unlock()

	token, err := s.cipher.Decrypt(rec.BotTokenEncrypted)
	if err != nil {
		return nil, err
	}
	expectedWebhookURL := s.cfg.TelegramBusinessWebhookURL(rec.ID)

	connected := s.listExistingBusinessChannels(ctx, ws.ID, rec.BotUsername)

	if err := s.botClient.SetBusinessWebhook(ctx, token, expectedWebhookURL, rec.WebhookSecret); err != nil {
		return nil, sanitizeTelegramError(err)
	}
	connected = s.waitForBusinessChannels(ctx, ws.ID, rec.BotUsername, connected)

	webhookInfo, _ := s.botClient.GetWebhookInfo(ctx, token)

	issues := make([]string, 0)
	usedFallback := false
	if len(connected) == 0 && shouldPollBusinessConnectionsFallback(webhookInfo) {
		usedFallback = true
		var pollIssues []string
		connected, pollIssues = s.recoverBusinessConnectionsViaPolling(
			ctx, ws.ID, rec, token, expectedWebhookURL, connected,
		)
		issues = append(issues, pollIssues...)
		webhookInfo, _ = s.botClient.GetWebhookInfo(ctx, token)
	}

	foundConnections := 0
	if len(connected) > 0 {
		foundConnections = len(connected)
	} else if webhookInfo != nil && webhookInfo.PendingUpdateCount > 0 {
		foundConnections = webhookInfo.PendingUpdateCount
	}

	status := "pending"
	lastErr := ""
	if len(connected) > 0 {
		status = "active"
		if usedFallback {
			lastErr = "Профиль подключён через резервную синхронизацию (getUpdates по прокси). Webhook восстановлен."
		}
	} else {
		lastErr, issues = s.buildBusinessSyncFailureMessage(ctx, rec, webhookInfo, expectedWebhookURL, foundConnections, issues)
	}
	_ = s.registrations.UpdateStatus(ctx, rec.ID, status, lastErr)
	return &model.TelegramBusinessConnectResult{
		RegistrationID: rec.ID,
		BotUsername:    rec.BotUsername,
		Connected:      connected,
		Hint:           lastErr,
		Issues:         issues,
	}, nil
}

func shouldPollBusinessConnectionsFallback(info *TelegramWebhookInfo) bool {
	if info == nil {
		return true
	}
	if strings.TrimSpace(info.LastErrorMessage) != "" {
		return true
	}
	return info.PendingUpdateCount > 0
}

func (s *TelegramBusinessService) recoverBusinessConnectionsViaPolling(
	ctx context.Context,
	workspaceID string,
	rec *repository.TelegramBusinessRegistration,
	token, expectedWebhookURL string,
	connected []model.ChannelListItem,
) ([]model.ChannelListItem, []string) {
	issues := make([]string, 0)
	connections, pollErr := s.botClient.PollBusinessConnectionsOnce(ctx, token)
	if pollErr != nil {
		_ = s.botClient.SetBusinessWebhook(ctx, token, expectedWebhookURL, rec.WebhookSecret)
		if isTelegramGetUpdatesConflict(pollErr) {
			return connected, append(issues,
				"Telegram обрабатывает предыдущий запрос — подождите 5 секунд и нажмите «Проверить» один раз, не несколько подряд.",
			)
		}
		if err := formatTelegramBusinessProxyError(sanitizeTelegramError(pollErr)); err != nil {
			return connected, append(issues, err.Error())
		}
		return connected, issues
	}

	seen := map[string]struct{}{}
	for _, item := range connected {
		seen[item.ID] = struct{}{}
	}
	for _, conn := range connections {
		item, upsertErr := s.upsertBusinessChannel(ctx, workspaceID, rec, token, conn)
		if errors.Is(upsertErr, errSkipDisabledBusinessConnection) {
			continue
		}
		if upsertErr != nil {
			issues = append(issues, upsertErr.Error())
			continue
		}
		if _, ok := seen[item.ID]; ok {
			continue
		}
		seen[item.ID] = struct{}{}
		connected = append(connected, item)
	}

	if err := s.botClient.SetBusinessWebhook(ctx, token, expectedWebhookURL, rec.WebhookSecret); err != nil {
		issues = append(issues, "Не удалось восстановить webhook: "+sanitizeTelegramError(err).Error())
	}
	return connected, issues
}

func (s *TelegramBusinessService) waitForBusinessChannels(
	ctx context.Context,
	workspaceID, botUsername string,
	initial []model.ChannelListItem,
) []model.ChannelListItem {
	if len(initial) > 0 {
		return initial
	}
	delays := []time.Duration{400 * time.Millisecond, 600 * time.Millisecond, 1 * time.Second, 1500 * time.Millisecond}
	for _, delay := range delays {
		select {
		case <-ctx.Done():
			return initial
		case <-time.After(delay):
		}
		found := s.listExistingBusinessChannels(ctx, workspaceID, botUsername)
		if len(found) > 0 {
			return found
		}
	}
	return initial
}

func (s *TelegramBusinessService) buildBusinessSyncFailureMessage(
	ctx context.Context,
	rec *repository.TelegramBusinessRegistration,
	webhookInfo *TelegramWebhookInfo,
	expectedWebhookURL string,
	foundConnections int,
	issues []string,
) (string, []string) {
	if len(issues) > 0 {
		return strings.Join(issues, " "), issues
	}
	if msg := strings.TrimSpace(rec.LastError); msg != "" {
		return msg, issues
	}
	if webhookInfo != nil {
		actualURL := strings.TrimSpace(webhookInfo.URL)
		if actualURL != "" && actualURL != expectedWebhookURL {
			issue := fmt.Sprintf(
				"Webhook бота указывает на другой URL (%s). Если вы искали обычные Telegram-каналы тем же ботом, повторите «Подключить бота» в Business.",
				actualURL,
			)
			return issue, append(issues, issue)
		}
		if actualURL == "" {
			issue := "Webhook бота не установлен — нажмите «Подключить бота» в Business, затем переподключите @" + rec.BotUsername + " в Telegram Business."
			return issue, append(issues, issue)
		}
		if msg := strings.TrimSpace(webhookInfo.LastErrorMessage); msg != "" {
			issue := "Telegram не доставляет webhook: " + msg +
				". Нажмите «Проверить подключение» — Postilka заберёт события через getUpdates по прокси."
			return issue, append(issues, issue)
		}
		if webhookInfo.PendingUpdateCount > 0 && foundConnections == 0 {
			issue := fmt.Sprintf(
				"У Telegram %d необработанных обновлений, но business-подключение не найдено — проверьте, что в Telegram Business добавлен именно @%s",
				webhookInfo.PendingUpdateCount,
				rec.BotUsername,
			)
			return issue, append(issues, issue)
		}
	}
	proxyNote := s.telegramProxyHint(ctx)
	base := "Webhook настроен. Переподключите @" + rec.BotUsername +
		" в Telegram Business (с «Управление историями»), подождите 5–10 секунд — профиль появится автоматически. Нажимайте «Проверить» один раз, не подряд."
	if proxyNote != "" {
		base += " " + proxyNote
	}
	return base, issues
}

func (s *TelegramBusinessService) acquireBotSync(botUserID int64) func() {
	v, _ := s.botSyncLocks.LoadOrStore(botUserID, &sync.Mutex{})
	mu := v.(*sync.Mutex)
	mu.Lock()
	return mu.Unlock
}

func isTelegramGetUpdatesConflict(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	if !strings.Contains(msg, "getupdates") {
		return false
	}
	return strings.Contains(msg, "conflict") ||
		strings.Contains(msg, "webhook") ||
		strings.Contains(msg, "terminated by other")
}

func (s *TelegramBusinessService) RestoreWebhookForWorkspaceBot(
	ctx context.Context,
	workspaceID string,
	botUserID int64,
) error {
	rec, err := s.registrations.GetByWorkspaceBot(ctx, workspaceID, botUserID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil
		}
		return err
	}
	token, err := s.cipher.Decrypt(rec.BotTokenEncrypted)
	if err != nil {
		return err
	}
	webhookURL := s.cfg.TelegramBusinessWebhookURL(rec.ID)
	return s.botClient.SetBusinessWebhook(ctx, token, webhookURL, rec.WebhookSecret)
}

func (s *TelegramBusinessService) listExistingBusinessChannels(
	ctx context.Context,
	workspaceID, botUsername string,
) []model.ChannelListItem {
	items, err := s.channels.ListByWorkspace(ctx, workspaceID)
	if err != nil {
		return nil
	}
	botUsername = strings.ToLower(strings.TrimPrefix(strings.TrimSpace(botUsername), "@"))
	out := make([]model.ChannelListItem, 0)
	for _, ch := range items {
		if ch.Provider != model.ChannelProviderTelegram || ch.ChatType != model.TelegramChatTypeBusiness {
			continue
		}
		if botUsername != "" && strings.ToLower(strings.TrimSpace(ch.BotUsername)) != botUsername {
			continue
		}
		row, err := s.channels.GetRowByID(ctx, workspaceID, ch.ID)
		if err != nil {
			continue
		}
		out = append(out, buildChannelListItem(ch, row.BotTokenEncrypted, s.cipher))
	}
	return out
}

func (s *TelegramBusinessService) enrichBusinessConnection(
	ctx context.Context,
	token string,
	conn TelegramBusinessConnection,
) TelegramBusinessConnection {
	if conn.ID == "" {
		return conn
	}
	full, err := s.botClient.GetBusinessConnection(ctx, token, conn.ID)
	if err != nil || full == nil {
		return conn
	}
	return *full
}

func formatTelegramBusinessProxyError(err error) error {
	if err == nil {
		return nil
	}
	msg := err.Error()
	if strings.Contains(msg, "503") && strings.Contains(msg, "8889") {
		return fmt.Errorf(
			"%w: локальный telegram-proxy (:8889) недоступен — на сервере выполните «docker compose ... up -d --force-recreate telegram-proxy» и проверьте TELEGRAM_UPSTREAM_* в .env",
			err,
		)
	}
	if strings.Contains(msg, "deleteWebhook") && (strings.Contains(msg, "deadline exceeded") || strings.Contains(msg, "timeout")) {
		return fmt.Errorf(
			"%w: прокси Telegram не ответил вовремя — проверьте telegram-proxy (:8889) и upstream в .env, затем нажмите «Проверить» ещё раз",
			err,
		)
	}
	return err
}

func (s *TelegramBusinessService) telegramProxyHint(ctx context.Context) string {
	cfg, err := s.provider.GetEffective(ctx)
	if err != nil {
		return ""
	}
	if !cfg.ProxyEnabled || len(cfg.ProxyURLs) == 0 {
		return "Запросы к Telegram API идут напрямую (прокси выключен в админке) — при блокировках включите прокси."
	}
	if hop := strings.TrimSpace(s.cfg.TelegramLocalProxy); hop != "" {
		return "Запросы к Telegram API идут через локальный прокси " + maskProxyURLForError(hop) + ", затем upstream из .env."
	}
	return "Запросы к Telegram API идут через прокси из настроек Telegram."
}

func (s *TelegramBusinessService) HandleWebhook(
	ctx context.Context,
	registrationID, secretHeader string,
	body []byte,
) error {
	rec, err := s.registrations.GetByID(ctx, registrationID)
	if err != nil {
		return err
	}
	if strings.TrimSpace(secretHeader) != rec.WebhookSecret {
		return fmt.Errorf("invalid webhook secret")
	}
	var update telegramBusinessUpdate
	if err := json.Unmarshal(body, &update); err != nil {
		return fmt.Errorf("invalid webhook body")
	}
	if update.BusinessConnection == nil {
		return nil
	}
	token, err := s.cipher.Decrypt(rec.BotTokenEncrypted)
	if err != nil {
		return err
	}
	conn := s.enrichBusinessConnection(ctx, token, *update.BusinessConnection)
	_, err = s.upsertBusinessChannel(ctx, rec.WorkspaceID, rec, token, conn)
	if errors.Is(err, errSkipDisabledBusinessConnection) {
		return nil
	}
	if err != nil {
		_ = s.registrations.UpdateStatus(ctx, rec.ID, "pending", err.Error())
		return err
	}
	_ = s.registrations.UpdateStatus(ctx, rec.ID, "active", "")
	return nil
}

func (s *TelegramBusinessService) upsertBusinessChannel(
	ctx context.Context,
	workspaceID string,
	rec *repository.TelegramBusinessRegistration,
	botToken string,
	conn TelegramBusinessConnection,
) (model.ChannelListItem, error) {
	if conn.ID == "" {
		return model.ChannelListItem{}, fmt.Errorf("empty business connection id")
	}
	conn = s.enrichBusinessConnection(ctx, botToken, conn)
	if !conn.IsEnabled {
		existing, err := s.channels.GetByChat(ctx, workspaceID, string(model.ChannelProviderTelegram), conn.ID)
		if err == nil && existing != nil && existing.ChatType == model.TelegramChatTypeBusiness {
			_ = s.channels.UpdateStatus(ctx, workspaceID, existing.ID, model.ChannelStatusNeedsReconnect, "Business-подключение отключено в Telegram")
			if s.notify != nil {
				s.notify.NotifyChannelReconnect(ctx, workspaceID, existing.ID, existing.Name, "Business-подключение отключено в Telegram")
			}
		}
		return model.ChannelListItem{}, errSkipDisabledBusinessConnection
	}
	name := businessConnectionDisplayName(conn.User)
	now := time.Now()
	canManage := conn.CanManageStories()
	enabled := conn.IsEnabled
	userChatID := conn.UserChatID
	if userChatID <= 0 && conn.User.ID > 0 {
		userChatID = conn.User.ID
	}
	meta := model.ChannelMetadata{
		ProviderTitle:             name,
		BusinessUserID:            strconvFormatInt(conn.User.ID),
		BusinessUserChatID:        strconvFormatInt(userChatID),
		CanManageStories:          &canManage,
		BusinessConnectionEnabled: &enabled,
	}
	if username := strings.TrimSpace(conn.User.Username); username != "" {
		meta.PublicURL = "https://t.me/" + username
		meta.AvatarURL = telegramUsernameAvatarURL(username)
	}
	if body, ct, err := s.botClient.FetchBusinessUserAvatar(ctx, botToken, userChatID, conn.User.ID, conn.User.Username); err == nil && len(body) > 0 {
		meta = mergeChannelAvatar(meta, avatarDataURI(body, ct))
	}
	status := model.ChannelStatusActive
	lastError := ""
	if !canManage {
		lastError = "Telegram API не подтвердил право «Управление историями» — проверьте настройки бота; публикация истории может не пройти"
	}
	encrypted, err := s.cipher.Encrypt(botToken)
	if err != nil {
		return model.ChannelListItem{}, err
	}
	existing, err := s.channels.GetByChat(ctx, workspaceID, string(model.ChannelProviderTelegram), conn.ID)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return model.ChannelListItem{}, err
	}
	var ch *model.Channel
	if existing != nil && existing.ChatType == model.TelegramChatTypeBusiness {
		updated, err := s.channels.SaveChannel(ctx, repository.ChannelSaveParams{
			WorkspaceID:         workspaceID,
			ChannelID:           existing.ID,
			Provider:            model.ChannelProviderTelegram,
			Name:                name,
			ChatType:            model.TelegramChatTypeBusiness,
			BotUsername:         rec.BotUsername,
			BotTokenEncrypted:   encrypted,
			Status:              status,
			Metadata:            meta,
			MetadataRefreshedAt: &now,
		})
		if err != nil {
			return model.ChannelListItem{}, err
		}
		ch = updated
	} else if existing != nil {
		return model.ChannelListItem{}, fmt.Errorf("этот идентификатор уже используется другим каналом")
	} else {
		count, err := s.channels.CountByWorkspace(ctx, workspaceID)
		if err != nil {
			return model.ChannelListItem{}, err
		}
		if err := s.quota.CheckChannelQuota(ctx, workspaceID, count); err != nil {
			return model.ChannelListItem{}, err
		}
		created, err := s.channels.Create(ctx, repository.ChannelCreateParams{
			WorkspaceID:           workspaceID,
			Provider:              model.ChannelProviderTelegram,
			Name:                  name,
			ChatID:                conn.ID,
			ChatType:              model.TelegramChatTypeBusiness,
			BotUsername:           rec.BotUsername,
			BotTokenEncrypted:       encrypted,
			RefreshTokenEncrypted: "",
			Status:                status,
			Metadata:              meta,
			MetadataRefreshedAt:   &now,
		})
		if err != nil {
			return model.ChannelListItem{}, err
		}
		ch = created
	}
	if lastError != "" || status != model.ChannelStatusActive {
		_ = s.channels.UpdateStatus(ctx, workspaceID, ch.ID, status, lastError)
	}
	return buildChannelListItem(*ch, encrypted, s.cipher), nil
}

func businessConnectionDisplayName(user telegramUser) string {
	parts := []string{}
	if first := strings.TrimSpace(user.FirstName); first != "" {
		parts = append(parts, first)
	}
	if last := strings.TrimSpace(user.LastName); last != "" {
		parts = append(parts, last)
	}
	if len(parts) > 0 {
		return strings.Join(parts, " ")
	}
	if username := strings.TrimSpace(user.Username); username != "" {
		return "@" + username
	}
	return "Telegram Business"
}

func randomWebhookSecret() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func strconvFormatInt(v int64) string {
	return fmt.Sprintf("%d", v)
}
