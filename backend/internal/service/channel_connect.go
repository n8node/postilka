package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/repository"
)

const channelOAuthSessionTTL = 30 * time.Minute

var (
	ErrChannelOAuthStateInvalid = errors.New("oauth state invalid")
	ErrChannelOAuthSessionExpired = errors.New("oauth session expired")
)

type ChannelConnectService struct {
	channels       *repository.ChannelRepository
	oauthSessions  *repository.ChannelOAuthSessionRepository
	socialSettings *SocialProviderSettingsService
	telegram       *TelegramProviderSettingsService
	wsSvc          *WorkspaceService
	quota          *QuotaService
	cipher         *SecretCipher
	maxClient      *oauthclient.MAXBotClient
	cfg            *config.Config
}

func NewChannelConnectService(
	channels *repository.ChannelRepository,
	oauthSessions *repository.ChannelOAuthSessionRepository,
	socialSettings *SocialProviderSettingsService,
	telegram *TelegramProviderSettingsService,
	wsSvc *WorkspaceService,
	quota *QuotaService,
	cipher *SecretCipher,
	cfg *config.Config,
) *ChannelConnectService {
	return &ChannelConnectService{
		channels:       channels,
		oauthSessions:  oauthSessions,
		socialSettings: socialSettings,
		telegram:       telegram,
		wsSvc:          wsSvc,
		quota:          quota,
		cipher:         cipher,
		maxClient:      oauthclient.NewMAXBotClient(),
		cfg:            cfg,
	}
}

func (s *ChannelConnectService) CombinedProviderInfo(ctx context.Context) model.ChannelProviderInfo {
	info := s.telegram.ChannelProviderInfo(ctx)
	info.Providers = s.socialSettings.AllPublicInfo(ctx)
	return info
}

func (s *ChannelConnectService) OAuthStart(
	ctx context.Context,
	userID string,
	r *http.Request,
	provider model.SocialProvider,
) (*model.ChannelOAuthStartResult, error) {
	if provider == model.SocialProviderMAX {
		return nil, fmt.Errorf("MAX использует подключение по токену бота")
	}
	cfg, err := s.socialSettings.EnsureReady(ctx, provider)
	if err != nil {
		return nil, err
	}
	ws, err := s.requireAdmin(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	state, err := randomToken(32)
	if err != nil {
		return nil, err
	}
	session, err := s.oauthSessions.Create(ctx, repository.ChannelOAuthSessionCreateParams{
		UserID:      userID,
		WorkspaceID: ws.ID,
		Provider:    provider,
		StateToken:  state,
		ExpiresAt:   time.Now().Add(channelOAuthSessionTTL),
	})
	if err != nil {
		return nil, err
	}
	_ = session

	redirectURI := s.cfg.ChannelOAuthRedirectURI(string(provider))
	var authURL string
	switch provider {
	case model.SocialProviderVK:
		client := &oauthclient.VKCommunityClient{
			AppID: cfg.OAuthClientID, AppSecret: cfg.OAuthClientSecret, RedirectURI: redirectURI,
		}
		authURL = client.AuthorizeURL(state)
	case model.SocialProviderOK:
		client := &oauthclient.OKClient{
			AppID: cfg.OAuthClientID, AppSecret: cfg.OAuthClientSecret, RedirectURI: redirectURI,
		}
		authURL = client.AuthorizeURL(state)
	case model.SocialProviderRutube:
		client := &oauthclient.RutubeClient{
			ClientID: cfg.OAuthClientID, ClientSecret: cfg.OAuthClientSecret, RedirectURI: redirectURI,
		}
		authURL = client.AuthorizeURL(state)
	case model.SocialProviderDzen:
		client := &oauthclient.DzenClient{
			ClientID: cfg.OAuthClientID, ClientSecret: cfg.OAuthClientSecret, RedirectURI: redirectURI,
		}
		authURL = client.AuthorizeURL(state)
	default:
		return nil, fmt.Errorf("неподдерживаемый провайдер")
	}

	return &model.ChannelOAuthStartResult{RedirectURL: authURL, StateToken: state}, nil
}

func (s *ChannelConnectService) OAuthCallback(
	ctx context.Context,
	provider model.SocialProvider,
	state, code, oauthError string,
) (*model.ChannelOAuthCompleteResult, error) {
	if oauthError != "" {
		return nil, fmt.Errorf("oauth: %s", oauthError)
	}
	state = strings.TrimSpace(state)
	code = strings.TrimSpace(code)
	if state == "" || code == "" {
		return nil, ErrChannelOAuthStateInvalid
	}

	session, err := s.oauthSessions.GetByState(ctx, state)
	if err != nil {
		return nil, ErrChannelOAuthStateInvalid
	}
	if session.Provider != provider {
		return nil, ErrChannelOAuthStateInvalid
	}
	if time.Now().After(session.ExpiresAt) {
		return nil, ErrChannelOAuthSessionExpired
	}

	cfg, err := s.socialSettings.GetEffective(ctx, provider)
	if err != nil {
		return nil, err
	}
	redirectURI := s.cfg.ChannelOAuthRedirectURI(string(provider))

	var accessToken, refreshToken string
	var expiresAt *time.Time

	switch provider {
	case model.SocialProviderVK:
		client := &oauthclient.VKCommunityClient{
			AppID: cfg.OAuthClientID, AppSecret: cfg.OAuthClientSecret, RedirectURI: redirectURI,
		}
		token, err := client.ExchangeCode(ctx, code)
		if err != nil {
			return nil, err
		}
		accessToken = token.AccessToken
		if token.ExpiresIn > 0 {
			t := time.Now().Add(time.Duration(token.ExpiresIn) * time.Second)
			expiresAt = &t
		}
	case model.SocialProviderOK:
		client := &oauthclient.OKClient{
			AppID: cfg.OAuthClientID, AppSecret: cfg.OAuthClientSecret, RedirectURI: redirectURI,
		}
		token, err := client.ExchangeCode(ctx, code)
		if err != nil {
			return nil, err
		}
		accessToken = token.AccessToken
		refreshToken = token.RefreshToken
	case model.SocialProviderRutube:
		client := &oauthclient.RutubeClient{
			ClientID: cfg.OAuthClientID, ClientSecret: cfg.OAuthClientSecret, RedirectURI: redirectURI,
		}
		token, err := client.ExchangeCode(ctx, code)
		if err != nil {
			return nil, err
		}
		accessToken = token.AccessToken
		refreshToken = token.RefreshToken
	case model.SocialProviderDzen:
		client := &oauthclient.DzenClient{
			ClientID: cfg.OAuthClientID, ClientSecret: cfg.OAuthClientSecret, RedirectURI: redirectURI,
		}
		token, err := client.ExchangeCode(ctx, code)
		if err != nil {
			return nil, err
		}
		accessToken = token.AccessToken
		refreshToken = token.RefreshToken
	default:
		return nil, fmt.Errorf("неподдерживаемый провайдер")
	}

	if s.cipher == nil {
		return nil, ErrCryptoUnavailable
	}
	encAccess, err := s.cipher.Encrypt(accessToken)
	if err != nil {
		return nil, err
	}
	encRefresh := ""
	if refreshToken != "" {
		encRefresh, err = s.cipher.Encrypt(refreshToken)
		if err != nil {
			return nil, err
		}
	}
	if err := s.oauthSessions.UpdateTokens(ctx, session.ID, encAccess, encRefresh, expiresAt, session.Metadata); err != nil {
		return nil, err
	}

	return &model.ChannelOAuthCompleteResult{
		SessionID: session.ID,
		Provider:  string(provider),
		Status:    "authorized",
	}, nil
}

func (s *ChannelConnectService) OAuthDiscover(
	ctx context.Context,
	userID, sessionID string,
) (*model.ChannelDiscoverResult, error) {
	session, err := s.oauthSessions.GetByID(ctx, sessionID, userID)
	if err != nil {
		return nil, err
	}
	if time.Now().After(session.ExpiresAt) {
		return nil, ErrChannelOAuthSessionExpired
	}
	if session.AccessTokenEncrypted == "" {
		return nil, fmt.Errorf("сессия OAuth не авторизована")
	}
	if s.cipher == nil {
		return nil, ErrCryptoUnavailable
	}
	accessToken, err := s.cipher.Decrypt(session.AccessTokenEncrypted)
	if err != nil {
		return nil, err
	}

	targets, hint, err := s.discoverTargets(ctx, session.Provider, accessToken)
	if err != nil {
		return nil, err
	}
	return &model.ChannelDiscoverResult{
		Provider: session.Provider,
		Targets:  targets,
		Hint:     hint,
	}, nil
}

func (s *ChannelConnectService) OAuthConnect(
	ctx context.Context,
	userID string,
	r *http.Request,
	req model.ChannelConnectRequest,
) (*model.ChannelConnectResult, error) {
	if req.SessionID == "" {
		return nil, fmt.Errorf("session_id обязателен")
	}
	if len(req.Targets) == 0 {
		return nil, fmt.Errorf("выберите хотя бы один канал")
	}

	session, err := s.oauthSessions.GetByID(ctx, req.SessionID, userID)
	if err != nil {
		return nil, err
	}
	if time.Now().After(session.ExpiresAt) {
		return nil, ErrChannelOAuthSessionExpired
	}
	if session.AccessTokenEncrypted == "" {
		return nil, fmt.Errorf("сессия OAuth не авторизована")
	}
	if _, err := s.requireAdmin(ctx, userID, r); err != nil {
		return nil, err
	}
	if s.cipher == nil {
		return nil, ErrCryptoUnavailable
	}

	ws, err := s.requireAdmin(ctx, userID, r)
	if err != nil {
		return nil, err
	}

	provider := model.ChannelProvider(session.Provider)
	currentCount, err := s.channels.CountByWorkspace(ctx, ws.ID)
	if err != nil {
		return nil, err
	}

	result := &model.ChannelConnectResult{
		Connected: []model.ChannelListItem{},
		Skipped:   []string{},
	}

	for _, input := range req.Targets {
		externalID := strings.TrimSpace(input.ExternalID)
		if externalID == "" {
			continue
		}
		exists, err := s.channels.ExistsByChat(ctx, ws.ID, string(provider), externalID)
		if err != nil {
			return nil, err
		}
		if exists {
			result.Skipped = append(result.Skipped, externalID)
			continue
		}
		if err := s.quota.CheckChannelQuota(ctx, ws.ID, currentCount+len(result.Connected)); err != nil {
			return nil, err
		}

		name := strings.TrimSpace(input.Name)
		if name == "" {
			name = externalID
		}

		created, err := s.channels.Create(ctx, repository.ChannelCreateParams{
			WorkspaceID:       ws.ID,
			Provider:          provider,
			Name:              name,
			ChatID:            externalID,
			ChatType:          string(session.Provider),
			BotTokenEncrypted: session.AccessTokenEncrypted,
			Status:            model.ChannelStatusActive,
		})
		if err != nil {
			return nil, err
		}
		result.Connected = append(result.Connected, model.ChannelListItem{
			Channel:     *created,
			BotTokenSet: true,
		})
	}

	if len(result.Connected) == 0 && len(result.Skipped) > 0 {
		return result, ErrChannelAlreadyConnected
	}
	if len(result.Connected) == 0 {
		return nil, fmt.Errorf("не удалось подключить каналы")
	}

	_ = s.oauthSessions.Delete(ctx, session.ID)
	return result, nil
}

func maxDiscoverBotInfo(bot *oauthclient.MAXBotInfo) *model.MAXDiscoverBot {
	if bot == nil {
		return nil
	}
	username := strings.TrimPrefix(strings.TrimSpace(bot.Username), "@")
	name := strings.TrimSpace(bot.Name)
	profileURL := ""
	searchQuery := ""
	if username != "" {
		profileURL = "https://max.ru/" + username
		searchQuery = "@" + username
	}
	return &model.MAXDiscoverBot{
		Username:    username,
		Name:        name,
		UserID:      bot.UserID,
		ProfileURL:  profileURL,
		SearchQuery: searchQuery,
	}
}

func maxBotAddHint(bot *model.MAXDiscoverBot) string {
	if bot == nil || bot.SearchQuery == "" {
		return "Токен принят. Добавьте бота в канал MAX и укажите ссылку на канал."
	}
	return fmt.Sprintf(
		"Ищите бота в MAX по нику %s (не по названию «%s» и не по user_id %d). "+
			"Канал → Участники → Добавить → введите %s → затем Администраторы → добавьте бота с правом «Публикация».",
		bot.SearchQuery,
		fallbackString(bot.Name, bot.Username),
		bot.UserID,
		bot.SearchQuery,
	)
}

func (s *ChannelConnectService) DiscoverMAX(
	ctx context.Context,
	userID string,
	r *http.Request,
	req model.MAXDiscoverRequest,
) (*model.ChannelDiscoverResult, error) {
	if _, err := s.socialSettings.EnsureReady(ctx, model.SocialProviderMAX); err != nil {
		return nil, err
	}
	if _, err := s.requireEditor(ctx, userID, r); err != nil {
		return nil, err
	}
	botToken := strings.TrimSpace(req.BotToken)
	if botToken == "" {
		return nil, ErrInvalidBotToken
	}
	bot, err := s.maxClient.GetMe(ctx, botToken)
	if err != nil {
		return nil, fmt.Errorf("%w: %s", ErrInvalidBotToken, err.Error())
	}
	botInfo := maxDiscoverBotInfo(bot)

	targets := []model.DiscoveredChannelTarget{}
	rawChat := strings.TrimSpace(req.ChatID)
	if rawChat != "" {
		chat, resolveErr := s.maxClient.ResolveChat(ctx, botToken, rawChat)
		if resolveErr != nil {
			return nil, fmt.Errorf("не удалось найти канал: %w", resolveErr)
		}
		canPost := true
		if err := s.maxClient.VerifyChannelPostAccess(ctx, botToken, chat.ChatID); err != nil {
			canPost = false
		}
		title := strings.TrimSpace(chat.Title)
		if title == "" {
			title = rawChat
		}
		targets = append(targets, model.DiscoveredChannelTarget{
			ExternalID: strconv.FormatInt(chat.ChatID, 10),
			Title:      title,
			Type:       chat.Type,
			CanPost:    canPost,
		})
		hint := fmt.Sprintf(
			"Канал «%s» найден (chat_id: %d). Бот @%s готов к подключению.",
			title, chat.ChatID, bot.Username,
		)
		if !canPost {
			hint = fmt.Sprintf(
				"Канал найден (chat_id: %d), но у бота @%s нет права публиковать посты. Добавьте бота администратором канала с правом «Публикация».",
				chat.ChatID, bot.Username,
			)
		}
		return &model.ChannelDiscoverResult{
			Provider: model.SocialProviderMAX,
			Targets:  targets,
			Hint:     hint,
			Bot:      botInfo,
		}, nil
	}

	return &model.ChannelDiscoverResult{
		Provider: model.SocialProviderMAX,
		Targets:  targets,
		Hint:     maxBotAddHint(botInfo),
		Bot:      botInfo,
	}, nil
}

func (s *ChannelConnectService) ConnectMAX(
	ctx context.Context,
	userID string,
	r *http.Request,
	req model.MAXConnectRequest,
) (*model.ChannelConnectResult, error) {
	if _, err := s.socialSettings.EnsureReady(ctx, model.SocialProviderMAX); err != nil {
		return nil, err
	}
	ws, err := s.requireAdmin(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	botToken := strings.TrimSpace(req.BotToken)
	if botToken == "" {
		return nil, ErrInvalidBotToken
	}
	if len(req.Channels) == 0 {
		return nil, fmt.Errorf("выберите хотя бы один канал")
	}
	if s.cipher == nil {
		return nil, ErrCryptoUnavailable
	}

	bot, err := s.maxClient.GetMe(ctx, botToken)
	if err != nil {
		return nil, fmt.Errorf("%w: %s", ErrInvalidBotToken, err.Error())
	}
	encrypted, err := s.cipher.Encrypt(botToken)
	if err != nil {
		return nil, err
	}

	currentCount, err := s.channels.CountByWorkspace(ctx, ws.ID)
	if err != nil {
		return nil, err
	}

	result := &model.ChannelConnectResult{
		Connected: []model.ChannelListItem{},
		Skipped:   []string{},
	}

	for _, input := range req.Channels {
		rawChat := strings.TrimSpace(input.ExternalID)
		if rawChat == "" {
			continue
		}
		chat, err := s.maxClient.ResolveChat(ctx, botToken, rawChat)
		if err != nil {
			return nil, err
		}
		if err := s.maxClient.VerifyChannelPostAccess(ctx, botToken, chat.ChatID); err != nil {
			return nil, err
		}
		chatID := strconv.FormatInt(chat.ChatID, 10)
		exists, err := s.channels.ExistsByChat(ctx, ws.ID, string(model.ChannelProviderMAX), chatID)
		if err != nil {
			return nil, err
		}
		if exists {
			result.Skipped = append(result.Skipped, chatID)
			continue
		}
		if err := s.quota.CheckChannelQuota(ctx, ws.ID, currentCount+len(result.Connected)); err != nil {
			return nil, err
		}
		name := strings.TrimSpace(input.Name)
		if name == "" {
			name = strings.TrimSpace(chat.Title)
		}
		if name == "" {
			name = chatID
		}
		created, err := s.channels.Create(ctx, repository.ChannelCreateParams{
			WorkspaceID:       ws.ID,
			Provider:          model.ChannelProviderMAX,
			Name:              name,
			ChatID:            chatID,
			ChatType:          chat.Type,
			BotUsername:       bot.Username,
			BotTokenEncrypted: encrypted,
			Status:            model.ChannelStatusActive,
		})
		if err != nil {
			return nil, err
		}
		result.Connected = append(result.Connected, model.ChannelListItem{
			Channel:      *created,
			BotTokenSet:  true,
			BotTokenHint: maskSecret(botToken),
		})
	}

	if len(result.Connected) == 0 && len(result.Skipped) > 0 {
		return result, ErrChannelAlreadyConnected
	}
	if len(result.Connected) == 0 {
		return nil, fmt.Errorf("не удалось подключить каналы")
	}
	return result, nil
}

func (s *ChannelConnectService) discoverTargets(
	ctx context.Context,
	provider model.SocialProvider,
	accessToken string,
) ([]model.DiscoveredChannelTarget, string, error) {
	cfg, err := s.socialSettings.GetEffective(ctx, provider)
	if err != nil {
		return nil, "", err
	}
	redirectURI := s.cfg.ChannelOAuthRedirectURI(string(provider))

	switch provider {
	case model.SocialProviderVK:
		client := &oauthclient.VKCommunityClient{
			AppID: cfg.OAuthClientID, AppSecret: cfg.OAuthClientSecret, RedirectURI: redirectURI,
		}
		groups, err := client.ListAdminGroups(ctx, accessToken)
		if err != nil {
			return nil, "", err
		}
		targets := make([]model.DiscoveredChannelTarget, 0, len(groups))
		for _, g := range groups {
			targets = append(targets, model.DiscoveredChannelTarget{
				ExternalID: oauthclient.VKGroupExternalID(g.ID),
				Title:      g.Name,
				Type:       g.Type,
				CanPost:    true,
				AvatarURL:  g.Photo50,
			})
		}
		hint := ""
		if len(targets) == 0 {
			hint = "Не найдено сообществ, где вы администратор. Проверьте права в VK."
		}
		return targets, hint, nil

	case model.SocialProviderOK:
		client := &oauthclient.OKClient{
			AppID: cfg.OAuthClientID, AppSecret: cfg.OAuthClientSecret, RedirectURI: redirectURI,
		}
		groups, err := client.ListManagedGroups(ctx, accessToken)
		if err != nil {
			return nil, "", err
		}
		targets := make([]model.DiscoveredChannelTarget, 0, len(groups))
		for _, g := range groups {
			targets = append(targets, model.DiscoveredChannelTarget{
				ExternalID: oauthclient.OKGroupExternalID(g.GroupID),
				Title:      g.GroupName,
				Type:       "group",
				CanPost:    true,
				AvatarURL:  g.PhotoURL,
			})
		}
		return targets, "", nil

	case model.SocialProviderRutube:
		client := &oauthclient.RutubeClient{
			ClientID: cfg.OAuthClientID, ClientSecret: cfg.OAuthClientSecret, RedirectURI: redirectURI,
		}
		channels, err := client.ListChannels(ctx, accessToken)
		if err != nil {
			return nil, "", err
		}
		targets := make([]model.DiscoveredChannelTarget, 0, len(channels))
		for _, ch := range channels {
			targets = append(targets, model.DiscoveredChannelTarget{
				ExternalID: oauthclient.RutubeChannelExternalID(ch.ID),
				Title:      ch.Name,
				Type:       "channel",
				CanPost:    true,
				AvatarURL:  ch.Icon,
			})
		}
		return targets, "", nil

	case model.SocialProviderDzen:
		client := &oauthclient.DzenClient{
			ClientID: cfg.OAuthClientID, ClientSecret: cfg.OAuthClientSecret, RedirectURI: redirectURI,
		}
		channels, err := client.ListChannels(ctx, accessToken)
		if err != nil {
			return nil, "", err
		}
		targets := make([]model.DiscoveredChannelTarget, 0, len(channels))
		for _, ch := range channels {
			targets = append(targets, model.DiscoveredChannelTarget{
				ExternalID: ch.ID,
				Title:      ch.Title,
				Type:       "channel",
				CanPost:    true,
			})
		}
		return targets, "", nil

	default:
		return nil, "", fmt.Errorf("неподдерживаемый провайдер")
	}
}

func (s *ChannelConnectService) requireEditor(ctx context.Context, userID string, r *http.Request) (*model.Workspace, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleEditor); err != nil {
		return nil, err
	}
	return ws, nil
}

func (s *ChannelConnectService) requireAdmin(ctx context.Context, userID string, r *http.Request) (*model.Workspace, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleAdmin); err != nil {
		return nil, err
	}
	return ws, nil
}

func randomToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
