package model

import (
	"strings"
	"time"
)

type SketchStyle struct {
	ID                 string
	Title              string
	Description        string
	PositivePrompt     string
	NegativePrompt     string
	DefaultStrength    float64
	AspectRatio        string
	PreviewS3Key       string
	PreviewContentType string
	SortOrder          int
	IsPublished        bool
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

type SketchStylePublicView struct {
	ID              string  `json:"id"`
	Title           string  `json:"title"`
	Description     string  `json:"description"`
	DefaultStrength float64 `json:"default_strength"`
	AspectRatio     string  `json:"aspect_ratio"`
	PreviewURL      string  `json:"preview_url,omitempty"`
	SortOrder       int     `json:"sort_order"`
}

type SketchStyleAdminView struct {
	SketchStylePublicView
	PositivePrompt string `json:"positive_prompt"`
	NegativePrompt string `json:"negative_prompt"`
	IsPublished    bool   `json:"is_published"`
	HasPreview     bool   `json:"has_preview"`
	CreatedAt      string `json:"created_at"`
	UpdatedAt      string `json:"updated_at"`
}

type SketchStyleWriteRequest struct {
	Title           string   `json:"title"`
	Description     string   `json:"description"`
	PositivePrompt  string   `json:"positive_prompt"`
	NegativePrompt  string   `json:"negative_prompt"`
	DefaultStrength *float64 `json:"default_strength"`
	AspectRatio     string   `json:"aspect_ratio"`
	SortOrder       *int     `json:"sort_order"`
	IsPublished     *bool    `json:"is_published"`
}

type SketchGenerateRequest struct {
	StyleID        string  `json:"style_id"`
	SourceUploadID string  `json:"source_upload_id"`
	Prompt         string  `json:"prompt"`
	AspectRatio    string  `json:"aspect_ratio"`
	Strength       float64 `json:"strength"`
	Output         string  `json:"output"` // "image" | "video"
	Duration       int     `json:"duration"`
}

func (s SketchStyle) PreviewPath() string {
	if s.PreviewS3Key == "" {
		return ""
	}
	return "/sketch/styles/" + s.ID + "/preview"
}

func (s SketchStyle) ToPublicView() SketchStylePublicView {
	v := SketchStylePublicView{
		ID:              s.ID,
		Title:           s.Title,
		Description:     s.Description,
		DefaultStrength: s.DefaultStrength,
		AspectRatio:     s.AspectRatio,
		SortOrder:       s.SortOrder,
	}
	if s.PreviewS3Key != "" {
		v.PreviewURL = s.PreviewPath()
	}
	return v
}

func (s SketchStyle) ToAdminView() SketchStyleAdminView {
	return SketchStyleAdminView{
		SketchStylePublicView: s.ToPublicView(),
		PositivePrompt:        s.PositivePrompt,
		NegativePrompt:        s.NegativePrompt,
		IsPublished:           s.IsPublished,
		HasPreview:            strings.TrimSpace(s.PreviewS3Key) != "",
		CreatedAt:             s.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:             s.UpdatedAt.UTC().Format(time.RFC3339),
	}
}
