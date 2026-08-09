package model

import "time"

// AdminUserListItem is a platform-admin view of a user with primary workspace.
type AdminUserListItem struct {
	ID              string              `json:"id"`
	Email           string              `json:"email"`
	Name            string              `json:"name"`
	Locale          string              `json:"locale"`
	Timezone        string              `json:"timezone"`
	IsBlocked       bool                `json:"is_blocked"`
	IsPlatformAdmin    bool                `json:"is_platform_admin"`
	WalletBalanceCents int64               `json:"wallet_balance_cents"`
	CreatedAt          time.Time           `json:"created_at"`
	UpdatedAt       time.Time           `json:"updated_at"`
	Workspace       *AdminUserWorkspace `json:"workspace"`
	Plan            *AdminUserPlan      `json:"plan"`
}

type AdminUserWorkspace struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
	Role string `json:"role"`
}
