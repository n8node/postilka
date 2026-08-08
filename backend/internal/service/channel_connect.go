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
	youtubeAPI     *YouTubeAPIClient
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
	youtubeAPI *YouTubeAPIClient,
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
		youtubeAPI:     youtubeAPI,
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
	req model.ChannelOAuthStartRequest,
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

	sessionMeta := map[string]any{}
	oauthAppMode := model.VKOAuthModeOwn
	if provider == model.SocialProviderVK {
		oauthAppMode = normalizeVKOAuthMode(req.OAuthAppMode)
		sessionMeta["oauth_app_mode"] = string(oauthAppMode)
	}
	appID, appSecret, err := s.resolveOAuthAppCredentials(provider, cfg, req, oauthAppMode)
	if err != nil {
		return nil, err
	}
	if provider == model.SocialProviderVK && oauthAppMode == model.VKOAuthModeOwn {
		if s.cipher == nil {
			return nil, ErrCryptoUnavailable
		}
		encSecret, err := s.cipher.Encrypt(appSecret)
		if err != nil {
			return nil, err
		}
		sessionMeta["oauth_app_id"] = appID
		sessionMeta["oauth_app_secret_encrypted"] = encSecret
	}
	if provider == model.SocialProviderYouTube {
		if s.cipher == nil {
			return nil, ErrCryptoUnavailable
		}
		encSecret, err := s.cipher.Encrypt(appSecret)
		if err != nil {
			return nil, err
		}
		sessionMeta["oauth_app_id"] = appID
		sessionMeta["oauth_app_secret_encrypted"] = encSecret
	}

	session, err := s.oauthSessions.Create(ctx, repository.ChannelOAuthSessionCreateParams{
		UserID:      userID,
		WorkspaceID: ws.ID,
		Provider:    provider,
		StateToken:  state,
		Metadata:    sessionMeta,
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
			AppID: appID, AppSecret: appSecret, RedirectURI: redirectURI,
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
	case model.SocialProviderYouTube:
		client := buildYouTubeOAuthClient(s.youtubeAPI, appID, appSecret, redirectURI)
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
		appID, appSecret, err := s.oauthAppCredentialsFromSession(session, cfg)
		if err != nil {
			return nil, err
		}
		client := &oauthclient.VKCommunityClient{
			AppID: appID, AppSecret: appSecret, RedirectURI: redirectURI,
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
		if token.ExpiresIn > 0 {
			t := time.Now().Add(time.Duration(token.ExpiresIn) * time.Second)
			expiresAt = &t
		}
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
		if token.ExpiresIn > 0 {
			t := time.Now().Add(time.Duration(token.ExpiresIn) * time.Second)
			expiresAt = &t
		}
	case model.SocialProviderYouTube:
		appID, appSecret, err := s.oauthAppCredentialsFromSession(session, cfg)
		if err != nil {
			return nil, err
		}
		client := buildYouTubeOAuthClient(s.youtubeAPI, appID, appSecret, redirectURI)
		token, err := client.ExchangeCode(ctx, code)
		if err != nil {
			return nil, err
		}
		accessToken = token.AccessToken
		refreshToken = token.RefreshToken
		if token.ExpiresIn > 0 {
			t := time.Now().Add(time.Duration(token.ExpiresIn) * time.Second)
			expiresAt = &t
		}
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

	targets, hint, err := s.discoverTargets(ctx, session.Provider, accessToken, session)
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

	accessToken, err := s.cipher.Decrypt(session.AccessTokenEncrypted)
	if err != nil {
		return nil, err
	}
	discoveredTargets, _, err := s.discoverTargets(ctx, session.Provider, accessToken, session)
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

		name := strings.TrimSpace(input.Name)
		if name == "" {
			name = externalID
		}
		meta := mergeChannelAvatar(model.ChannelMetadata{
			ProviderTitle: name,
		}, lookupOAuthAvatarFromTargets(discoveredTargets, externalID))
		if publicURL := lookupOAuthPublicURLFromTargets(discoveredTargets, externalID); publicURL != "" {
			meta.PublicURL = publicURL
		}
		if session.Provider == model.SocialProviderYouTube {
			meta = applyYouTubeOAuthReconnectMetadata(meta)
		}
		metaRefreshed := oauthConnectMetadataRefreshed(meta)
		vkOAuthMode := sessionOAuthAppMode(session)
		oauthTokens := s.oauthCredentialsFromSession(session)
		youtubeClientID, youtubeClientSecretEnc := "", ""
		if session.Provider == model.SocialProviderYouTube {
			youtubeClientID, _ = session.Metadata["oauth_app_id"].(string)
			youtubeClientSecretEnc, _ = session.Metadata["oauth_app_secret_encrypted"].(string)
		}

		existing, err := s.channels.GetByChat(ctx, ws.ID, string(provider), externalID)
		if err != nil && !errors.Is(err, repository.ErrNotFound) {
			return nil, err
		}
		if existing != nil {
			if existing.Provider != provider {
				existing = nil
			}
		}
		if existing != nil {
			var updated *model.Channel
			if provider == model.ChannelProviderVK {
				updated, err = s.channels.UpdateVKConnection(ctx, repository.ChannelVKReconnectParams{
					WorkspaceID:         ws.ID,
					ChannelID:           existing.ID,
					Name:                name,
					ChatType:            existing.ChatType,
					BotTokenEncrypted:   session.AccessTokenEncrypted,
					VKOAuthMode:         vkOAuthMode,
					Status:              model.ChannelStatusActive,
					Metadata:            meta,
					MetadataRefreshedAt: metaRefreshed,
				})
			} else {
				updated, err = s.channels.SaveChannel(ctx, repository.ChannelSaveParams{
					WorkspaceID:           ws.ID,
					ChannelID:             existing.ID,
					Provider:              provider,
					Name:                  name,
					ChatType:              existing.ChatType,
					BotUsername:           existing.BotUsername,
					BotTokenEncrypted:     oauthTokens.AccessTokenEncrypted,
					RefreshTokenEncrypted: oauthTokens.RefreshTokenEncrypted,
					TokenExpiresAt:        oauthTokens.TokenExpiresAt,
					MaxPostMode:           existing.MaxPostMode,
					VKOAuthMode:           existing.VKOAuthMode,
					OAuthClientID:         youtubeClientID,
					OAuthClientSecretEncrypted: youtubeClientSecretEnc,
					Status:                model.ChannelStatusActive,
					Metadata:              meta,
					MetadataRefreshedAt:   metaRefreshed,
				})
			}
			if err != nil {
				return nil, err
			}
			result.Connected = append(result.Connected, buildChannelListItem(*updated, oauthTokens.AccessTokenEncrypted, s.cipher))
			continue
		}

		if err := s.quota.CheckChannelQuota(ctx, ws.ID, currentCount+len(result.Connected)); err != nil {
			return nil, err
		}

		chatType := oauthChannelChatType(session.Provider, externalID, discoveredTargets)
		createParams := repository.ChannelCreateParams{
			WorkspaceID:           ws.ID,
			Provider:              provider,
			Name:                  name,
			ChatID:                externalID,
			ChatType:              chatType,
			BotTokenEncrypted:     oauthTokens.AccessTokenEncrypted,
			RefreshTokenEncrypted: oauthTokens.RefreshTokenEncrypted,
			TokenExpiresAt:        oauthTokens.TokenExpiresAt,
			Status:                model.ChannelStatusActive,
			Metadata:              meta,
			MetadataRefreshedAt:   metaRefreshed,
		}
		if provider == model.ChannelProviderVK {
			createParams.VKOAuthMode = vkOAuthMode
		}
		if provider == model.ChannelProviderYouTube {
			createParams.OAuthClientID = youtubeClientID
			createParams.OAuthClientSecretEncrypted = youtubeClientSecretEnc
		}
		created, err := s.channels.Create(ctx, createParams)
		if err != nil {
			return nil, err
		}
		result.Connected = append(result.Connected, buildChannelListItem(*created, oauthTokens.AccessTokenEncrypted, s.cipher))
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

func (s *ChannelConnectService) resolveMAXConnectBot(
	ctx context.Context,
	reqToken string,
	postModeRaw string,
) (botToken string, bot *oauthclient.MAXBotInfo, botInfo *model.MAXDiscoverBot, postMode model.MAXPostMode, err error) {
	postMode = normalizeMAXPostMode(postModeRaw)
	if postMode == model.MAXPostModePlatform {
		var platformBot *model.MAXDiscoverBot
		botToken, platformBot, err = s.socialSettings.ResolveMAXPlatformBotToken(ctx, s.cipher)
		if err != nil {
			return "", nil, nil, postMode, err
		}
		bot, err = s.maxClient.GetMe(ctx, botToken)
		if err != nil {
			return "", nil, nil, postMode, fmt.Errorf("%w: %s", ErrInvalidBotToken, err.Error())
		}
		botInfo = maxDiscoverBotInfo(bot)
		if platformBot != nil && platformBot.SearchQuery != "" {
			botInfo = platformBot
		}
		return botToken, bot, botInfo, postMode, nil
	}

	botToken = strings.TrimSpace(reqToken)
	if botToken == "" {
		return "", nil, nil, postMode, ErrInvalidBotToken
	}
	bot, err = s.maxClient.GetMe(ctx, botToken)
	if err != nil {
		return "", nil, nil, postMode, fmt.Errorf("%w: %s", ErrInvalidBotToken, err.Error())
	}
	return botToken, bot, maxDiscoverBotInfo(bot), postMode, nil
}

func maxConnectMetadata(chat *oauthclient.MAXChat) model.ChannelMetadata {
	meta := model.ChannelMetadata{
		ProviderTitle: strings.TrimSpace(chat.Title),
	}
	link := oauthclient.NormalizeMAXChatLink(chat.Link)
	if link != "" {
		meta.PublicURL = "https://max.ru/" + link
	}
	return mergeChannelAvatar(meta, oauthclient.MAXChatAvatarURL(chat))
}

func (s *ChannelConnectService) maxTargetsFromChats(
	ctx context.Context,
	botToken string,
	chats []oauthclient.MAXChat,
) []model.DiscoveredChannelTarget {
	targets := make([]model.DiscoveredChannelTarget, 0, len(chats))
	for _, chat := range chats {
		canPost := true
		if err := s.maxClient.VerifyChannelPostAccess(ctx, botToken, chat.ChatID); err != nil {
			canPost = false
		}
		title := strings.TrimSpace(chat.Title)
		if title == "" {
			title = oauthclient.NormalizeMAXChatLink(chat.Link)
		}
		if title == "" {
			title = strconv.FormatInt(chat.ChatID, 10)
		}
		targets = append(targets, model.DiscoveredChannelTarget{
			ExternalID: strconv.FormatInt(chat.ChatID, 10),
			Title:      title,
			Type:       chat.Type,
			CanPost:    canPost,
			AvatarURL:  oauthclient.MAXChatAvatarURL(&chat),
		})
	}
	return targets
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
	botToken, bot, botInfo, _, err := s.resolveMAXConnectBot(ctx, req.BotToken, req.PostMode)
	if err != nil {
		return nil, err
	}
	_ = bot

	targets := []model.DiscoveredChannelTarget{}
	rawChat := strings.TrimSpace(req.ChatID)
	if rawChat != "" {
		chat, resolveErr := s.maxClient.ResolveChat(ctx, botToken, rawChat)
		if resolveErr != nil {
			known, _ := s.maxClient.DiscoverMemberChats(ctx, botToken)
			if len(known) > 0 {
				return &model.ChannelDiscoverResult{
					Provider: model.SocialProviderMAX,
					Targets:  s.maxTargetsFromChats(ctx, botToken, known),
					Hint: "Ссылка max.ru не находится через API MAX. Выберите канал из списка или укажите chat_id.",
					Bot:      botInfo,
				}, nil
			}
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

	memberChats, _ := s.maxClient.DiscoverMemberChats(ctx, botToken)
	if len(memberChats) > 0 {
		targets = s.maxTargetsFromChats(ctx, botToken, memberChats)
	}

	return &model.ChannelDiscoverResult{
		Provider: model.SocialProviderMAX,
		Targets:  targets,
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
	botToken, bot, _, postMode, err := s.resolveMAXConnectBot(ctx, req.BotToken, req.PostMode)
	if err != nil {
		return nil, err
	}
	if len(req.Channels) == 0 {
		return nil, fmt.Errorf("выберите хотя бы один канал")
	}
	if s.cipher == nil {
		return nil, ErrCryptoUnavailable
	}

	var encrypted string
	if postMode == model.MAXPostModeOwn {
		encrypted, err = s.cipher.Encrypt(botToken)
		if err != nil {
			return nil, err
		}
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
		member, err := s.maxClient.GetBotMembership(ctx, botToken, chat.ChatID)
		if err != nil {
			return nil, err
		}
		now := time.Now()
		meta := maxChannelMetadata(chat, member)
		chatID := strconv.FormatInt(chat.ChatID, 10)
		name := strings.TrimSpace(input.Name)
		if name == "" {
			name = strings.TrimSpace(chat.Title)
		}
		if name == "" {
			name = chatID
		}

		existing, err := s.channels.GetByChat(ctx, ws.ID, string(model.ChannelProviderMAX), chatID)
		if err != nil && !errors.Is(err, repository.ErrNotFound) {
			return nil, err
		}
		if existing != nil && existing.Provider != model.ChannelProviderMAX {
			existing = nil
		}
		if existing != nil {
			updated, err := s.channels.UpdateMAXConnection(ctx, repository.ChannelMAXReconnectParams{
				WorkspaceID:         ws.ID,
				ChannelID:           existing.ID,
				Name:                name,
				ChatType:            chat.Type,
				BotUsername:         bot.Username,
				BotTokenEncrypted:   encrypted,
				MaxPostMode:         postMode,
				Status:              model.ChannelStatusActive,
				Metadata:            meta,
				MetadataRefreshedAt: &now,
			})
			if err != nil {
				return nil, err
			}
			item := model.ChannelListItem{Channel: *updated}
			if postMode == model.MAXPostModePlatform {
				item.BotTokenSet = true
				item.BotTokenHint = "Postilka"
			} else {
				item.BotTokenSet = true
				item.BotTokenHint = maskSecret(botToken)
			}
			result.Connected = append(result.Connected, item)
			continue
		}

		if err := s.quota.CheckChannelQuota(ctx, ws.ID, currentCount+len(result.Connected)); err != nil {
			return nil, err
		}
		created, err := s.channels.Create(ctx, repository.ChannelCreateParams{
			WorkspaceID:         ws.ID,
			Provider:            model.ChannelProviderMAX,
			Name:                name,
			ChatID:              chatID,
			ChatType:            chat.Type,
			BotUsername:         bot.Username,
			BotTokenEncrypted:   encrypted,
			MaxPostMode:         postMode,
			Status:              model.ChannelStatusActive,
			Metadata:            meta,
			MetadataRefreshedAt: &now,
		})
		if err != nil {
			return nil, err
		}
		item := model.ChannelListItem{Channel: *created}
		if postMode == model.MAXPostModePlatform {
			item.BotTokenSet = true
			item.BotTokenHint = "Postilka"
		} else {
			item.BotTokenSet = true
			item.BotTokenHint = maskSecret(botToken)
		}
		result.Connected = append(result.Connected, item)
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
	session *model.ChannelOAuthSession,
) ([]model.DiscoveredChannelTarget, string, error) {
	cfg, err := s.socialSettings.GetEffective(ctx, provider)
	if err != nil {
		return nil, "", err
	}
	redirectURI := s.cfg.ChannelOAuthRedirectURI(string(provider))
	_ = session

	switch provider {
	case model.SocialProviderVK:
		client := &oauthclient.VKCommunityClient{}
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
				PublicURL:  strings.TrimSpace(ch.URL),
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
				AvatarURL:  strings.TrimSpace(ch.IconURL),
				PublicURL:  strings.TrimSpace(ch.URL),
			})
		}
		return targets, "", nil

	case model.SocialProviderYouTube:
		appID, appSecret, err := s.oauthAppCredentialsFromSession(session, cfg)
		if err != nil {
			return nil, "", err
		}
		client := buildYouTubeOAuthClient(s.youtubeAPI, appID, appSecret, redirectURI)
		channels, err := client.ListMyChannels(ctx, accessToken)
		if err != nil {
			return nil, "", err
		}
		targets := make([]model.DiscoveredChannelTarget, 0, len(channels))
		for _, ch := range channels {
			targets = append(targets, model.DiscoveredChannelTarget{
				ExternalID: oauthclient.YouTubeChannelExternalID(ch.ID),
				Title:      ch.Title,
				Type:       "channel",
				CanPost:    true,
				AvatarURL:  ch.ThumbnailURL,
				PublicURL:  oauthclient.YouTubeChannelPublicURL(ch),
			})
		}
		hint := ""
		if len(targets) == 0 {
			hint = "Не найдено YouTube-каналов на этом Google-аккаунте. Создайте канал в YouTube Studio и повторите."
		}
		return targets, hint, nil

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

func (s *ChannelConnectService) resolveOAuthAppCredentials(
	provider model.SocialProvider,
	cfg model.SocialProviderSettings,
	req model.ChannelOAuthStartRequest,
	vkMode model.VKOAuthMode,
) (appID, appSecret string, err error) {
	if provider == model.SocialProviderVK {
		if vkMode == model.VKOAuthModePlatform {
			if !cfg.PlatformOAuthEnabled {
				return "", "", fmt.Errorf("подключение через приложение Postilka отключено администратором")
			}
			appID = strings.TrimSpace(cfg.OAuthClientID)
			appSecret = strings.TrimSpace(cfg.OAuthClientSecret)
			if appID == "" || appSecret == "" {
				return "", "", ErrSocialProviderNotReady
			}
			return appID, appSecret, nil
		}
		appID = strings.TrimSpace(req.OAuthClientID)
		appSecret = strings.TrimSpace(req.OAuthClientSecret)
		if appID == "" || appSecret == "" {
			return "", "", fmt.Errorf("укажите ID приложения VK и защищённый ключ")
		}
		return appID, appSecret, nil
	}
	if provider == model.SocialProviderYouTube {
		appID = strings.TrimSpace(req.OAuthClientID)
		appSecret = strings.TrimSpace(req.OAuthClientSecret)
		if appID == "" || appSecret == "" {
			return "", "", fmt.Errorf("укажите OAuth Client ID и Client Secret Google")
		}
		return appID, appSecret, nil
	}
	appID = strings.TrimSpace(cfg.OAuthClientID)
	appSecret = strings.TrimSpace(cfg.OAuthClientSecret)
	if appID == "" {
		return "", "", ErrSocialProviderNotReady
	}
	return appID, appSecret, nil
}

func (s *ChannelConnectService) oauthAppCredentialsFromSession(
	session *model.ChannelOAuthSession,
	cfg model.SocialProviderSettings,
) (appID, appSecret string, err error) {
	if session.Provider == model.SocialProviderVK {
		mode := sessionOAuthAppMode(session)
		if mode == model.VKOAuthModePlatform {
			if !cfg.PlatformOAuthEnabled {
				return "", "", fmt.Errorf("подключение через приложение Postilka отключено — переподключите канал")
			}
			appID = strings.TrimSpace(cfg.OAuthClientID)
			appSecret = strings.TrimSpace(cfg.OAuthClientSecret)
			if appID == "" || appSecret == "" {
				return "", "", ErrSocialProviderNotReady
			}
			return appID, appSecret, nil
		}
		if s.cipher == nil {
			return "", "", ErrCryptoUnavailable
		}
		rawID, _ := session.Metadata["oauth_app_id"].(string)
		rawSecret, _ := session.Metadata["oauth_app_secret_encrypted"].(string)
		appID = strings.TrimSpace(rawID)
		if appID == "" || strings.TrimSpace(rawSecret) == "" {
			return "", "", fmt.Errorf("сессия OAuth не содержит ключи приложения VK — начните подключение заново")
		}
		appSecret, err = s.cipher.Decrypt(rawSecret)
		if err != nil {
			return "", "", err
		}
		return appID, appSecret, nil
	}
	if session.Provider == model.SocialProviderYouTube {
		return youtubeOAuthCredentialsFromSession(session.Metadata, s.cipher)
	}
	return strings.TrimSpace(cfg.OAuthClientID), strings.TrimSpace(cfg.OAuthClientSecret), nil
}

func normalizeVKOAuthMode(raw string) model.VKOAuthMode {
	switch strings.TrimSpace(strings.ToLower(raw)) {
	case string(model.VKOAuthModePlatform):
		return model.VKOAuthModePlatform
	default:
		return model.VKOAuthModeOwn
	}
}

func sessionOAuthAppMode(session *model.ChannelOAuthSession) model.VKOAuthMode {
	if session == nil || session.Provider != model.SocialProviderVK {
		return model.VKOAuthModeOwn
	}
	raw, _ := session.Metadata["oauth_app_mode"].(string)
	return normalizeVKOAuthMode(raw)
}

func oauthConnectMetadataRefreshed(meta model.ChannelMetadata) *time.Time {
	if strings.TrimSpace(meta.AvatarURL) == "" {
		return nil
	}
	now := time.Now()
	return &now
}
