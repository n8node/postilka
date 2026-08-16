package model

import (
	"strings"
	"time"
)

const (
	AdStudioCategoryProductShot = "product_shot"
	AdStudioCategoryMotion      = "motion"
	AdStudioCategoryUGC         = "ugc"
	AdStudioCategoryAds         = "ads"
	AdStudioCategoryPosters     = "posters"
	AdStudioCategoryMarketplace = "marketplace"

	AdStudioMediaImage = "image"
	AdStudioMediaVideo = "video"

	AdStudioModeTextToImage      = "text-to-image"
	AdStudioModeImageToImage     = "image-to-image"
	AdStudioModeCombine          = "combine"
	AdStudioModeTextToVideo      = "text-to-video"
	AdStudioModeImageToVideo     = "image-to-video"
	AdStudioModeReferenceToVideo = "reference-to-video"
)

func NormalizeAdStudioGenerationMode(mode string) string {
	switch strings.TrimSpace(mode) {
	case AdStudioModeTextToImage, AdStudioModeImageToImage, AdStudioModeCombine,
		AdStudioModeTextToVideo, AdStudioModeImageToVideo, AdStudioModeReferenceToVideo:
		return strings.TrimSpace(mode)
	default:
		return ""
	}
}

func AdStudioMediaKindForMode(mode string) string {
	switch NormalizeAdStudioGenerationMode(mode) {
	case AdStudioModeTextToVideo, AdStudioModeImageToVideo, AdStudioModeReferenceToVideo:
		return AdStudioMediaVideo
	default:
		return AdStudioMediaImage
	}
}

func AdStudioModeNeedsProduct(mode string) bool {
	switch NormalizeAdStudioGenerationMode(mode) {
	case AdStudioModeImageToImage, AdStudioModeCombine, AdStudioModeImageToVideo, AdStudioModeReferenceToVideo:
		return true
	default:
		return false
	}
}

func AdStudioModeUsesTemplateInput(mode string) bool {
	switch NormalizeAdStudioGenerationMode(mode) {
	case AdStudioModeCombine, AdStudioModeReferenceToVideo:
		return true
	default:
		return false
	}
}

type AdStudioTemplate struct {
	ID                 string
	Title              string
	Description        string
	Category           string
	MediaKind          string
	GenerationMode     string
	AspectRatio        string
	Duration           int
	SystemPrompt       string
	PreviewS3Key       string
	PreviewContentType string
	PreviewThumbS3Key  string
	RequiresProduct    bool
	RequiresAvatar     bool
	SortOrder          int
	IsPublished        bool
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

type AdStudioTemplatePublicView struct {
	ID               string `json:"id"`
	Title            string `json:"title"`
	Description      string `json:"description"`
	Category         string `json:"category"`
	MediaKind        string `json:"media_kind"`
	GenerationMode   string `json:"generation_mode"`
	AspectRatio      string `json:"aspect_ratio"`
	Duration         int    `json:"duration"`
	RequiresProduct  bool   `json:"requires_product"`
	RequiresAvatar   bool   `json:"requires_avatar"`
	PreviewKind      string `json:"preview_kind,omitempty"`
	PreviewURL       string `json:"preview_url,omitempty"`
	PreviewSourceURL string `json:"preview_source_url,omitempty"`
	SortOrder        int    `json:"sort_order"`
}

type AdStudioTemplateAdminView struct {
	AdStudioTemplatePublicView
	SystemPrompt string `json:"system_prompt"`
	IsPublished  bool   `json:"is_published"`
	HasPreview   bool   `json:"has_preview"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
}

type AdStudioTemplateWriteRequest struct {
	Title           string `json:"title"`
	Description     string `json:"description"`
	Category        string `json:"category"`
	MediaKind       string `json:"media_kind"`
	GenerationMode  string `json:"generation_mode"`
	AspectRatio     string `json:"aspect_ratio"`
	Duration        int    `json:"duration"`
	SystemPrompt    string `json:"system_prompt"`
	RequiresProduct *bool  `json:"requires_product"`
	RequiresAvatar  *bool  `json:"requires_avatar"`
	SortOrder       *int   `json:"sort_order"`
	IsPublished     *bool  `json:"is_published"`
}

type AdStudioGenerateRequest struct {
	ProductUploadID string `json:"product_upload_id"`
	AvatarUploadID  string `json:"avatar_upload_id,omitempty"`
	Edit            string `json:"edit"`
}

func AdStudioPreviewIsVideo(contentType string) bool {
	return strings.HasPrefix(strings.ToLower(strings.TrimSpace(contentType)), "video/")
}

func (t AdStudioTemplate) PreviewPath() string {
	if t.PreviewS3Key == "" {
		return ""
	}
	return "/ad-studio/templates/" + t.ID + "/preview"
}

func (t AdStudioTemplate) PreviewSourcePath() string {
	if t.PreviewS3Key == "" || !AdStudioPreviewIsVideo(t.PreviewContentType) {
		return ""
	}
	return "/ad-studio/templates/" + t.ID + "/preview/source"
}

func (t AdStudioTemplate) ToPublicView() AdStudioTemplatePublicView {
	previewKind := AdStudioMediaImage
	if AdStudioPreviewIsVideo(t.PreviewContentType) {
		previewKind = AdStudioMediaVideo
	}
	view := AdStudioTemplatePublicView{
		ID:              t.ID,
		Title:           t.Title,
		Description:     t.Description,
		Category:        t.Category,
		MediaKind:       t.MediaKind,
		GenerationMode:  t.GenerationMode,
		AspectRatio:     t.AspectRatio,
		Duration:        t.Duration,
		RequiresProduct: t.RequiresProduct,
		RequiresAvatar:  t.RequiresAvatar,
		PreviewKind:     previewKind,
		PreviewURL:      t.PreviewPath(),
		SortOrder:       t.SortOrder,
	}
	if previewKind == AdStudioMediaVideo {
		view.PreviewSourceURL = t.PreviewSourcePath()
	}
	return view
}

func (t AdStudioTemplate) ToAdminView() AdStudioTemplateAdminView {
	return AdStudioTemplateAdminView{
		AdStudioTemplatePublicView: t.ToPublicView(),
		SystemPrompt:               t.SystemPrompt,
		IsPublished:                t.IsPublished,
		HasPreview:                 t.PreviewS3Key != "",
		CreatedAt:                  t.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:                  t.UpdatedAt.UTC().Format(time.RFC3339),
	}
}
