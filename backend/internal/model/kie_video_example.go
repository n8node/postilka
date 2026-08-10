package model

import "time"

const (
	KieVideoExamplePending    = "pending"
	KieVideoExampleGenerating = "generating"
	KieVideoExampleReady      = "ready"
	KieVideoExampleFailed     = "failed"
)

type KieVideoExample struct {
	ID                string
	Mode              string
	Prompt            string
	AspectRatio       string
	Duration          int
	ModelID           string
	Status            string
	KieTaskID         string
	FailMessage       string
	ResultS3Key       string
	ResultContentType string
	SourceImageURLs   []string
	SortOrder         int
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type KieVideoExampleView struct {
	ID                string   `json:"id"`
	Mode              string   `json:"mode"`
	Prompt            string   `json:"prompt"`
	AspectRatio       string   `json:"aspect_ratio"`
	Duration          int      `json:"duration"`
	ModelID           string   `json:"model_id,omitempty"`
	Status            string   `json:"status"`
	FailMessage       string   `json:"fail_message,omitempty"`
	VideoURL          string   `json:"video_url,omitempty"`
	SourceImageURLs   []string `json:"source_image_urls,omitempty"`
	SortOrder         int      `json:"sort_order"`
	CreatedAt         string   `json:"created_at"`
	UpdatedAt         string   `json:"updated_at"`
}

type KieVideoExampleCreateRequest struct {
	Mode        string   `json:"mode"`
	Prompt      string   `json:"prompt"`
	AspectRatio string   `json:"aspect_ratio"`
	Duration    int      `json:"duration"`
	ImageURLs   []string `json:"image_urls,omitempty"`
}

type KieVideoPublicExampleView struct {
	ID          string `json:"id"`
	Mode        string `json:"mode"`
	Prompt      string `json:"prompt"`
	AspectRatio string `json:"aspect_ratio"`
	Duration    int    `json:"duration"`
	VideoURL    string `json:"video_url"`
}

func (e KieVideoExample) ToAdminView(videoURL string) KieVideoExampleView {
	return KieVideoExampleView{
		ID:              e.ID,
		Mode:            e.Mode,
		Prompt:          e.Prompt,
		AspectRatio:     e.AspectRatio,
		Duration:        e.Duration,
		ModelID:         e.ModelID,
		Status:          e.Status,
		FailMessage:     e.FailMessage,
		VideoURL:        videoURL,
		SourceImageURLs: append([]string(nil), e.SourceImageURLs...),
		SortOrder:       e.SortOrder,
		CreatedAt:       e.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:       e.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

func (e KieVideoExample) ToPublicView(videoURL string) KieVideoPublicExampleView {
	return KieVideoPublicExampleView{
		ID:          e.ID,
		Mode:        e.Mode,
		Prompt:      e.Prompt,
		AspectRatio: e.AspectRatio,
		Duration:    e.Duration,
		VideoURL:    videoURL,
	}
}
