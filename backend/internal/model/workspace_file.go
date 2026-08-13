package model

import (
	"encoding/json"
	"time"
)

type WorkspaceFile struct {
	ID               string          `json:"id"`
	WorkspaceID      string          `json:"workspace_id"`
	FolderID         *string         `json:"folder_id"`
	UploadedByUserID *string         `json:"uploaded_by_user_id,omitempty"`
	Name             string          `json:"name"`
	MimeType         string          `json:"mime_type"`
	Size             int64           `json:"size"`
	S3Key            string          `json:"-"`
	MediaMetadata    json.RawMessage `json:"media_metadata,omitempty"`
	DeletedAt        *time.Time      `json:"deleted_at,omitempty"`
	TrashBatchID     *string         `json:"trash_batch_id,omitempty"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

type WorkspaceFolder struct {
	ID           string     `json:"id"`
	WorkspaceID  string     `json:"workspace_id"`
	ParentID     *string    `json:"parent_id"`
	Name         string     `json:"name"`
	Kind         *string    `json:"kind,omitempty"`
	DeletedAt    *time.Time `json:"deleted_at,omitempty"`
	TrashBatchID *string    `json:"trash_batch_id,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	FilesCount   int        `json:"files_count,omitempty"`
}

type WorkspaceStorageStats struct {
	UsedBytes          int64  `json:"used_bytes"`
	QuotaBytes         *int64 `json:"quota_bytes"`
	TrashBytes         int64  `json:"trash_bytes"`
	TrashRetentionDays int    `json:"trash_retention_days"`
	FileCount          int    `json:"file_count"`
}

type FileUploadInitRequest struct {
	Name                 string  `json:"name"`
	Size                 int64   `json:"size"`
	MimeType             string  `json:"mime_type"`
	FolderID             *string `json:"folder_id"`
	MediaDurationSeconds *int    `json:"media_duration_seconds"`
	MediaWidth           *int    `json:"media_width"`
	MediaHeight          *int    `json:"media_height"`
}

type FileUploadInitResponse struct {
	UploadURL          string            `json:"upload_url"`
	UploadHeaders      map[string]string `json:"upload_headers"`
	UploadSessionToken string            `json:"upload_session_token"`
}

type FileUploadCompleteRequest struct {
	UploadSessionToken string `json:"upload_session_token"`
}

type FileBulkRequest struct {
	IDs      []string `json:"ids"`
	Action   string   `json:"action"`
	FolderID *string  `json:"folder_id"`
	ParentID *string  `json:"parent_id"`
}

type FolderBulkRequest struct {
	IDs      []string `json:"ids"`
	Action   string   `json:"action"`
	ParentID *string  `json:"parent_id"`
}

type FileTransferRequest struct {
	TargetWorkspaceID string  `json:"target_workspace_id"`
	TargetFolderID    *string `json:"target_folder_id"`
	Mode              string  `json:"mode"`
}

type TrashRestoreRequest struct {
	FileIDs   []string `json:"file_ids"`
	FolderIDs []string `json:"folder_ids"`
}

type FolderBreadcrumb struct {
	ID   *string `json:"id"`
	Name string  `json:"name"`
}
