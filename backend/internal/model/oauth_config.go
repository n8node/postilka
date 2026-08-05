package model

type VKLoginConfig struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret,omitempty"`
}

type MAXLoginConfig struct {
	BotUsername   string `json:"bot_username"`
	BotToken      string `json:"bot_token,omitempty"`
	WebhookSecret string `json:"webhook_secret,omitempty"`
}

type AdminVKLoginConfig struct {
	ClientID        string `json:"client_id"`
	ClientSecretSet bool   `json:"client_secret_set"`
	RedirectURI     string `json:"redirect_uri"`
	Configured      bool   `json:"configured"`
}

type AdminMAXLoginConfig struct {
	BotUsername       string `json:"bot_username"`
	BotTokenSet       bool   `json:"bot_token_set"`
	WebhookSecretSet  bool   `json:"webhook_secret_set"`
	WebhookURL        string `json:"webhook_url"`
	Configured        bool   `json:"configured"`
}

type AdminOAuthLoginSettings struct {
	VK  AdminVKLoginConfig  `json:"vk"`
	MAX AdminMAXLoginConfig `json:"max"`
}

type AdminAuthSettingsInput struct {
	InviteRegistrationEnabled bool            `json:"invite_registration_enabled"`
	VKLoginEnabled            bool            `json:"vk_login_enabled"`
	MAXLoginEnabled           bool            `json:"max_login_enabled"`
	VK                        *VKLoginConfig  `json:"vk,omitempty"`
	MAX                       *MAXLoginConfig `json:"max,omitempty"`
}

type AdminAuthSettingsResponse struct {
	InviteRegistrationEnabled bool                   `json:"invite_registration_enabled"`
	VKLoginEnabled            bool                   `json:"vk_login_enabled"`
	MAXLoginEnabled           bool                   `json:"max_login_enabled"`
	OAuth                     AdminOAuthLoginSettings `json:"oauth"`
}
