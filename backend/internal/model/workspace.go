package model

import "time"

type Workspace struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	OwnerID   string    `json:"owner_id"`
	Role      string    `json:"role,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type WorkspaceMember struct {
	UserID          string    `json:"user_id"`
	Email           string    `json:"email"`
	Name            string    `json:"name"`
	Role            string    `json:"role"`
	JoinedAt        time.Time `json:"joined_at"`
	JoinedViaInvite bool      `json:"joined_via_invite"`
}
