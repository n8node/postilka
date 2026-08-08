package model

import (
	"encoding/json"
	"time"
)

type AdminFileListItem struct {
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
	MediaMetadata    json.RawMessage `json:"media_metadata,omitempty"`
	DeletedAt        *time.Time      `json:"deleted_at,omitempty"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

type AdminFileStats struct {
	TotalFiles int   `json:"total_files"`
	TotalBytes int64 `json:"total_bytes"`
	TrashFiles int   `json:"trash_files"`
	TrashBytes int64 `json:"trash_bytes"`
}

type AdminFolderListItem struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
