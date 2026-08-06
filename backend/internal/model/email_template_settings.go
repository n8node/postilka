package model

import "time"

type EmailFooterLink struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

type EmailSocialLink struct {
	Label   string `json:"label"`
	URL     string `json:"url"`
	IconURL string `json:"icon_url"`
}

type EmailTemplateSettings struct {
	LogoURL          string            `json:"logo_url"`
	LogoAlt          string            `json:"logo_alt"`
	PrimaryColor     string            `json:"primary_color"`
	BackgroundColor  string            `json:"background_color"`
	CardRadiusPx     int               `json:"card_radius_px"`
	SignatureTitle   string            `json:"signature_title"`
	SignatureTeam    string            `json:"signature_team"`
	FooterLinks      []EmailFooterLink `json:"footer_links"`
	SocialLinks      []EmailSocialLink `json:"social_links"`
	AppDownloadText  string            `json:"app_download_text"`
	AppStoreURL      string            `json:"app_store_url"`
	GooglePlayURL    string            `json:"google_play_url"`
	FooterLegalText  string            `json:"footer_legal_text"`
	UnsubscribeText  string            `json:"unsubscribe_text"`
	UnsubscribeURL   string            `json:"unsubscribe_url"`
}

type EmailTemplateSettingsRecord struct {
	Config    EmailTemplateSettings `json:"config"`
	UpdatedAt time.Time             `json:"updated_at"`
}

type EmailTemplateAdminView struct {
	Settings  EmailTemplateSettings `json:"settings"`
	UpdatedAt time.Time               `json:"updated_at"`
}

type EmailTemplateAdminUpdateRequest struct {
	Settings EmailTemplateSettings `json:"settings"`
}

type EmailTemplateTestRequest struct {
	To string `json:"to"`
}

type EmailTemplateTestResult struct {
	OK      bool   `json:"ok"`
	Message string `json:"message"`
}

func DefaultEmailTemplateSettings() EmailTemplateSettings {
	return EmailTemplateSettings{
		LogoAlt:         "Postilka",
		PrimaryColor:    "#2563eb",
		BackgroundColor: "#eef1f6",
		CardRadiusPx:    20,
		SignatureTitle:  "Делаем автопостинг проще!",
		SignatureTeam:   "Команда сервиса Postilka",
		FooterLinks: []EmailFooterLink{
			{Label: "Возможности", URL: "https://postilka.ru"},
			{Label: "Документация", URL: "https://postilka.ru/docs"},
			{Label: "Полезное", URL: "https://postilka.ru/blog"},
		},
		SocialLinks: []EmailSocialLink{
			{Label: "Telegram", URL: "https://t.me/postilka"},
			{Label: "VK", URL: "https://vk.com/postilka"},
			{Label: "Дзен", URL: "https://dzen.ru/postilka"},
		},
		AppDownloadText: "Скачайте приложение Postilka",
		FooterLegalText: "Вы получили это письмо, потому что зарегистрировались в сервисе Postilka или подписались на рассылку.",
		UnsubscribeText: "Отписаться от рассылки",
		UnsubscribeURL:  "https://postilka.ru/app/settings",
	}
}
