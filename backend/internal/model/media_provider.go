package model

import "time"

type MediaProvider struct {
	ID           string
	DisplayName  string
	APIBaseURL   string
	APIKeySet    bool
	Enabled      bool
	TestOnly     bool
	Capabilities []string
	Settings     map[string]any
	UpdatedAt    time.Time
}

type MediaProviderModel struct {
	ID          string         `json:"id"`
	ProviderID  string         `json:"provider_id"`
	ModelID     string         `json:"model_id"`
	DisplayName string         `json:"display_name"`
	MediaType   string         `json:"media_type"`
	Operation   string         `json:"operation"`
	Enabled     bool           `json:"enabled"`
	IsDefault   bool           `json:"is_default"`
	Parameters  map[string]any `json:"parameters"`
	SortOrder   int            `json:"sort_order"`
}

type MediaProviderPricing struct {
	ID               string `json:"id"`
	ProviderID       string `json:"provider_id"`
	ModelID          string `json:"model_id"`
	MediaType        string `json:"media_type"`
	Operation        string `json:"operation"`
	BillingUnit      string `json:"billing_unit"`
	CreditCost       int    `json:"credit_cost"`
	CostPerSecond    int    `json:"cost_per_second"`
	CostPerReference int    `json:"cost_per_reference"`
	Enabled          bool   `json:"enabled"`
}

type MediaProviderRoute struct {
	MediaType  string `json:"media_type"`
	ProviderID string `json:"provider_id"`
	Priority   int    `json:"priority"`
	Enabled    bool   `json:"enabled"`
}

type MediaProviderView struct {
	ID           string   `json:"id"`
	DisplayName  string   `json:"display_name"`
	APIBaseURL   string   `json:"api_base_url"`
	APIKeySet    bool     `json:"api_key_set"`
	Enabled      bool     `json:"enabled"`
	TestOnly     bool     `json:"test_only"`
	Capabilities []string `json:"capabilities"`
	UpdatedAt    string   `json:"updated_at,omitempty"`
}

type MediaProviderUpdateRequest struct {
	DisplayName  *string   `json:"display_name"`
	APIBaseURL   *string   `json:"api_base_url"`
	APIKey       *string   `json:"api_key"`
	Enabled      *bool     `json:"enabled"`
	TestOnly     *bool     `json:"test_only"`
	Capabilities *[]string `json:"capabilities"`
}

type MediaProviderRoutesUpdateRequest struct {
	Routes []MediaProviderRoute `json:"routes"`
}
