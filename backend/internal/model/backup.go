package model

import "time"

type BackupFrequency string

const (
	BackupFrequencyDaily  BackupFrequency = "daily"
	BackupFrequencyWeekly BackupFrequency = "weekly"
)

type BackupTrigger string

const (
	BackupTriggerManual   BackupTrigger = "manual"
	BackupTriggerSchedule BackupTrigger = "schedule"
)

type BackupRunStatus string

const (
	BackupRunQueued    BackupRunStatus = "queued"
	BackupRunRunning   BackupRunStatus = "running"
	BackupRunSucceeded BackupRunStatus = "succeeded"
	BackupRunFailed    BackupRunStatus = "failed"
)

type BackupSettings struct {
	Enabled     bool            `json:"enabled"`
	Frequency   BackupFrequency `json:"frequency"`
	Hour        int             `json:"hour"`
	Minute      int             `json:"minute"`
	Weekday     int             `json:"weekday"`
	RetainCount int             `json:"retain_count"`
	NextRunAt   *time.Time      `json:"next_run_at,omitempty"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type BackupSettingsUpdateRequest struct {
	Enabled     bool            `json:"enabled"`
	Frequency   BackupFrequency `json:"frequency"`
	Hour        int             `json:"hour"`
	Minute      int             `json:"minute"`
	Weekday     int             `json:"weekday"`
	RetainCount int             `json:"retain_count"`
}

type BackupRun struct {
	ID         string          `json:"id"`
	Trigger    BackupTrigger   `json:"trigger"`
	Status     BackupRunStatus `json:"status"`
	S3Key      string          `json:"s3_key,omitempty"`
	LocalName  string          `json:"local_name,omitempty"`
	SizeBytes  int64           `json:"size_bytes"`
	MediaFiles int             `json:"media_files"`
	Error      string          `json:"error,omitempty"`
	StartedAt  *time.Time      `json:"started_at,omitempty"`
	FinishedAt *time.Time      `json:"finished_at,omitempty"`
	CreatedAt  time.Time       `json:"created_at"`
}

type BackupAdminView struct {
	Settings      BackupSettings `json:"settings"`
	StorageReady  bool           `json:"storage_ready"`
	RestoreHint   string         `json:"restore_hint"`
	Runs          []BackupRun    `json:"runs"`
	Timezone      string         `json:"timezone"`
}

type MediaManifestFile struct {
	ID          string `json:"id"`
	WorkspaceID string `json:"workspace_id,omitempty"`
	Name        string `json:"name,omitempty"`
	MimeType    string `json:"mime_type,omitempty"`
	Size        int64  `json:"size,omitempty"`
	S3Key       string `json:"s3_key"`
	Kind        string `json:"kind"`
}

func DefaultBackupSettings() BackupSettings {
	return BackupSettings{
		Enabled:     false,
		Frequency:   BackupFrequencyDaily,
		Hour:        3,
		Minute:      0,
		Weekday:     1,
		RetainCount: 7,
	}
}
