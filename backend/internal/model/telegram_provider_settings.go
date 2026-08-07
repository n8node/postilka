package model

import "time"

type TelegramProviderSettings struct {
	Enabled                 bool     `json:"enabled"`
	ProxyEnabled            bool     `json:"proxy_enabled"`
	ProxyActiveURL          string   `json:"proxy_active_url"`
	ProxyAutoFailover       bool     `json:"proxy_auto_failover"`
	ProxyURLs               []string `json:"proxy_urls"`
	ConnectHelpText         string   `json:"connect_help_text"`
	ConnectHelpURL          string   `json:"connect_help_url"`
	DocsURL                 string   `json:"docs_url"`
	SupportTelegramUsername string   `json:"support_telegram_username"`
	SupportEmail            string   `json:"support_email"`
	SupportHoursText        string   `json:"support_hours_text"`
}

type ChannelProviderInfo struct {
	TelegramEnabled         bool   `json:"telegram_enabled"`
	ConnectHelpText         string `json:"connect_help_text"`
	ConnectHelpURL          string `json:"connect_help_url"`
	DocsURL                 string `json:"docs_url"`
	SupportTelegramUsername string `json:"support_telegram_username"`
	SupportTelegramURL      string `json:"support_telegram_url"`
	SupportEmail            string `json:"support_email"`
	SupportHoursText        string `json:"support_hours_text"`
}

type TelegramProviderSettingsRecord struct {
	Config    TelegramProviderSettings `json:"config"`
	UpdatedAt time.Time                `json:"updated_at"`
}

type TelegramProviderAdminView struct {
	Settings  TelegramProviderSettings `json:"settings"`
	UpdatedAt time.Time                `json:"updated_at"`
}

func DefaultTelegramProviderSettings() TelegramProviderSettings {
	return TelegramProviderSettings{
		Enabled:                 true,
		ProxyEnabled:            false,
		ProxyAutoFailover:       true,
		ProxyURLs:               []string{},
		ConnectHelpText:         "1. Создайте бота через @BotFather и скопируйте токен.\n2. Добавьте бота администратором в канал или группу с правом публикации.\n3. Вставьте токен в Postilka и нажмите «Найти чаты».\n4. Если список пуст — добавьте бота в канал и нажмите «Обновить».",
		ConnectHelpURL:          "https://postilka.ru/docs/telegram",
		DocsURL:                 "https://postilka.ru/docs",
		SupportTelegramUsername: "postilka_support",
		SupportEmail:            "support@postilka.ru",
		SupportHoursText:        "пн–вс 10:00–19:00 (МСК)",
	}
}
