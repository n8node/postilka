package model

import "time"

type SMTPEncryption string

const (
	SMTPEncryptionNone SMTPEncryption = "none"
	SMTPEncryptionSSL  SMTPEncryption = "ssl"
	SMTPEncryptionTLS  SMTPEncryption = "tls"
)

type SMTPSettings struct {
	Enabled          bool           `json:"enabled"`
	FromEmail        string         `json:"from_email"`
	FromName         string         `json:"from_name"`
	ForceFromEmail   bool           `json:"force_from_email"`
	ForceFromName    bool           `json:"force_from_name"`
	ReplyToFromEmail bool           `json:"reply_to_from_email"`
	Host             string         `json:"host"`
	Port             int            `json:"port"`
	Encryption       SMTPEncryption `json:"encryption"`
	AutoTLS          bool           `json:"auto_tls"`
	Auth             bool           `json:"auth"`
	Username         string         `json:"username"`
	Password         string         `json:"password"`
}

type SMTPSettingsRecord struct {
	Config    SMTPSettings `json:"config"`
	UpdatedAt time.Time    `json:"updated_at"`
}

type SMTPAdminView struct {
	Settings         SMTPSettings `json:"settings"`
	PasswordSet      bool         `json:"password_set"`
	UpdatedAt        time.Time    `json:"updated_at"`
	YandexPresetHost string       `json:"yandex_preset_host"`
	YandexPresetPort int          `json:"yandex_preset_port"`
}

type SMTPAdminUpdateRequest struct {
	Settings SMTPSettings `json:"settings"`
	Password string       `json:"password,omitempty"`
}

type SMTPTestEmailRequest struct {
	To string `json:"to"`
}

type SMTPTestEmailResult struct {
	OK      bool   `json:"ok"`
	Message string `json:"message"`
}

func DefaultSMTPSettings() SMTPSettings {
	return SMTPSettings{
		Enabled:          false,
		FromName:         "Postilka",
		ForceFromEmail:   true,
		ForceFromName:    true,
		ReplyToFromEmail: true,
		Port:             465,
		Encryption:       SMTPEncryptionSSL,
		AutoTLS:          true,
		Auth:             true,
	}
}
