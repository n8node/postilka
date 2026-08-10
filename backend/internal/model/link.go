package model

import "time"

type LinkCode struct {
	ID              string    `json:"id"`
	Code            string    `json:"code"`
	DestinationURL  string    `json:"destination_url"`
	WorkspaceID     string    `json:"workspace_id"`
	PostID          string    `json:"post_id,omitempty"`
	TargetID        string    `json:"target_id,omitempty"`
	ChannelID       string    `json:"channel_id,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

type LinkClick struct {
	ID            string    `json:"id"`
	LinkCodeID    string    `json:"link_code_id"`
	ClickedAt     time.Time `json:"clicked_at"`
	ReferrerHash  string    `json:"referrer_hash,omitempty"`
	UserAgentHash string    `json:"user_agent_hash,omitempty"`
	IsBot         bool      `json:"is_bot"`
}

type PostApprovalEvent struct {
	ID          string    `json:"id"`
	PostID      string    `json:"post_id"`
	WorkspaceID string    `json:"workspace_id"`
	ActorUserID string    `json:"actor_user_id,omitempty"`
	Action      string    `json:"action"`
	Comment     string    `json:"comment,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type PostApprovalSubmitRequest struct {
	Comment string     `json:"comment,omitempty"`
	DueAt   *time.Time `json:"due_at,omitempty"`
}

type PostApprovalDecisionRequest struct {
	Comment string     `json:"comment,omitempty"`
	DueAt   *time.Time `json:"due_at,omitempty"`
	Publish bool       `json:"publish,omitempty"`
}

type PostApprovalCommentRequest struct {
	Comment string `json:"comment"`
}
