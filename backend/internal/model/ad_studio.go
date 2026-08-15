package model

import "time"

const (
	AdStudioCategoryProductShot = "product_shot"
	AdStudioCategoryMotion      = "motion"
	AdStudioCategoryUGC         = "ugc"
	AdStudioCategoryAds         = "ads"
	AdStudioCategoryPosters     = "posters"
	AdStudioCategoryMarketplace = "marketplace"

	AdStudioMediaImage = "image"
	AdStudioMediaVideo = "video"
)

type AdStudioTemplate struct {
	ID                 string
	Title              string
	Description        string
	Category           string
	MediaKind          string
	AspectRatio        string
	Duration           int
	SystemPrompt       string
	PreviewS3Key       string
	PreviewContentType string
	RequiresProduct    bool
	RequiresAvatar     bool
	SortOrder          int
	IsPublished        bool
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

type AdStudioTemplatePublicView struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	Description     string `json:"description"`
	Category        string `json:"category"`
	MediaKind       string `json:"media_kind"`
	AspectRatio     string `json:"aspect_ratio"`
	Duration        int    `json:"duration"`
	RequiresProduct bool   `json:"requires_product"`
	RequiresAvatar  bool   `json:"requires_avatar"`
	PreviewURL      string `json:"preview_url,omitempty"`
	SortOrder       int    `json:"sort_order"`
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

func (t AdStudioTemplate) PreviewPath() string {
	if t.PreviewS3Key == "" {
		return ""
	}
	return "/ad-studio/templates/" + t.ID + "/preview"
}

func (t AdStudioTemplate) ToPublicView() AdStudioTemplatePublicView {
	return AdStudioTemplatePublicView{
		ID:              t.ID,
		Title:           t.Title,
		Description:     t.Description,
		Category:        t.Category,
		MediaKind:       t.MediaKind,
		AspectRatio:     t.AspectRatio,
		Duration:        t.Duration,
		RequiresProduct: t.RequiresProduct,
		RequiresAvatar:  t.RequiresAvatar,
		PreviewURL:      t.PreviewPath(),
		SortOrder:       t.SortOrder,
	}
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
