package model

import "time"

// WorkspaceInviteStatus matches DB enum workspace_invite_status.
type WorkspaceInviteStatus string

const (
	InvitePending  WorkspaceInviteStatus = "pending"
	InviteAccepted WorkspaceInviteStatus = "accepted"
	InviteRevoked  WorkspaceInviteStatus = "revoked"
	InviteExpired  WorkspaceInviteStatus = "expired"
)

// WorkspaceInvite is the future team-invite entity (wave 8). Schema only for now.
type WorkspaceInvite struct {
	ID          string                `json:"id"`
	WorkspaceID string                `json:"workspace_id"`
	Email       string                `json:"email"`
	Role        WorkspaceRole         `json:"role"`
	InvitedBy   string                `json:"invited_by"`
	Status      WorkspaceInviteStatus `json:"status"`
	ExpiresAt   time.Time             `json:"expires_at"`
	CreatedAt   time.Time             `json:"created_at"`
}
