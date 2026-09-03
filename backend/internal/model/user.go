package model

import (
	"strings"
	"time"
)

const UserAvatarAPIPath = "/user/avatar"

// PlaceholderLoginEmailDomain is assigned to OAuth users who did not share a real email.
// It is not a deliverable mailbox; SMTP must never send there.
const PlaceholderLoginEmailDomain = "login.postilka.local"

type User struct {
	ID              string     `json:"id"`
	Email           string     `json:"email"`
	Name            string     `json:"name"`
	Locale          string     `json:"locale"`
	Timezone        string     `json:"timezone"`
	IsBlocked       bool       `json:"is_blocked"`
	IsPlatformAdmin bool       `json:"is_platform_admin"`
	EmailVerifiedAt *time.Time `json:"email_verified_at,omitempty"`
	PendingEmail    string     `json:"pending_email,omitempty"`
	HasPassword     bool       `json:"has_password"`
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

func IsPlaceholderLoginEmail(email string) bool {
	addr := strings.ToLower(strings.TrimSpace(email))
	_, domain, ok := strings.Cut(addr, "@")
	return ok && domain == PlaceholderLoginEmailDomain
}

func IsDeliverableEmail(email string) bool {
	return strings.TrimSpace(email) != "" && !IsPlaceholderLoginEmail(email)
}

func (u *User) HasDeliverableEmail() bool {
	return u != nil && u.EmailVerifiedAt != nil && IsDeliverableEmail(u.Email)
}

func (u *User) NeedsEmailBind() bool {
	return u != nil && IsPlaceholderLoginEmail(u.Email) && strings.TrimSpace(u.PendingEmail) == ""
}
