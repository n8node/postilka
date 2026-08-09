package model

import (
	"encoding/json"
	"time"
)

type AdminFileAIGeneration struct {
	GenerationID       string `json:"generation_id"`
	JobID              string `json:"job_id"`
	Mode               string `json:"mode"`
	Prompt             string `json:"prompt"`
	Model              string `json:"model"`
	AspectRatio        string `json:"aspect_ratio"`
	CreditCost         int    `json:"credit_cost"`
	QuotaCreditsUsed   int    `json:"quota_credits_used"`
	WalletCentsCharged int    `json:"wallet_cents_charged"`
	DurationMs         int    `json:"duration_ms"`
	CreatedAt          string `json:"created_at"`
}

type AdminFileDetail struct {
	ID               string          `json:"id"`
	WorkspaceID      string          `json:"workspace_id"`
	WorkspaceName    string          `json:"workspace_name"`
	FolderID         *string         `json:"folder_id"`
	FolderName       *string         `json:"folder_name"`
	UploadedByUserID *string         `json:"uploaded_by_user_id"`
	UploaderEmail    *string         `json:"uploader_email"`
	UploaderName     *string         `json:"uploader_name"`
	Name             string          `json:"name"`
	MimeType         string          `json:"mime_type"`
	Size             int64           `json:"size"`
	S3Key            string          `json:"s3_key"`
	MediaMetadata    json.RawMessage `json:"media_metadata,omitempty"`
	DeletedAt        *time.Time      `json:"deleted_at,omitempty"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
	AI               *AdminFileAIGeneration `json:"ai,omitempty"`
}
