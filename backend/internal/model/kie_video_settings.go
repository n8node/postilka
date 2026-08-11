package model

import (
	"math"
	"strings"
	"time"
)

const (
	KieVideoModeTextToVideo      = "text-to-video"
	KieVideoModeImageToVideo     = "image-to-video"
	KieVideoModeReferenceToVideo = "reference-to-video"

	KieVideoExampleMaxCount = 4

	// KieVideoFreeReferenceImages — first N input images are free per KIE billing.
	KieVideoFreeReferenceImages = 5
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
	CreditsPerSecondTextToVideo      int
	CreditsPerSecondImageToVideo     int
	CreditsPerSecondReferenceToVideo int
	CreditsPerExtraReferenceImage    int
	KopecksPerMediaCredit            int
	UpdatedAt                        time.Time
}

type KieVideoSettingsDTO struct {
	APIBaseURL                       string `json:"api_base_url"`
	APIKeySet                        bool   `json:"api_key_set"`
	ModelTextToVideo                 string `json:"model_text_to_video"`
	ModelImageToVideo                string `json:"model_image_to_video"`
	ModelReferenceToVideo            string `json:"model_reference_to_video"`
	DefaultDurationTextToVideo       int    `json:"default_duration_text_to_video"`
	DefaultDurationImageToVideo      int    `json:"default_duration_image_to_video"`
	DefaultDurationReferenceToVideo  int    `json:"default_duration_reference_to_video"`
	CreditsPerSecondTextToVideo      int    `json:"credits_per_second_text_to_video"`
	CreditsPerSecondImageToVideo     int    `json:"credits_per_second_image_to_video"`
	CreditsPerSecondReferenceToVideo int    `json:"credits_per_second_reference_to_video"`
	CreditsPerExtraReferenceImage    int    `json:"credits_per_extra_reference_image"`
	FreeReferenceImages              int    `json:"free_reference_images"`
	MediaCreditPriceRub              int    `json:"media_credit_price_rub"`
	UpdatedAt                        string `json:"updated_at,omitempty"`
}

type KieVideoUpdateRequest struct {
	APIBaseURL                       *string `json:"api_base_url"`
	APIKey                           *string `json:"api_key"`
	ModelTextToVideo                 *string `json:"model_text_to_video"`
	ModelImageToVideo                *string `json:"model_image_to_video"`
	ModelReferenceToVideo            *string `json:"model_reference_to_video"`
	DefaultDurationTextToVideo       *int    `json:"default_duration_text_to_video"`
	DefaultDurationImageToVideo      *int    `json:"default_duration_image_to_video"`
	DefaultDurationReferenceToVideo  *int    `json:"default_duration_reference_to_video"`
	CreditsPerSecondTextToVideo      *int    `json:"credits_per_second_text_to_video"`
	CreditsPerSecondImageToVideo     *int    `json:"credits_per_second_image_to_video"`
	CreditsPerSecondReferenceToVideo *int    `json:"credits_per_second_reference_to_video"`
	CreditsPerExtraReferenceImage    *int    `json:"credits_per_extra_reference_image"`
	MediaCreditPriceRub              *int    `json:"media_credit_price_rub"`
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

func (s KieVideoSettings) CreditsPerSecondForMode(mode string) int {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case KieVideoModeImageToVideo:
		return nonNegative(s.CreditsPerSecondImageToVideo)
	case KieVideoModeReferenceToVideo:
		return nonNegative(s.CreditsPerSecondReferenceToVideo)
	default:
		return nonNegative(s.CreditsPerSecondTextToVideo)
	}
}

// VideoGenerationCostInput describes billable inputs for a video generation request.
type VideoGenerationCostInput struct {
	Mode                   string
	OutputDurationSeconds  int
	InputImageCount        int
	InputVideoDurationSecs []float64
}

// VideoGenerationCostBreakdown is a user-visible cost estimate aligned with KIE billing.
type VideoGenerationCostBreakdown struct {
	OutputDurationSeconds     int `json:"output_duration_seconds"`
	InputVideoDurationSeconds int `json:"input_video_duration_seconds"`
	BillableSeconds           int `json:"billable_seconds"`
	RatePerSecond             int `json:"rate_per_second"`
	BaseCredits               int `json:"base_credits"`
	InputImageCount           int `json:"input_image_count"`
	FreeReferenceImages       int `json:"free_reference_images"`
	ExtraImageCount           int `json:"extra_image_count"`
	ExtraImageCredits         int `json:"extra_image_credits"`
	TotalCredits              int `json:"total_credits"`
}

// CreditCostForVideo returns total credits for output duration only (legacy/simple display).
func (s KieVideoSettings) CreditCostForVideo(mode string, durationSeconds int) int {
	return s.CreditCostForVideoRequest(VideoGenerationCostInput{
		Mode:                  mode,
		OutputDurationSeconds: durationSeconds,
	}).TotalCredits
}

// CreditCostForVideoRequest applies KIE formula:
// rate × (output + input video seconds) + extra image credits beyond free tier.
func (s KieVideoSettings) CreditCostForVideoRequest(in VideoGenerationCostInput) VideoGenerationCostBreakdown {
	outputSec := clampVideoDuration(in.OutputDurationSeconds)
	inputVideoSec := sumCeilVideoDurationSeconds(in.InputVideoDurationSecs)
	billableSec := outputSec + inputVideoSec
	rate := s.CreditsPerSecondForMode(in.Mode)
	baseCredits := 0
	if rate > 0 && billableSec > 0 {
		baseCredits = billableSec * rate
	}

	freeImages := KieVideoFreeReferenceImages
	inputImages := nonNegative(in.InputImageCount)
	extraImages := 0
	if inputImages > freeImages {
		extraImages = inputImages - freeImages
	}
	extraImageRate := nonNegative(s.CreditsPerExtraReferenceImage)
	extraImageCredits := extraImages * extraImageRate

	return VideoGenerationCostBreakdown{
		OutputDurationSeconds:     outputSec,
		InputVideoDurationSeconds: inputVideoSec,
		BillableSeconds:           billableSec,
		RatePerSecond:             rate,
		BaseCredits:               baseCredits,
		InputImageCount:           inputImages,
		FreeReferenceImages:       freeImages,
		ExtraImageCount:           extraImages,
		ExtraImageCredits:         extraImageCredits,
		TotalCredits:              baseCredits + extraImageCredits,
	}
}

func sumCeilVideoDurationSeconds(durations []float64) int {
	total := 0
	for _, d := range durations {
		if d <= 0 {
			continue
		}
		total += int(math.Ceil(d))
	}
	return total
}

func (s KieVideoSettings) WalletCostCents(creditCount int) int64 {
	if creditCount <= 0 || s.KopecksPerMediaCredit <= 0 {
		return 0
	}
	return int64(creditCount) * int64(s.KopecksPerMediaCredit)
}

func (s KieVideoSettings) WalletCostRub(creditCount int) int {
	return int(s.WalletCostCents(creditCount) / 100)
}

func (s KieVideoSettings) MediaCreditPriceRub() int {
	if s.KopecksPerMediaCredit <= 0 {
		return 50
	}
	rub := s.KopecksPerMediaCredit / 100
	if rub <= 0 {
		return 1
	}
	return rub
}

func (s *KieVideoSettings) SetMediaCreditPriceRub(rub int) {
	if rub <= 0 {
		rub = 1
	}
	s.KopecksPerMediaCredit = rub * 100
}

func nonNegative(n int) int {
	if n < 0 {
		return 0
	}
	return n
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
