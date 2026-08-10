package model

import (
	"strings"
	"time"
)

const (
	KieVideoModeTextToVideo      = "text-to-video"
	KieVideoModeImageToVideo     = "image-to-video"
	KieVideoModeReferenceToVideo = "reference-to-video"

	KieVideoExampleMaxCount = 4
)

var KieVideoAspectRatios = []string{"9:16", "21:9", "16:9", "4:3", "1:1", "3:4"}

type KieVideoSettings struct {
	APIBaseURL                      string
	APIKey                          string
	ModelTextToVideo                string
	ModelImageToVideo               string
	ModelReferenceToVideo           string
	DefaultDurationTextToVideo      int
	DefaultDurationImageToVideo     int
	DefaultDurationReferenceToVideo int
	TokenCostTextToVideo            int
	TokenCostImageToVideo           int
	TokenCostReferenceToVideo       int
	KopecksPerMediaCredit           int
	UpdatedAt                       time.Time
}

type KieVideoSettingsDTO struct {
	APIBaseURL                      string `json:"api_base_url"`
	APIKeySet                       bool   `json:"api_key_set"`
	ModelTextToVideo                string `json:"model_text_to_video"`
	ModelImageToVideo               string `json:"model_image_to_video"`
	ModelReferenceToVideo           string `json:"model_reference_to_video"`
	DefaultDurationTextToVideo      int    `json:"default_duration_text_to_video"`
	DefaultDurationImageToVideo     int    `json:"default_duration_image_to_video"`
	DefaultDurationReferenceToVideo int    `json:"default_duration_reference_to_video"`
	TokenCostTextToVideo            int    `json:"token_cost_text_to_video"`
	TokenCostImageToVideo           int    `json:"token_cost_image_to_video"`
	TokenCostReferenceToVideo       int    `json:"token_cost_reference_to_video"`
	KopecksPerMediaCredit           int    `json:"kopecks_per_media_credit"`
	UpdatedAt                       string `json:"updated_at,omitempty"`
}

type KieVideoUpdateRequest struct {
	APIBaseURL                      *string `json:"api_base_url"`
	APIKey                          *string `json:"api_key"`
	ModelTextToVideo                *string `json:"model_text_to_video"`
	ModelImageToVideo               *string `json:"model_image_to_video"`
	ModelReferenceToVideo           *string `json:"model_reference_to_video"`
	DefaultDurationTextToVideo      *int    `json:"default_duration_text_to_video"`
	DefaultDurationImageToVideo     *int    `json:"default_duration_image_to_video"`
	DefaultDurationReferenceToVideo *int    `json:"default_duration_reference_to_video"`
	TokenCostTextToVideo            *int    `json:"token_cost_text_to_video"`
	TokenCostImageToVideo           *int    `json:"token_cost_image_to_video"`
	TokenCostReferenceToVideo       *int    `json:"token_cost_reference_to_video"`
	KopecksPerMediaCredit           *int    `json:"kopecks_per_media_credit"`
}

type KieVideoTestRequest struct {
	APIBaseURL string `json:"api_base_url,omitempty"`
	APIKey     string `json:"api_key,omitempty"`
}

type KieVideoTestResult struct {
	OK               bool           `json:"ok"`
	Models           []KieModelView `json:"models,omitempty"`
	CreditsRemaining float64        `json:"credits_remaining,omitempty"`
	Message          string         `json:"message,omitempty"`
}

func (s KieVideoSettings) DefaultDurationForMode(mode string) int {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case KieVideoModeImageToVideo:
		return clampVideoDuration(s.DefaultDurationImageToVideo)
	case KieVideoModeReferenceToVideo:
		return clampVideoDuration(s.DefaultDurationReferenceToVideo)
	default:
		return clampVideoDuration(s.DefaultDurationTextToVideo)
	}
}

func (s KieVideoSettings) ModelForMode(mode string) string {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case KieVideoModeImageToVideo:
		return strings.TrimSpace(s.ModelImageToVideo)
	case KieVideoModeReferenceToVideo:
		return strings.TrimSpace(s.ModelReferenceToVideo)
	default:
		return strings.TrimSpace(s.ModelTextToVideo)
	}
}

func (s KieVideoSettings) TokenCostForVideoMode(mode string) int {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case KieVideoModeImageToVideo:
		return positiveOrOne(s.TokenCostImageToVideo)
	case KieVideoModeReferenceToVideo:
		return positiveOrOne(s.TokenCostReferenceToVideo)
	default:
		return positiveOrOne(s.TokenCostTextToVideo)
	}
}

func (s KieVideoSettings) WalletCostCents(creditCount int) int64 {
	if creditCount <= 0 || s.KopecksPerMediaCredit <= 0 {
		return 0
	}
	return int64(creditCount) * int64(s.KopecksPerMediaCredit)
}

func (s KieVideoSettings) MediaCreditPriceRub() float64 {
	if s.KopecksPerMediaCredit <= 0 {
		return 50
	}
	return float64(s.KopecksPerMediaCredit) / 100.0
}

func clampVideoDuration(n int) int {
	if n < 4 {
		return 4
	}
	if n > 15 {
		return 15
	}
	return n
}

func NormalizeVideoAspectRatio(ratio string) string {
	ratio = strings.TrimSpace(ratio)
	for _, allowed := range KieVideoAspectRatios {
		if ratio == allowed {
			return ratio
		}
	}
	return "16:9"
}
