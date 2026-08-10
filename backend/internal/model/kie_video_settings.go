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
	APIBaseURL                       string
	APIKey                           string
	ModelTextToVideo                 string
	ModelImageToVideo                string
	ModelReferenceToVideo            string
	DefaultDurationTextToVideo       int
	DefaultDurationImageToVideo      int
	DefaultDurationReferenceToVideo  int
	KopecksPerVideoSecond            int
	KopecksPerReferenceVideoSecond   int
	UpdatedAt                        time.Time
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
	KopecksPerVideoSecond           int    `json:"kopecks_per_video_second"`
	KopecksPerReferenceVideoSecond  int    `json:"kopecks_per_reference_video_second"`
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
	KopecksPerVideoSecond           *int    `json:"kopecks_per_video_second"`
	KopecksPerReferenceVideoSecond  *int    `json:"kopecks_per_reference_video_second"`
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

func (s KieVideoSettings) KopecksPerSecondForMode(mode string) int {
	if strings.EqualFold(strings.TrimSpace(mode), KieVideoModeReferenceToVideo) {
		return positiveOrOne(s.KopecksPerReferenceVideoSecond)
	}
	return positiveOrOne(s.KopecksPerVideoSecond)
}

func (s KieVideoSettings) CostCentsForDuration(mode string, durationSec int) int64 {
	if durationSec <= 0 {
		return 0
	}
	return int64(durationSec) * int64(s.KopecksPerSecondForMode(mode))
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
