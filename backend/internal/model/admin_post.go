package model

import (
	"encoding/json"
	"time"
)

type AdminPostListItem struct {
	ID            string     `json:"id"`
	WorkspaceID   string     `json:"workspace_id"`
	WorkspaceName string     `json:"workspace_name"`
	AuthorUserID  *string    `json:"author_user_id,omitempty"`
	AuthorEmail   *string    `json:"author_email,omitempty"`
	AuthorName    *string    `json:"author_name,omitempty"`
	MissionID     *string    `json:"mission_id,omitempty"`
	MissionTitle  *string    `json:"mission_title,omitempty"`
	Origin        PostOrigin `json:"origin"`
	Status        PostStatus `json:"status"`
	PreviewText   string     `json:"preview_text"`
	TargetsCount  int        `json:"targets_count"`
	MediaCount    int        `json:"media_count"`
	ChannelsLabel string     `json:"channels_label,omitempty"`
	Views         int        `json:"views"`
	Likes         int        `json:"likes"`
	Comments      int        `json:"comments"`
	Shares        int        `json:"shares"`
	Reach         int        `json:"reach"`
	Clicks        int        `json:"clicks"`
	ClicksUnique  int        `json:"clicks_unique"`
	MetrikaVisits int        `json:"metrika_visits"`
	MetrikaGoals  int        `json:"metrika_goals"`
	HasMetrics    bool       `json:"has_metrics"`
	DueAt         *time.Time `json:"due_at,omitempty"`
	PublishedAt   *time.Time `json:"published_at,omitempty"`
	LastError     string     `json:"last_error,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type AdminPostStats struct {
	TotalPosts        int `json:"total_posts"`
	DraftCount        int `json:"draft_count"`
	PendingCount      int `json:"pending_count"`
	ScheduledCount    int `json:"scheduled_count"`
	PublishingCount   int `json:"publishing_count"`
	PublishedCount    int `json:"published_count"`
	FailedCount       int `json:"failed_count"`
	CanceledCount     int `json:"canceled_count"`
	WithMetricsCount  int `json:"with_metrics_count"`
}

type AdminPostTargetItem struct {
	ID             string           `json:"id"`
	ChannelID      string           `json:"channel_id"`
	ChannelName    string           `json:"channel_name"`
	Provider       string           `json:"provider"`
	ProviderLabel  string           `json:"provider_label"`
	Status         PostTargetStatus `json:"status"`
	ProviderPostID string           `json:"provider_post_id,omitempty"`
	LastError      string           `json:"last_error,omitempty"`
	Attempts       int              `json:"attempts"`
	PublishedAt    *time.Time       `json:"published_at,omitempty"`
}

type AdminPostMediaItem struct {
	ID       string `json:"id"`
	FileID   string `json:"file_id"`
	Position int    `json:"position"`
	Name     string `json:"name"`
	MimeType string `json:"mime_type"`
	Size     int64  `json:"size"`
}

type AdminPostDetail struct {
	AdminPostListItem
	Content  json.RawMessage `json:"content"`
	Settings json.RawMessage `json:"settings"`
	Targets  []AdminPostTargetItem `json:"targets"`
	Media    []AdminPostMediaItem  `json:"media"`
	Metrics  []PostTargetMetrics   `json:"metrics"`
}
