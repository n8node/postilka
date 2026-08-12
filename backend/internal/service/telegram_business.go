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
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var ErrTelegramBusinessDisabled = errors.New("telegram business stories disabled")

type TelegramBusinessService struct {
	registrations *repository.TelegramBusinessRegistrationRepository
	channels      *repository.ChannelRepository
	provider      *TelegramProviderSettingsService
	botClient     *TelegramBotClient
	wsSvc         *WorkspaceService
	quota         *QuotaService
	cipher        *SecretCipher
	cfg           *config.Config
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
	token, err := s.cipher.Decrypt(rec.BotTokenEncrypted)
	if err != nil {
		return nil, err
	}
	connections, err := s.botClient.PollBusinessConnections(ctx, token)
	if err != nil {
		return nil, sanitizeTelegramError(err)
	}
	connected := make([]model.ChannelListItem, 0)
	for _, conn := range connections {
		item, upsertErr := s.upsertBusinessChannel(ctx, ws.ID, rec, token, conn)
		if upsertErr != nil {
			continue
		}
		connected = append(connected, item)
	}
	webhookURL := s.cfg.TelegramBusinessWebhookURL(rec.ID)
	if err := s.botClient.SetBusinessWebhook(ctx, token, webhookURL, rec.WebhookSecret); err != nil {
		return nil, sanitizeTelegramError(err)
	}
	status := "pending"
	lastErr := ""
	if len(connected) > 0 {
		status = "active"
	} else {
		lastErr = "Business-подключение не найдено. Подключите бота в Telegram Business."
	}
	_ = s.registrations.UpdateStatus(ctx, rec.ID, status, lastErr)
	return &model.TelegramBusinessConnectResult{
		RegistrationID: rec.ID,
		BotUsername:    rec.BotUsername,
		Connected:      connected,
		Hint:           lastErr,
	}, nil
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
	_, err = s.upsertBusinessChannel(ctx, rec.WorkspaceID, rec, token, *update.BusinessConnection)
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
	if !conn.Rights.CanManageStories {
		return model.ChannelListItem{}, fmt.Errorf("бот не имеет права can_manage_stories")
	}
	name := businessConnectionDisplayName(conn.User)
	now := time.Now()
	canManage := conn.Rights.CanManageStories
	enabled := conn.IsEnabled
	meta := model.ChannelMetadata{
		ProviderTitle:             name,
		BusinessUserID:            strconvFormatInt(conn.User.ID),
		CanManageStories:          &canManage,
		BusinessConnectionEnabled: &enabled,
	}
	if username := strings.TrimSpace(conn.User.Username); username != "" {
		meta.PublicURL = "https://t.me/" + username
		meta.AvatarURL = "https://t.me/i/userpic/320/" + username + ".jpg"
	}
	status := model.ChannelStatusActive
	lastError := ""
	if !conn.IsEnabled {
		status = model.ChannelStatusNeedsReconnect
		lastError = "Business-подключение отключено в Telegram"
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
			WorkspaceID:         workspaceID,
			Provider:            model.ChannelProviderTelegram,
			Name:                name,
			ChatID:              conn.ID,
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
