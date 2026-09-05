package model

import "time"

const (
	GenJobStatusPreparing  = "preparing"
	GenJobStatusWaiting    = "waiting"
	GenJobStatusQueuing    = "queuing"
	GenJobStatusGenerating = "generating"
	GenJobStatusSucceeded  = "succeeded"
	GenJobStatusFailed     = "failed"
)

type AIGenerationJob struct {
	ID                      string
	UserID                  string
	WorkspaceID             string
	KieTaskID               string
	Status                  string
	KieState                string
	Progress                int
	FailMessage             string
	Mode                    string
	Prompt                  string
	Model                   string
	AspectRatio             string
	SourceUploadID          string
	LastFrameUploadID       string
	CombineUploadIDs        []string
	ReferenceUploadIDs      []string
	ReferenceVideoUploadIDs []string
	ReferenceAudioUploadIDs []string
	VideoDurationSeconds    int
	CreditCost              int
	QuotaCreditsUsed        int
	WalletCentsCharged      int
	DurationMs              int
	GenerationID            *string
	PollAfter               time.Time
	LastPolledAt            *time.Time
	LeaseOwner              string
	LeaseUntil              *time.Time
	Attempts                int
	LastError               string
	CreatedAt               time.Time
	UpdatedAt               time.Time
}

type AIGenerationJobView struct {
	ID                   string            `json:"id"`
	Status               string            `json:"status"`
	KieState             string            `json:"kie_state"`
	Progress             int               `json:"progress"`
	Mode                 string            `json:"mode,omitempty"`
	CreditCost           int               `json:"credit_cost,omitempty"`
	TokenCost            int               `json:"token_cost,omitempty"` // alias for frontend compat
	ElapsedMs            int               `json:"elapsed_ms,omitempty"`
	DurationMs           int               `json:"duration_ms,omitempty"`
	FailMessage          string            `json:"fail_message,omitempty"`
	Generation           *AIGenerationView `json:"generation,omitempty"`
	VideoDurationSeconds int               `json:"video_duration_seconds,omitempty"`
}

type VideoGenerationPricingView struct {
	TextToVideo                   int     `json:"text_to_video"`
	ImageToVideo                  int     `json:"image_to_video"`
	ReferenceToVideo              int     `json:"reference_to_video"`
	CreditsPerSecondText          int     `json:"credits_per_second_text_to_video"`
	CreditsPerSecondImage         int     `json:"credits_per_second_image_to_video"`
	CreditsPerSecondReference     int     `json:"credits_per_second_reference_to_video"`
	CreditsPerExtraReferenceImage int     `json:"credits_per_extra_reference_image"`
	FreeReferenceImages           int     `json:"free_reference_images"`
	DefaultDurationText           int     `json:"default_duration_text_to_video"`
	DefaultDurationImage          int     `json:"default_duration_image_to_video"`
	DefaultDurationReference      int     `json:"default_duration_reference_to_video"`
	MediaCreditPriceRub           float64 `json:"media_credit_price_rub"`
	CreditsRemaining              *int    `json:"credits_remaining,omitempty"`
	Unlimited                     bool    `json:"unlimited,omitempty"`
}

type GenerationPricingView struct {
	TextToImage           int     `json:"text_to_image"`
	ImageToImage          int     `json:"image_to_image"`
	Combine               int     `json:"combine"`
	MediaCreditPriceRub   float64 `json:"media_credit_price_rub"`
	TextToImageWalletRub  float64 `json:"text_to_image_wallet_rub"`
	ImageToImageWalletRub float64 `json:"image_to_image_wallet_rub"`
	CombineWalletRub      float64 `json:"combine_wallet_rub"`
	CreditsRemaining      *int    `json:"credits_remaining,omitempty"`
	Unlimited             bool    `json:"unlimited,omitempty"`
}

// TextGenerationPricingView is the cabinet-facing Yandex GPT rate for workflow/composer estimates.
type TextGenerationPricingView struct {
	InputPer1K  float64 `json:"input_per_1k"`
	OutputPer1K float64 `json:"output_per_1k"`
	Currency    string  `json:"currency"`
}

type MediaCreditsRemainingView struct {
	QuotaRemaining   *int    `json:"quota_remaining,omitempty"`
	PurchasedCredits int     `json:"purchased_credits"`
	WalletCredits    int     `json:"wallet_credits"`
	TotalAvailable   int     `json:"total_available"` // quota + purchased packages; wallet ₽ are not converted
	Unlimited        bool    `json:"unlimited"`
	WalletBalanceRub float64 `json:"wallet_balance_rub"`
}
