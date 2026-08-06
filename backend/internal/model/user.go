package model

import "time"

type User struct {
	ID              string     `json:"id"`
	Email           string     `json:"email"`
	Name            string     `json:"name"`
	Locale          string     `json:"locale"`
	Timezone        string     `json:"timezone"`
	IsBlocked       bool       `json:"is_blocked"`
	IsPlatformAdmin bool       `json:"is_platform_admin"`
	EmailVerifiedAt *time.Time `json:"email_verified_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}
