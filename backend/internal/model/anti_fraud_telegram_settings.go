package model

import "time"

type AntiFraudTelegramSettings struct {
	Enabled                bool     `json:"enabled"`
	BotTokenEncrypted      string   `json:"-"`
	AdminTelegramID        int64    `json:"admin_telegram_id"`
	ProxyEnabled           bool     `json:"proxy_enabled"`
	ProxyActiveURL         string   `json:"proxy_active_url"`
	ProxyAutoFailover      bool     `json:"proxy_auto_failover"`
	ProxyURLs              []string `json:"proxy_urls"`
	WebhookSecretEncrypted string   `json:"-"`
	NotifyHigh             bool     `json:"notify_high"`
	NotifyCritical         bool     `json:"notify_critical"`
	RequireConfirmation    bool     `json:"require_confirmation"`
}

type AntiFraudTelegramSettingsRecord struct {
	Config    AntiFraudTelegramSettings `json:"config"`
	UpdatedAt time.Time                 `json:"updated_at"`
}

type AntiFraudTelegramAdminView struct {
	Settings         AntiFraudTelegramSettings `json:"settings"`
	BotTokenSet      bool                      `json:"bot_token_set"`
	BotTokenHint     string                    `json:"bot_token_hint,omitempty"`
	WebhookSecretSet bool                      `json:"webhook_secret_set"`
	UpdatedAt        time.Time                 `json:"updated_at"`
}

type AntiFraudTelegramUpdateRequest struct {
	Settings      AntiFraudTelegramSettings `json:"settings"`
	BotToken      string                    `json:"bot_token,omitempty"`
	WebhookSecret string                    `json:"webhook_secret,omitempty"`
}

func DefaultAntiFraudTelegramSettings() AntiFraudTelegramSettings {
	return AntiFraudTelegramSettings{
		ProxyAutoFailover:   true,
		ProxyURLs:           []string{},
		NotifyHigh:          true,
		NotifyCritical:      true,
		RequireConfirmation: true,
	}
}
