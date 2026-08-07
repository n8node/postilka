package model

import "time"

type SocialProvider string

const (
	SocialProviderVK     SocialProvider = "vk"
	SocialProviderOK     SocialProvider = "ok"
	SocialProviderMAX    SocialProvider = "max"
	SocialProviderRutube SocialProvider = "rutube"
	SocialProviderDzen   SocialProvider = "dzen"
)

var AllSocialProviders = []SocialProvider{
	SocialProviderVK,
	SocialProviderOK,
	SocialProviderMAX,
	SocialProviderRutube,
	SocialProviderDzen,
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
	default:
		return "oauth"
	}
}

func (p SocialProvider) UsesUserOAuthApp() bool {
	return p == SocialProviderVK
}

type SocialProviderSettings struct {
	Enabled                 bool   `json:"enabled"`
	OAuthClientID           string `json:"oauth_client_id"`
	OAuthClientSecret       string `json:"oauth_client_secret"`
	PlatformBotEnabled      bool   `json:"platform_bot_enabled"`
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
	PlatformBot             *MAXDiscoverBot `json:"platform_bot,omitempty"`
	ConnectHelpText         string         `json:"connect_help_text"`
	ConnectHelpURL          string         `json:"connect_help_url"`
	DocsURL                 string         `json:"docs_url"`
	SupportTelegramUsername string         `json:"support_telegram_username"`
	SupportTelegramURL      string         `json:"support_telegram_url"`
	SupportEmail            string         `json:"support_email"`
	SupportHoursText        string         `json:"support_hours_text"`
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
		def.ConnectHelpText = "1. Создайте Standalone-приложение VK (vk.com/apps?act=manage) и укажите Redirect URI из Postilka.\n2. Скопируйте ID приложения и защищённый ключ.\n3. В Postilka вставьте ключи и войдите через VK.\n4. Выберите сообщества, где вы администратор.\n5. Права приложения: wall, photos, video, groups, offline."
	case SocialProviderOK:
		def.ConnectHelpURL = "https://postilka.ru/docs/ok"
		def.ConnectHelpText = "1. Войдите через Одноклассники.\n2. Выберите группу, где вы администратор.\n3. Подтвердите подключение."
	case SocialProviderMAX:
		def.ConnectHelpURL = "https://postilka.ru/docs/max"
		def.ConnectHelpText = "1. Создайте бота через @MasterBot или business.max.ru и скопируйте токен.\n2. В Postilka нажмите «Проверить бота» — появится @username для поиска.\n3. В MAX: канал → Участники → Добавить → ищите бота по @username (не по названию и не по ID).\n4. Канал → Администраторы → добавьте бота с правом «Публикация».\n5. Вернитесь в Postilka, укажите ссылку на канал и подключите."
	case SocialProviderRutube:
		def.ConnectHelpURL = "https://postilka.ru/docs/rutube"
		def.ConnectHelpText = "1. Войдите через Rutube.\n2. Выберите канал для публикации.\n3. Подтвердите права."
	case SocialProviderDzen:
		def.ConnectHelpURL = "https://postilka.ru/docs/dzen"
		def.ConnectHelpText = "1. Войдите через Яндекс.\n2. Выберите канал Дзен.\n3. Подтвердите подключение."
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
