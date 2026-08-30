package model

import "time"

const (
	GenerationNavIconLucide = "lucide"
	GenerationNavIconUpload = "upload"
)

type GenerationNavSettings struct {
	Title        string `json:"title"`
	StudioHref   string `json:"studio_href"`
	MoreHref     string `json:"more_href"`
	PreviewLimit int    `json:"preview_limit"`
}

type GenerationNavItem struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Subtitle  string    `json:"subtitle"`
	Href      string    `json:"href"`
	Position  int       `json:"position"`
	Visible   bool      `json:"visible"`
	Featured  bool      `json:"featured"`
	IconKind  string    `json:"icon_kind"`
	IconName  string    `json:"icon_name"`
	IconURL   string    `json:"icon_url,omitempty"`
	S3Key     string    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type GenerationNavView struct {
	Settings GenerationNavSettings `json:"settings"`
	Items    []GenerationNavItem   `json:"items"`
}

type GenerationNavItemWrite struct {
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
	Href     string `json:"href"`
	Position *int   `json:"position"`
	Visible  *bool  `json:"visible"`
	Featured *bool  `json:"featured"`
	IconKind string `json:"icon_kind"`
	IconName string `json:"icon_name"`
}

type GenerationNavSettingsWrite struct {
	Title        string `json:"title"`
	StudioHref   string `json:"studio_href"`
	MoreHref     string `json:"more_href"`
	PreviewLimit int    `json:"preview_limit"`
}

type GenerationNavReorderRequest struct {
	IDs []string `json:"ids"`
}

func DefaultGenerationNavSettings() GenerationNavSettings {
	return GenerationNavSettings{
		Title:        "Генерация",
		StudioHref:   "/ai",
		MoreHref:     "/ai",
		PreviewLimit: 8,
	}
}

func GenerationNavIconAPIPath(id string, updatedAt time.Time) string {
	path := "/generation-nav/items/" + id + "/icon"
	if updatedAt.IsZero() {
		return path
	}
	return path + "?v=" + updatedAt.Format("20060102150405")
}
