package model

import "time"

const (
	PublicPageCategoryInstruction = "instruction"
	PublicPageCategoryHelpCenter  = "help_center"
	PublicPageCategoryLegal       = "legal"
	PublicPageCategoryOther       = "other"
)

// PublicPage is an admin-managed metadata record for external help/legal pages.
type PublicPage struct {
	ID              string    `json:"id"`
	Title           string    `json:"title"`
	Slug            string    `json:"slug"`
	MetaDescription string    `json:"meta_description"`
	ExternalURL     string    `json:"external_url"`
	Category        string    `json:"category"`
	Provider        *string   `json:"provider"`
	IsPublished     bool      `json:"is_published"`
	SortOrder       int       `json:"sort_order"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}
