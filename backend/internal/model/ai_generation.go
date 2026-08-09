package model

import "time"

type AIGeneration struct {
	ID                string
	UserID            string
	WorkspaceID       string
	Mode              string
	Prompt            string
	Model             string
	AspectRatio       string
	ResultS3Key       string
	ResultContentType string
	CreatedAt         time.Time
}

type AIGenerationView struct {
	ID          string `json:"id"`
	Mode        string `json:"mode"`
	Prompt      string `json:"prompt"`
	Model       string `json:"model"`
	AspectRatio string `json:"aspect_ratio,omitempty"`
	ImageURL    string `json:"image_url"`
	CreatedAt   string `json:"created_at"`
	UsedInPost  bool   `json:"used_in_post"`
}

type AIGenerationWithUsage struct {
	AIGeneration
	UsedInPost bool
}

func (g AIGeneration) ToViewWithUsage(usedInPost bool) AIGenerationView {
	return AIGenerationView{
		ID:          g.ID,
		Mode:        g.Mode,
		Prompt:      g.Prompt,
		Model:       g.Model,
		AspectRatio: g.AspectRatio,
		ImageURL:    AIGenerationMediaPath(g.ID),
		CreatedAt:   g.CreatedAt.UTC().Format(time.RFC3339),
		UsedInPost:  usedInPost,
	}
}

func AIGenerationMediaPath(id string) string {
	return "/api/v1/media/ai-generations/" + id
}

type GenerationSourceUpload struct {
	ID          string
	UserID      string
	WorkspaceID string
	S3Key       string
	ContentType string
	CreatedAt   time.Time
}

type GenerationSourceUploadView struct {
	ID          string `json:"id"`
	ContentType string `json:"content_type"`
	CreatedAt   string `json:"created_at"`
}

func (u GenerationSourceUpload) ToView() GenerationSourceUploadView {
	return GenerationSourceUploadView{
		ID:          u.ID,
		ContentType: u.ContentType,
		CreatedAt:   u.CreatedAt.UTC().Format(time.RFC3339),
	}
}
