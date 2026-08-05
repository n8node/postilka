package model

import "time"

type LoginOAuthProvider string

const (
	LoginProviderVK  LoginOAuthProvider = "vk"
	LoginProviderMAX LoginOAuthProvider = "max"
)

type UserLoginIdentity struct {
	ID             string             `json:"id"`
	UserID         string             `json:"user_id"`
	Provider       LoginOAuthProvider `json:"provider"`
	ProviderUserID string             `json:"provider_user_id"`
	DisplayName    string             `json:"display_name"`
	AvatarURL      string             `json:"avatar_url,omitempty"`
	CreatedAt      time.Time          `json:"created_at"`
}

type OAuthLoginSession struct {
	ID              string
	Provider        LoginOAuthProvider
	StateToken      string
	Mode            string
	UserID          string
	RedirectPath    string
	CodeVerifier    string
	ExpiresAt       time.Time
	CompletedAt     *time.Time
	CompletedUserID string
	ProviderUserID  string
}
