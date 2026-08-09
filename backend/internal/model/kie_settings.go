package model

import (
	"strings"
	"time"
)

type KieSettings struct {
	APIBaseURL            string
	APIKey                string
	ModelTextToImage      string
	ModelImageToImage     string
	ModelCombine          string
	ModelFilter           string
	TokenCostTextToImage  int
	TokenCostImageToImage int
	TokenCostCombine      int
	TokenCostFilter       int
	KopecksPerMediaCredit int
	UpdatedAt             time.Time
}

type KieSettingsDTO struct {
	APIBaseURL            string `json:"api_base_url"`
	APIKeySet             bool   `json:"api_key_set"`
	ModelTextToImage      string `json:"model_text_to_image"`
	ModelImageToImage     string `json:"model_image_to_image"`
	ModelCombine          string `json:"model_combine"`
	ModelFilter           string `json:"model_filter"`
	TokenCostTextToImage  int    `json:"token_cost_text_to_image"`
	TokenCostImageToImage int    `json:"token_cost_image_to_image"`
	TokenCostCombine      int    `json:"token_cost_combine"`
	TokenCostFilter       int    `json:"token_cost_filter"`
	KopecksPerMediaCredit int    `json:"kopecks_per_media_credit"`
	UpdatedAt             string `json:"updated_at,omitempty"`
}

type KieModelView struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Category string `json:"category"`
}

type KieTestRequest struct {
	APIBaseURL string `json:"api_base_url,omitempty"`
	APIKey     string `json:"api_key,omitempty"`
}

type KieTestResult struct {
	OK               bool           `json:"ok"`
	Models           []KieModelView `json:"models,omitempty"`
	CreditsRemaining float64        `json:"credits_remaining,omitempty"`
	Message          string         `json:"message,omitempty"`
}

type KieUpdateRequest struct {
	APIBaseURL            *string `json:"api_base_url"`
	APIKey                *string `json:"api_key"`
	ModelTextToImage      *string `json:"model_text_to_image"`
	ModelImageToImage     *string `json:"model_image_to_image"`
	ModelCombine          *string `json:"model_combine"`
	ModelFilter           *string `json:"model_filter"`
	TokenCostTextToImage  *int    `json:"token_cost_text_to_image"`
	TokenCostImageToImage *int    `json:"token_cost_image_to_image"`
	TokenCostCombine      *int    `json:"token_cost_combine"`
	TokenCostFilter       *int    `json:"token_cost_filter"`
	KopecksPerMediaCredit *int    `json:"kopecks_per_media_credit"`
}

func (s KieSettings) TokenCostForGenerationMode(mode string) int {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case "image-to-image":
		return positiveOrOne(s.TokenCostImageToImage)
	case "combine":
		return positiveOrOne(s.TokenCostCombine)
	default:
		return positiveOrOne(s.TokenCostTextToImage)
	}
}

func (s KieSettings) TokenCostFilterOrDefault() int {
	return positiveOrOne(s.TokenCostFilter)
}

func positiveOrOne(n int) int {
	if n > 0 {
		return n
	}
	return 1
}

// WalletCostCents returns ruble charge for creditCount units at configured price.
func (s KieSettings) WalletCostCents(creditCount int) int64 {
	if creditCount <= 0 || s.KopecksPerMediaCredit <= 0 {
		return 0
	}
	return int64(creditCount) * int64(s.KopecksPerMediaCredit)
}

func (s KieSettings) MediaCreditPriceRub() float64 {
	if s.KopecksPerMediaCredit <= 0 {
		return 50
	}
	return float64(s.KopecksPerMediaCredit) / 100.0
}
