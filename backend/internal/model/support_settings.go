package model

import "time"

type SupportSettings struct {
	AdminEmailEnabled         bool   `json:"admin_email_enabled"`
	AdminEmailRecipients      string `json:"admin_email_recipients"`
	TelegramEnabled           bool   `json:"telegram_enabled"`
	TelegramBotToken          string `json:"telegram_bot_token"`
	TelegramChatID            string `json:"telegram_chat_id"`
	TelegramNewTicketTemplate string `json:"telegram_new_ticket_template"`
	TelegramUserReplyTemplate string `json:"telegram_user_reply_template"`
	MaxEnabled                bool   `json:"max_enabled"`
	MaxBotToken               string `json:"max_bot_token"`
	MaxRecipientID            string `json:"max_recipient_id"`
	MaxNewTicketTemplate      string `json:"max_new_ticket_template"`
	MaxUserReplyTemplate      string `json:"max_user_reply_template"`
}

type SupportSettingsRecord struct {
	Config    SupportSettings `json:"config"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type SupportSettingsAdminView struct {
	Settings            SupportSettings `json:"settings"`
	TelegramBotTokenSet bool            `json:"telegram_bot_token_set"`
	TelegramBotTokenHint string         `json:"telegram_bot_token_hint,omitempty"`
	MaxBotTokenSet      bool            `json:"max_bot_token_set"`
	MaxBotTokenHint     string          `json:"max_bot_token_hint,omitempty"`
	UpdatedAt           time.Time       `json:"updated_at"`
}

type SupportSettingsAdminUpdateRequest struct {
	Settings         SupportSettings `json:"settings"`
	TelegramBotToken string          `json:"telegram_bot_token,omitempty"`
	MaxBotToken      string          `json:"max_bot_token,omitempty"`
}

type SupportNotifyTestResult struct {
	OK      bool   `json:"ok"`
	Message string `json:"message"`
}

func DefaultSupportSettings() SupportSettings {
	return SupportSettings{
		AdminEmailEnabled:    true,
		AdminEmailRecipients: "",
		TelegramEnabled:      false,
		TelegramNewTicketTemplate: "🆕 Новый тикет #{ticketShortId}\n" +
			"Тема: {themeName}\nОт: {userEmail} ({userName})\n\n{preview}",
		TelegramUserReplyTemplate: "💬 Ответ в тикете #{ticketShortId}\n" +
			"Тема: {themeName}\nОт: {userEmail} ({userName})\n\n{preview}",
		MaxEnabled: false,
		MaxNewTicketTemplate: "🆕 Новый тикет #{ticketShortId}\n" +
			"Тема: {themeName}\nОт: {userEmail}\n\n{preview}",
		MaxUserReplyTemplate: "💬 Ответ в тикете #{ticketShortId}\n" +
			"Тема: {themeName}\nОт: {userEmail}\n\n{preview}",
	}
}
