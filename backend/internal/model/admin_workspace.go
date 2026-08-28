package model

import "time"

type AdminWorkspaceListItem struct {
	ID               string         `json:"id"`
	Name             string         `json:"name"`
	Slug             string         `json:"slug"`
	OwnerID          string         `json:"owner_id"`
	OwnerEmail       string         `json:"owner_email"`
	OwnerName        string         `json:"owner_name"`
	Plan             *AdminUserPlan `json:"plan"`
	MembersCount     int            `json:"members_count"`
	InvitesPending   int            `json:"invites_pending"`
	InvitesAccepted  int            `json:"invites_accepted"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	PlanAssignedAt   *time.Time     `json:"plan_assigned_at,omitempty"`
}

type AdminWorkspaceMember struct {
	UserID          string    `json:"user_id"`
	Email           string    `json:"email"`
	Name            string    `json:"name"`
	Role            string    `json:"role"`
	Status          string    `json:"status"`
	JoinedAt        time.Time `json:"joined_at"`
	JoinedViaInvite bool      `json:"joined_via_invite"`
}

type AdminWorkspaceInvite struct {
	ID             string    `json:"id"`
	Email          string    `json:"email"`
	Role           string    `json:"role"`
	Status         string    `json:"status"`
	InvitedByEmail string    `json:"invited_by_email"`
	InvitedByName  string    `json:"invited_by_name"`
	ExpiresAt      time.Time `json:"expires_at"`
	CreatedAt      time.Time `json:"created_at"`
}

type AdminWorkspaceDetail struct {
	AdminWorkspaceListItem
	Members []AdminWorkspaceMember `json:"members"`
	Invites []AdminWorkspaceInvite `json:"invites"`
}

type AdminUserWorkspaceItem struct {
	ID           string         `json:"id"`
	Name         string         `json:"name"`
	Slug         string         `json:"slug"`
	Role         string         `json:"role"`
	IsOwner      bool           `json:"is_owner"`
	OwnerEmail   string         `json:"owner_email"`
	OwnerName    string         `json:"owner_name"`
	Plan         *AdminUserPlan `json:"plan"`
	MembersCount int            `json:"members_count"`
	CreatedAt    time.Time      `json:"created_at"`
}

type AdminWorkspaceStats struct {
	TotalWorkspaces int `json:"total_workspaces"`
	TotalMembers    int `json:"total_members"`
	TotalOwners     int `json:"total_owners"`
	PendingInvites  int `json:"pending_invites"`
	AcceptedInvites int `json:"accepted_invites"`
}
