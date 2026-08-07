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

type Channel struct {
	ID          string          `json:"id"`
	WorkspaceID string          `json:"workspace_id"`
	Provider    ChannelProvider `json:"provider"`
	Name        string          `json:"name"`
	ChatID      string          `json:"chat_id"`
	ChatType    string          `json:"chat_type"`
	BotUsername string          `json:"bot_username,omitempty"`
	Status      ChannelStatus   `json:"status"`
	LastError   string          `json:"last_error,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type ChannelListItem struct {
	Channel
	BotTokenSet  bool   `json:"bot_token_set"`
	BotTokenHint string `json:"bot_token_hint,omitempty"`
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
