package model

import (
	"strings"
	"time"
)

type MetrikaPlatformStoredConfig struct {
	Enabled                    bool   `json:"enabled"`
	OAuthClientID              string `json:"oauth_client_id"`
	OAuthClientSecretEncrypted string `json:"oauth_client_secret_encrypted"`
}

type MetrikaPlatformConfigRecord struct {
	Config    MetrikaPlatformStoredConfig `json:"config"`
	UpdatedAt time.Time                   `json:"updated_at"`
}

type MetrikaPlatformAdminView struct {
	Enabled           bool      `json:"enabled"`
	OAuthClientID     string    `json:"oauth_client_id"`
	ClientSecretSet   bool      `json:"client_secret_set"`
	ClientSecretHint  string    `json:"client_secret_hint,omitempty"`
	OAuthRedirectURI  string    `json:"oauth_redirect_uri"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type MetrikaPlatformAdminUpdateRequest struct {
	Enabled           bool   `json:"enabled"`
	OAuthClientID     string `json:"oauth_client_id"`
	OAuthClientSecret string `json:"oauth_client_secret,omitempty"`
}

func DefaultMetrikaPlatformConfig() MetrikaPlatformStoredConfig {
	return MetrikaPlatformStoredConfig{}
}

func MaskOAuthClientSecret(secret string) string {
	secret = strings.TrimSpace(secret)
	if len(secret) <= 4 {
		return "••••"
	}
	return secret[:2] + "••••" + secret[len(secret)-2:]
}
