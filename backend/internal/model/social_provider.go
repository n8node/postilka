package model

import (
	"strconv"
	"time"
)

type ProviderLogoKey string

const (
	ProviderLogoTelegram         ProviderLogoKey = "telegram"
	ProviderLogoTelegramBusiness ProviderLogoKey = "telegram_business"
	ProviderLogoVK               ProviderLogoKey = "vk"
	ProviderLogoMAX              ProviderLogoKey = "max"
	ProviderLogoRutube           ProviderLogoKey = "rutube"
	ProviderLogoDzen             ProviderLogoKey = "dzen"
	ProviderLogoYouTube          ProviderLogoKey = "youtube"
	ProviderLogoPhotochka        ProviderLogoKey = "photochka"
	ProviderLogoWordPress        ProviderLogoKey = "wordpress"
)

var AllProviderLogoKeys = []ProviderLogoKey{
	ProviderLogoTelegram,
	ProviderLogoTelegramBusiness,
	ProviderLogoVK,
	ProviderLogoMAX,
	ProviderLogoRutube,
	ProviderLogoDzen,
	ProviderLogoYouTube,
	ProviderLogoPhotochka,
	ProviderLogoWordPress,
}

func ParseProviderLogoKey(raw string) (ProviderLogoKey, bool) {
	key := ProviderLogoKey(raw)
	for _, item := range AllProviderLogoKeys {
		if item == key {
			return key, true
		}
	}
	return "", false
}

func ProviderLogoAPIPath(key ProviderLogoKey) string {
	return "/channels/provider-logos/" + string(key)
}

func ProviderLogoAPIPathVersioned(key ProviderLogoKey, updatedAt time.Time) string {
	path := ProviderLogoAPIPath(key)
	if updatedAt.IsZero() {
		return path
	}
	return path + "?v=" + strconv.FormatInt(updatedAt.UnixMilli(), 10)
}

type ProviderLogoRecord struct {
	Provider  ProviderLogoKey `json:"provider"`
	S3Key     string          `json:"-"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type ProviderLogoView struct {
	Provider  ProviderLogoKey `json:"provider"`
	LogoURL   string          `json:"logo_url"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type SocialProvider string

const (
	SocialProviderVK     SocialProvider = "vk"
	SocialProviderOK     SocialProvider = "ok"
	SocialProviderMAX    SocialProvider = "max"
	SocialProviderRutube SocialProvider = "rutube"
	SocialProviderDzen   SocialProvider = "dzen"
	SocialProviderYouTube SocialProvider = "youtube"
)

var AllSocialProviders = []SocialProvider{
	SocialProviderVK,
	SocialProviderMAX,
	SocialProviderRutube,
	SocialProviderDzen,
	SocialProviderYouTube,
}

func (p SocialProvider) Label() string {
	switch p {
	case SocialProviderVK:
		return "VK"
	case SocialProviderOK:
		return "OK"
	case SocialProviderMAX:
		return "MAX"
	case SocialProviderRutube:
		return "Rutube"
	case SocialProviderDzen:
		return "Дзен"
	case SocialProviderYouTube:
		return "YouTube"
	default:
		return string(p)
	}
}

func (p SocialProvider) ConnectFlow() string {
	switch p {
	case SocialProviderVK:
		return "user_oauth"
	case SocialProviderMAX:
		return "bot_token"
	case SocialProviderDzen:
		return "telegram_crosspost"
	case SocialProviderYouTube:
		return "user_oauth"
	default:
		return "oauth"
	}
}

func (p SocialProvider) UsesUserOAuthApp() bool {
	return p == SocialProviderVK || p == SocialProviderYouTube
}

type SocialProviderSettings struct {
	Enabled                 bool   `json:"enabled"`
	OAuthClientID           string `json:"oauth_client_id"`
	OAuthClientSecret       string `json:"oauth_client_secret"`
	PlatformBotEnabled      bool   `json:"platform_bot_enabled"`
	PlatformOAuthEnabled    bool   `json:"platform_oauth_enabled"`
	ConnectHelpText         string `json:"connect_help_text"`
	ConnectHelpURL          string `json:"connect_help_url"`
	DocsURL                 string `json:"docs_url"`
	SupportTelegramUsername string `json:"support_telegram_username"`
	SupportEmail            string `json:"support_email"`
	SupportHoursText        string `json:"support_hours_text"`
}

type SocialProviderSettingsRecord struct {
	Provider  SocialProvider         `json:"provider"`
	Config    SocialProviderSettings `json:"config"`
	UpdatedAt time.Time              `json:"updated_at"`
}

type SocialProviderAdminView struct {
	Provider  SocialProvider         `json:"provider"`
	Label     string                 `json:"label"`
	ConnectFlow string               `json:"connect_flow"`
	Settings  SocialProviderSettings `json:"settings"`
	UpdatedAt time.Time              `json:"updated_at"`
}

type SocialProviderAdminListView struct {
	Providers []SocialProviderAdminView `json:"providers"`
}

type SocialProviderPublicInfo struct {
	Provider                SocialProvider `json:"provider"`
	Label                   string         `json:"label"`
	Enabled                 bool           `json:"enabled"`
	ConnectFlow             string         `json:"connect_flow"`
	PlatformBotEnabled      bool           `json:"platform_bot_enabled,omitempty"`
	PlatformOAuthEnabled    bool           `json:"platform_oauth_enabled,omitempty"`
	PlatformBot             *MAXDiscoverBot `json:"platform_bot,omitempty"`
	ConnectHelpText         string         `json:"connect_help_text"`
	ConnectHelpURL          string         `json:"connect_help_url"`
	DocsURL                 string         `json:"docs_url"`
	SupportTelegramUsername string         `json:"support_telegram_username"`
	SupportTelegramURL      string         `json:"support_telegram_url"`
	SupportEmail            string         `json:"support_email"`
	SupportHoursText        string               `json:"support_hours_text"`
	PublishCapabilities     PublishCapabilities  `json:"publish_capabilities"`
	LogoURL                 string               `json:"logo_url,omitempty"`
}

type MAXPlatformBotAdminView struct {
	Enabled      bool            `json:"enabled"`
	BotTokenSet  bool            `json:"bot_token_set"`
	BotTokenHint string          `json:"bot_token_hint,omitempty"`
	Bot          *MAXDiscoverBot `json:"bot,omitempty"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

type MAXPlatformBotAdminUpdateRequest struct {
	Enabled  bool   `json:"enabled"`
	BotToken string `json:"bot_token,omitempty"`
}

func DefaultSocialProviderSettings(provider SocialProvider) SocialProviderSettings {
	def := SocialProviderSettings{
		DocsURL:                 "https://postilka.ru/docs",
		SupportTelegramUsername: "postilka_support",
		SupportEmail:            "support@postilka.ru",
		SupportHoursText:        "пн–вс 10:00–19:00 (МСК)",
	}
	switch provider {
	case SocialProviderVK:
		def.ConnectHelpURL = "https://postilka.ru/docs/vk"
		def.ConnectHelpText = "1. Выберите «Своё приложение» или «Приложение Postilka».\n2. Для своего приложения: создайте Standalone-приложение на vk.com/apps, укажите Redirect URI из Postilka, скопируйте ID и защищённый ключ.\n3. Войдите через VK и выберите сообщества, где вы администратор.\n4. Права приложения: wall, photos, video, groups, offline."
	case SocialProviderOK:
		def.ConnectHelpURL = "https://postilka.ru/docs/ok"
		def.ConnectHelpText = "1. Войдите через Одноклассники.\n2. Выберите группу, где вы администратор.\n3. Подтвердите подключение."
	case SocialProviderMAX:
		def.ConnectHelpURL = "https://postilka.ru/docs/max"
		def.ConnectHelpText = "1. Создайте бота через @MasterBot или business.max.ru и скопируйте токен.\n2. В Postilka нажмите «Проверить бота» — появится @username для поиска.\n3. В MAX: канал → Участники → Добавить → ищите бота по @username (не по названию и не по ID).\n4. Канал → Администраторы → добавьте бота с правом «Публикация».\n5. Вернитесь в Postilka, укажите ссылку на канал и подключите."
	case SocialProviderRutube:
		def.ConnectHelpURL = "https://postilka.ru/docs/rutube"
		def.ConnectHelpText = "1. Войдите через Rutube под аккаунтом владельца канала.\n2. Выберите канал, в который будете публиковать.\n3. Подтвердите права приложения Postilka.\n4. После подключения доступны: посты в ленту канала, загрузка видео и клипов по ссылке, обложка и отложенная публикация."
	case SocialProviderDzen:
		def.ConnectHelpURL = "https://dzen.ru/help/ru/channel/cross-platform.html"
		def.ConnectHelpText = "1. Подключите публичный Telegram-канал в Postilka.\n2. В Студии Дзена: Настройки → Кросспостинг → Telegram → получите код доступа.\n3. В Telegram откройте @zen_sync_bot, отправьте код и ссылку на канал.\n4. Добавьте @zen_sync_bot администратором Telegram-канала.\n5. Планируйте посты в Postilka — они попадут в Telegram, бот перенесёт их в Дзен."
	case SocialProviderYouTube:
		def.ConnectHelpURL = "https://postilka.ru/docs/youtube"
		def.ConnectHelpText = "1. В Google Cloud Console создайте OAuth Client (Web) и включите YouTube Data API v3.\n\n2. Redirect URI: https://postilka.ru/app/api/v1/channels/oauth/youtube/callback\n\n3. В Postilka укажите Client ID и Client Secret своего проекта Google.\n\n4. Войдите через Google под аккаунтом владельца YouTube-канала и выберите канал.\n\n5. Квоты YouTube API расходуются с вашего Google Cloud проекта; запросы к API идут через прокси Postilka."
	}
	return def
}

type ChannelOAuthSession struct {
	ID                    string         `json:"id"`
	UserID                string         `json:"user_id"`
	WorkspaceID           string         `json:"workspace_id"`
	Provider              SocialProvider `json:"provider"`
	StateToken            string         `json:"state_token"`
	AccessTokenEncrypted  string         `json:"-"`
	RefreshTokenEncrypted string         `json:"-"`
	TokenExpiresAt        *time.Time     `json:"token_expires_at,omitempty"`
	Metadata              map[string]any `json:"metadata,omitempty"`
	ExpiresAt             time.Time      `json:"expires_at"`
	CreatedAt             time.Time      `json:"created_at"`
}

type DiscoveredChannelTarget struct {
	ExternalID string `json:"external_id"`
	Title      string `json:"title"`
	Type       string `json:"type"`
	CanPost    bool   `json:"can_post"`
	AvatarURL  string `json:"avatar_url,omitempty"`
	PublicURL  string `json:"public_url,omitempty"`
}

type ChannelDiscoverResult struct {
	Provider SocialProvider            `json:"provider"`
	Targets  []DiscoveredChannelTarget `json:"targets"`
	Hint     string                    `json:"hint,omitempty"`
	Bot      *MAXDiscoverBot           `json:"bot,omitempty"`
}

type MAXDiscoverBot struct {
	Username   string `json:"username"`
	Name       string `json:"name"`
	UserID     int64  `json:"user_id"`
	ProfileURL string `json:"profile_url"`
	SearchQuery string `json:"search_query"`
}

type ChannelConnectTargetInput struct {
	ExternalID string `json:"external_id"`
	Name       string `json:"name,omitempty"`
}

type ChannelConnectRequest struct {
	SessionID string                      `json:"session_id,omitempty"`
	Targets   []ChannelConnectTargetInput `json:"targets"`
}

type ChannelConnectResult struct {
	Connected []ChannelListItem `json:"connected"`
	Skipped   []string          `json:"skipped,omitempty"`
}

type MAXDiscoverRequest struct {
	BotToken string `json:"bot_token"`
	ChatID   string `json:"chat_id,omitempty"`
	PostMode string `json:"post_mode,omitempty"`
}

type MAXConnectRequest struct {
	BotToken string                      `json:"bot_token"`
	Channels []ChannelConnectTargetInput `json:"channels"`
	PostMode string                      `json:"post_mode,omitempty"`
}

type ChannelOAuthStartRequest struct {
	OAuthAppMode      string `json:"oauth_app_mode,omitempty"`
	OAuthClientID     string `json:"oauth_client_id,omitempty"`
	OAuthClientSecret string `json:"oauth_client_secret,omitempty"`
}

type ChannelOAuthStartResult struct {
	RedirectURL string `json:"redirect_url"`
	StateToken  string `json:"state_token"`
}

type ChannelOAuthCompleteResult struct {
	SessionID string `json:"session_id"`
	Provider  string `json:"provider"`
	Status    string `json:"status"`
}
