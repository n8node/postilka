package model

import "time"

// Plan is a subscription tariff (entitlements live on the plan; assigned to workspace).
type Plan struct {
	ID                    string    `json:"id"`
	Slug                  string    `json:"slug"`
	Name                  string    `json:"name"`
	Description           string    `json:"description"`
	IsFree                bool      `json:"is_free"`
	IsActive              bool      `json:"is_active"`
	IsPopular             bool      `json:"is_popular"`
	PriceMonthlyCents     *int      `json:"price_monthly_cents"`
	PriceYearlyCents      *int      `json:"price_yearly_cents"`
	MaxChannels           *int      `json:"max_channels"`
	MaxPostsPerPeriod     *int      `json:"max_posts_per_period"`
	MaxSeats              *int      `json:"max_seats"`
	StorageBytes          *int64    `json:"storage_bytes"`
	TrashRetentionDays    int       `json:"trash_retention_days"`
	AITextTokensQuota     *int      `json:"ai_text_tokens_quota"`
	AIMediaCreditsQuota   *int      `json:"ai_media_credits_quota"`
	FreePlanDurationDays  *int      `json:"free_plan_duration_days"`
	SortOrder             int       `json:"sort_order"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

// AdminUserPlan is a compact plan view for admin user lists.
type AdminUserPlan struct {
	ID     string `json:"id"`
	Slug   string `json:"slug"`
	Name   string `json:"name"`
	IsFree bool   `json:"is_free"`
}
