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
	case SocialProviderMAX:
		return "bot_token"
	default:
		return "oauth"
	}
}

type SocialProviderSettings struct {
	Enabled                 bool   `json:"enabled"`
	OAuthClientID           string `json:"oauth_client_id"`
	OAuthClientSecret       string `json:"oauth_client_secret"`
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
	ConnectHelpText         string         `json:"connect_help_text"`
	ConnectHelpURL          string         `json:"connect_help_url"`
	DocsURL                 string         `json:"docs_url"`
	SupportTelegramUsername string         `json:"support_telegram_username"`
	SupportTelegramURL      string         `json:"support_telegram_url"`
	SupportEmail            string         `json:"support_email"`
	SupportHoursText        string         `json:"support_hours_text"`
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
		def.ConnectHelpText = "1. Войдите через VK под аккаунтом администратора сообщества.\n2. Выберите сообщества, где вы администратор.\n3. Подтвердите права на публикацию."
	case SocialProviderOK:
		def.ConnectHelpURL = "https://postilka.ru/docs/ok"
		def.ConnectHelpText = "1. Войдите через Одноклассники.\n2. Выберите группу, где вы администратор.\n3. Подтвердите подключение."
	case SocialProviderMAX:
		def.ConnectHelpURL = "https://postilka.ru/docs/max"
		def.ConnectHelpText = "1. Создайте бота в MAX и скопируйте токен.\n2. Добавьте бота в канал с правом публикации.\n3. Вставьте токен и укажите chat_id канала."
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
	Provider SocialProvider          `json:"provider"`
	Targets  []DiscoveredChannelTarget `json:"targets"`
	Hint     string                  `json:"hint,omitempty"`
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
}

type MAXConnectRequest struct {
	BotToken string                      `json:"bot_token"`
	Channels []ChannelConnectTargetInput `json:"channels"`
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
