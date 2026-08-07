package model

import "time"

type ChannelStatus string

const (
	ChannelStatusActive          ChannelStatus = "active"
	ChannelStatusNeedsReconnect  ChannelStatus = "needs_reconnect"
	ChannelStatusDisabled        ChannelStatus = "disabled"
)

type ChannelProvider string

const (
	ChannelProviderTelegram ChannelProvider = "telegram"
	ChannelProviderVK       ChannelProvider = "vk"
	ChannelProviderOK       ChannelProvider = "ok"
	ChannelProviderMAX      ChannelProvider = "max"
	ChannelProviderRutube   ChannelProvider = "rutube"
	ChannelProviderDzen     ChannelProvider = "dzen"
)

func (p ChannelProvider) Label() string {
	switch p {
	case ChannelProviderTelegram:
		return "Telegram"
	case ChannelProviderVK:
		return "VK"
	case ChannelProviderOK:
		return "OK"
	case ChannelProviderMAX:
		return "MAX"
	case ChannelProviderRutube:
		return "Rutube"
	case ChannelProviderDzen:
		return "Дзен"
	default:
		return string(p)
	}
}

type MAXPostMode string

const (
	MAXPostModeOwn      MAXPostMode = "own"
	MAXPostModePlatform MAXPostMode = "platform"
)

type ChannelMetadata struct {
	ProviderTitle     string   `json:"provider_title,omitempty"`
	PublicURL         string   `json:"public_url,omitempty"`
	AvatarURL         string   `json:"avatar_url,omitempty"`
	CanPost           *bool    `json:"can_post,omitempty"`
	IsAdmin           *bool    `json:"is_admin,omitempty"`
	BotPermissions    []string `json:"bot_permissions,omitempty"`
	ParticipantsCount *int     `json:"participants_count,omitempty"`
}

type Channel struct {
	ID                  string          `json:"id"`
	WorkspaceID         string          `json:"workspace_id"`
	Provider            ChannelProvider `json:"provider"`
	Name                string          `json:"name"`
	ChatID              string          `json:"chat_id"`
	ChatType            string          `json:"chat_type"`
	BotUsername         string          `json:"bot_username,omitempty"`
	MaxPostMode         MAXPostMode     `json:"max_post_mode,omitempty"`
	Status              ChannelStatus   `json:"status"`
	LastError           string          `json:"last_error,omitempty"`
	Metadata            ChannelMetadata `json:"metadata"`
	MetadataRefreshedAt *time.Time      `json:"metadata_refreshed_at,omitempty"`
	CreatedAt           time.Time       `json:"created_at"`
	UpdatedAt           time.Time       `json:"updated_at"`
}

type ChannelListItem struct {
	Channel
	BotTokenSet  bool   `json:"bot_token_set"`
	BotTokenHint string `json:"bot_token_hint,omitempty"`
	PostModeLabel string `json:"post_mode_label,omitempty"`
}

type ChannelUpdateRequest struct {
	Name        *string    `json:"name,omitempty"`
	BotToken    *string    `json:"bot_token,omitempty"`
	MaxPostMode *MAXPostMode `json:"max_post_mode,omitempty"`
}

type TelegramDiscoverBot struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
}

type TelegramDiscoveredChat struct {
	ChatID    string `json:"chat_id"`
	Title     string `json:"title"`
	Type      string `json:"type"`
	BotStatus string `json:"bot_status"`
	CanPost   bool   `json:"can_post"`
	AvatarURL string `json:"avatar_url,omitempty"`
}

type TelegramDiscoverResult struct {
	Bot   TelegramDiscoverBot      `json:"bot"`
	Chats []TelegramDiscoveredChat `json:"chats"`
	Hint  string                   `json:"hint,omitempty"`
}

type TelegramConnectChannelInput struct {
	ChatID string `json:"chat_id"`
	Name   string `json:"name,omitempty"`
}

type TelegramConnectRequest struct {
	BotToken string                        `json:"bot_token"`
	Channels []TelegramConnectChannelInput `json:"channels"`
}

type TelegramConnectResult struct {
	Connected []ChannelListItem `json:"connected"`
	Skipped   []string        `json:"skipped,omitempty"`
}

type TelegramDiscoverRequest struct {
	BotToken string `json:"bot_token"`
}

const DefaultChannelTestMessage = "✅ Тестовое сообщение от Postilka. Канал подключён корректно."

type ChannelTestMessageResult struct {
	Success        bool   `json:"success"`
	Message        string `json:"message"`
	ProviderPostID string `json:"provider_post_id,omitempty"`
}

type ChannelTestMessageRequest struct {
	Text string `json:"text,omitempty"`
}
