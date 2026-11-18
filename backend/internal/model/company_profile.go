package model

import "time"

type CompanyProfile struct {
	ID               string    `json:"id"`
	WorkspaceID      string    `json:"workspace_id"`
	Name             string    `json:"name"`
	CompanyName      string    `json:"company_name"`
	Industry         string    `json:"industry"`
	Description      string    `json:"description"`
	Website          string    `json:"website"`
	TargetAudience   string    `json:"target_audience"`
	Tone             string    `json:"tone"`
	TextInstructions string    `json:"text_instructions"`
	BannedWords      string    `json:"banned_words"`
	BrandColor       string    `json:"brand_color"`
	VisualStyle      string    `json:"visual_style"`
	VisualAvoid      string    `json:"visual_avoid"`
	IsDefault        bool      `json:"is_default"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type CompanyProfileInput struct {
	Name             string `json:"name"`
	CompanyName      string `json:"company_name"`
	Industry         string `json:"industry"`
	Description      string `json:"description"`
	Website          string `json:"website"`
	TargetAudience   string `json:"target_audience"`
	Tone             string `json:"tone"`
	TextInstructions string `json:"text_instructions"`
	BannedWords      string `json:"banned_words"`
	BrandColor       string `json:"brand_color"`
	VisualStyle      string `json:"visual_style"`
	VisualAvoid      string `json:"visual_avoid"`
	IsDefault        bool   `json:"is_default"`
}
