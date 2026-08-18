package model

import (
	"strings"
	"time"
)

const UserAvatarAPIPath = "/user/avatar"

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
	AvatarS3Key     string     `json:"-"`
	AvatarURL       string     `json:"avatar_url,omitempty"`
}

func ApplyUserAvatarURL(u *User) {
	if u == nil {
		return
	}
	u.AvatarURL = ""
	if strings.TrimSpace(u.AvatarS3Key) != "" {
		u.AvatarURL = UserAvatarAPIPath
	}
}
