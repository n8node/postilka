package model

import "time"

type InviteScope string

const (
	InviteScopeSystem InviteScope = "SYSTEM"
	InviteScopeUser   InviteScope = "USER"
)

type InviteStatus string

const (
	InviteStatusActive  InviteStatus = "ACTIVE"
	InviteStatusUsed    InviteStatus = "USED"
	InviteStatusRevoked InviteStatus = "REVOKED"
	InviteStatusExpired InviteStatus = "EXPIRED"
)

type RegistrationInvite struct {
	ID              string       `json:"id"`
	Code            string       `json:"code"`
	Scope           InviteScope  `json:"scope"`
	Status          InviteStatus `json:"status"`
	OwnerUserID     *string      `json:"owner_user_id,omitempty"`
	CreatedByUserID *string      `json:"created_by_user_id,omitempty"`
	UsedByUserID    *string      `json:"used_by_user_id,omitempty"`
	UsedAt          *time.Time   `json:"used_at,omitempty"`
	ExpiresAt       *time.Time   `json:"expires_at,omitempty"`
	CreatedAt       time.Time    `json:"created_at"`
}

type InviteUserBrief struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

type AdminInviteListItem struct {
	ID              string           `json:"id"`
	Code            string           `json:"code"`
	Scope           InviteScope      `json:"scope"`
	Status          InviteStatus     `json:"status"`
	EffectiveStatus InviteStatus     `json:"effective_status"`
	CreatedAt       time.Time        `json:"created_at"`
	UsedAt          *time.Time       `json:"used_at,omitempty"`
	ExpiresAt       *time.Time       `json:"expires_at,omitempty"`
	OwnerUser       *InviteUserBrief `json:"owner_user,omitempty"`
	CreatedByUser   *InviteUserBrief `json:"created_by_user,omitempty"`
	UsedByUser      *InviteUserBrief `json:"used_by_user,omitempty"`
}

type InviteRelation struct {
	ID         string           `json:"id"`
	InviteCode string           `json:"invite_code"`
	Inviter    *InviteUserBrief `json:"inviter,omitempty"`
	Invited    *InviteUserBrief `json:"invited,omitempty"`
	UsedAt     *time.Time       `json:"used_at,omitempty"`
}

type UserInviteItem struct {
	ID        string       `json:"id"`
	Code      string       `json:"code"`
	Status    InviteStatus `json:"status"`
	IsActive  bool         `json:"is_active"`
	UsedAt    *time.Time   `json:"used_at,omitempty"`
	CreatedAt time.Time    `json:"created_at"`
}

type PublicInviteItem struct {
	ID       string       `json:"id"`
	Code     string       `json:"code"`
	Status   InviteStatus `json:"status"`
	IsActive bool         `json:"is_active"`
}

type UserInviteRelations struct {
	InvitedBy *struct {
		InviteID   string          `json:"invite_id"`
		InviteCode string          `json:"invite_code"`
		User       *InviteUserBrief `json:"user,omitempty"`
	} `json:"invited_by,omitempty"`
	InvitedUsers []struct {
		ID           string    `json:"id"`
		Email        string    `json:"email"`
		Name         string    `json:"name"`
		InviteCode   string    `json:"invite_code"`
		RegisteredAt time.Time `json:"registered_at"`
	} `json:"invited_users"`
}

func EffectiveInviteStatus(status InviteStatus, expiresAt *time.Time, now time.Time) InviteStatus {
	if status == InviteStatusActive && expiresAt != nil && !expiresAt.After(now) {
		return InviteStatusExpired
	}
	return status
}
