package model

import (
	"encoding/json"
	"time"
)

type ShortsContentType string

const (
	ShortsContentPodcast   ShortsContentType = "podcast"
	ShortsContentInterview ShortsContentType = "interview"
	ShortsContentNews      ShortsContentType = "news"
	ShortsContentReview    ShortsContentType = "product_review"
	ShortsContentVlog      ShortsContentType = "vlog"
	ShortsContentStream    ShortsContentType = "stream"
	ShortsContentLecture   ShortsContentType = "lecture"
	ShortsContentOther     ShortsContentType = "other"
)

type ShortsProjectStatus string

const (
	ShortsProjectDraft            ShortsProjectStatus = "draft"
	ShortsProjectAnalyzing        ShortsProjectStatus = "analyzing"
	ShortsProjectAwaitingApproval ShortsProjectStatus = "awaiting_approval"
	ShortsProjectRendering        ShortsProjectStatus = "rendering"
	ShortsProjectCompleted        ShortsProjectStatus = "completed"
	ShortsProjectFailed           ShortsProjectStatus = "failed"
	ShortsProjectCancelled        ShortsProjectStatus = "cancelled"
)

type ShortsJobStatus string

const (
	ShortsJobQueued    ShortsJobStatus = "queued"
	ShortsJobRunning   ShortsJobStatus = "running"
	ShortsJobSucceeded ShortsJobStatus = "succeeded"
	ShortsJobFailed    ShortsJobStatus = "failed"
	ShortsJobCancelled ShortsJobStatus = "cancelled"
)

type ShortsProject struct {
	ID                        string              `json:"id"`
	WorkspaceID               string              `json:"workspace_id"`
	CreatedByUserID           string              `json:"created_by_user_id"`
	SourceFileID              *string             `json:"source_file_id,omitempty"`
	ContentType               ShortsContentType   `json:"content_type"`
	Language                  string              `json:"language"`
	Status                    ShortsProjectStatus `json:"status"`
	SourceDurationSeconds     float64             `json:"source_duration_seconds"`
	ProcessingMinutesReserved float64             `json:"processing_minutes_reserved"`
	ProcessingMinutesConsumed float64             `json:"processing_minutes_consumed"`
	SourceExpiresAt           *time.Time          `json:"source_expires_at,omitempty"`
	AudioFileID               *string             `json:"audio_file_id,omitempty"`
	AudioExpiresAt            *time.Time          `json:"audio_expires_at,omitempty"`
	Settings                  json.RawMessage     `json:"settings"`
	CreatedAt                 time.Time           `json:"created_at"`
	UpdatedAt                 time.Time           `json:"updated_at"`
}

type ShortsClip struct {
	ID             string          `json:"id"`
	ProjectID      string          `json:"project_id"`
	StartSeconds   float64         `json:"start_seconds"`
	EndSeconds     float64         `json:"end_seconds"`
	TranscriptText string          `json:"transcript_text"`
	Score          float64         `json:"score"`
	ScoreDetails   json.RawMessage `json:"score_details"`
	CropConfig     json.RawMessage `json:"crop_config"`
	SubtitleConfig json.RawMessage `json:"subtitle_config"`
	OverlayConfig  json.RawMessage `json:"overlay_config"`
	Status         string          `json:"status"`
	DraftFileID    *string         `json:"draft_file_id,omitempty"`
	FinalFileID    *string         `json:"final_file_id,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

type ShortsClipUpdate struct {
	StartSeconds   float64 `json:"start_seconds"`
	EndSeconds     float64 `json:"end_seconds"`
	TranscriptText string  `json:"transcript_text"`
	Status         string  `json:"status"`
}

type ShortsJob struct {
	ID          string          `json:"id"`
	ProjectID   string          `json:"project_id"`
	JobType     string          `json:"job_type"`
	Status      ShortsJobStatus `json:"status"`
	CurrentStep string          `json:"current_step"`
	Progress    int             `json:"progress"`
	Attempts    int             `json:"attempts"`
	AvailableAt time.Time       `json:"available_at"`
	LastError   string          `json:"last_error,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type AdminShortsProject struct {
	Project *ShortsProject `json:"project"`
	Job     *ShortsJob     `json:"job,omitempty"`
	Clips   int            `json:"clips"`
}

type ShortsProjectListItem struct {
	Project    *ShortsProject `json:"project"`
	Job        *ShortsJob     `json:"job,omitempty"`
	Clips      int            `json:"clips"`
	SourceFile *WorkspaceFile `json:"source_file,omitempty"`
}

type AdminShortsStats struct {
	Total      int64 `json:"total"`
	Active     int64 `json:"active"`
	Completed  int64 `json:"completed"`
	Failed     int64 `json:"failed"`
	QueuedJobs int64 `json:"queued_jobs"`
}

type ShortsSubtitleStyle struct {
	ID            string          `json:"id"`
	Name          string          `json:"name"`
	Slug          string          `json:"slug"`
	Description   string          `json:"description"`
	PreviewFileID *string         `json:"preview_file_id,omitempty"`
	Config        json.RawMessage `json:"config"`
	IsActive      bool            `json:"is_active"`
	IsDefault     bool            `json:"is_default"`
	SortOrder     int             `json:"sort_order"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
}

type ShortsOverlay struct {
	ID          string          `json:"id,omitempty"`
	Type        string          `json:"type"`
	AssetID     *string         `json:"asset_id,omitempty"`
	StartSec    float64         `json:"start_sec"`
	EndSec      float64         `json:"end_sec"`
	X           float64         `json:"x"`
	Y           float64         `json:"y"`
	Width       float64         `json:"width"`
	Height      float64         `json:"height"`
	Rotation    float64         `json:"rotation"`
	Opacity     float64         `json:"opacity"`
	ZIndex      int             `json:"z_index"`
	RenderStage string          `json:"render_stage"`
	Config      json.RawMessage `json:"config"`
}

type ShortsSubtitlePosition struct {
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Anchor string  `json:"anchor"`
}
