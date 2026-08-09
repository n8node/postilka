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
	ID                 string
	UserID             string
	WorkspaceID        string
	KieTaskID          string
	Status             string
	KieState           string
	Progress           int
	FailMessage        string
	Mode               string
	Prompt             string
	Model              string
	AspectRatio        string
	SourceUploadID     string
	CombineUploadIDs   []string
	CreditCost         int
	WalletCentsCharged int
	DurationMs         int
	GenerationID       *string
	PollAfter          time.Time
	LastPolledAt       *time.Time
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

type AIGenerationJobView struct {
	ID          string            `json:"id"`
	Status      string            `json:"status"`
	KieState    string            `json:"kie_state"`
	Progress    int               `json:"progress"`
	Mode        string            `json:"mode,omitempty"`
	CreditCost  int               `json:"credit_cost,omitempty"`
	TokenCost   int               `json:"token_cost,omitempty"` // alias for frontend compat
	ElapsedMs   int               `json:"elapsed_ms,omitempty"`
	DurationMs  int               `json:"duration_ms,omitempty"`
	FailMessage string            `json:"fail_message,omitempty"`
	Generation  *AIGenerationView `json:"generation,omitempty"`
}

type GenerationPricingView struct {
	TextToImage        int     `json:"text_to_image"`
	ImageToImage       int     `json:"image_to_image"`
	Combine            int     `json:"combine"`
	MediaCreditPriceRub float64 `json:"media_credit_price_rub"`
	TextToImageWalletRub float64 `json:"text_to_image_wallet_rub"`
	ImageToImageWalletRub float64 `json:"image_to_image_wallet_rub"`
	CombineWalletRub   float64 `json:"combine_wallet_rub"`
	CreditsRemaining   *int    `json:"credits_remaining,omitempty"`
	Unlimited          bool    `json:"unlimited,omitempty"`
}

type MediaCreditsRemainingView struct {
	QuotaRemaining   *int  `json:"quota_remaining,omitempty"`
	WalletCredits    int   `json:"wallet_credits"`
	TotalAvailable   int   `json:"total_available"`
	Unlimited        bool  `json:"unlimited"`
	WalletBalanceRub float64 `json:"wallet_balance_rub"`
}
