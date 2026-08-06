package model

import "time"

type CheckoutStatus string

const (
	CheckoutStatusPending CheckoutStatus = "pending"
	CheckoutStatusPaid    CheckoutStatus = "paid"
	CheckoutStatusFailed  CheckoutStatus = "failed"
)

type BillingPeriod string

const (
	BillingPeriodMonthly BillingPeriod = "monthly"
	BillingPeriodYearly  BillingPeriod = "yearly"
)

type PlanCheckout struct {
	ID                 string         `json:"id"`
	UserID             string         `json:"user_id"`
	WorkspaceID        string         `json:"workspace_id"`
	PlanID             string         `json:"plan_id"`
	Provider           string         `json:"provider"`
	BillingPeriod      BillingPeriod  `json:"billing_period"`
	CheckoutKind       CheckoutKind   `json:"checkout_kind"`
	ListPriceCents     int            `json:"list_price_cents"`
	ProrateCreditCents int            `json:"prorate_credit_cents"`
	AmountCents        int            `json:"amount_cents"`
	Status             CheckoutStatus `json:"status"`
	ExternalID         *string        `json:"external_id,omitempty"`
	InvID              *int64         `json:"inv_id,omitempty"`
	CreatedAt          time.Time      `json:"created_at"`
	PaidAt             *time.Time     `json:"paid_at,omitempty"`
}

type WalletTopup struct {
	ID          string         `json:"id"`
	UserID      string         `json:"user_id"`
	Provider    string         `json:"provider"`
	AmountCents int            `json:"amount_cents"`
	Status      CheckoutStatus `json:"status"`
	ExternalID  *string        `json:"external_id,omitempty"`
	InvID       *int64         `json:"inv_id,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	PaidAt      *time.Time     `json:"paid_at,omitempty"`
}

type WalletLedgerEntry struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	AmountCents   int64     `json:"amount_cents"`
	EntryType     string    `json:"entry_type"`
	ReferenceType *string   `json:"reference_type,omitempty"`
	ReferenceID   *string   `json:"reference_id,omitempty"`
	Description   string    `json:"description"`
	CreatedAt     time.Time `json:"created_at"`
}

type CheckoutResult struct {
	CheckoutID  string `json:"checkout_id"`
	Kind        string `json:"kind"`
	Provider    string `json:"provider"`
	CheckoutURL string `json:"checkout_url"`
}

type BillingOverview struct {
	PaymentsEnabled     bool                   `json:"payments_enabled"`
	ActiveProvider      string                 `json:"active_provider,omitempty"`
	WorkspaceID         string                 `json:"workspace_id"`
	Plan                *Plan                  `json:"plan,omitempty"`
	PlanAssignedAt      *time.Time             `json:"plan_assigned_at,omitempty"`
	Subscription        *WorkspaceSubscription `json:"subscription,omitempty"`
	Usage               BillingUsage           `json:"usage"`
	WalletBalanceCents  int64                  `json:"wallet_balance_cents"`
	WalletTopupMinCents int                    `json:"wallet_topup_min_cents"`
	WalletTopupMaxCents int                    `json:"wallet_topup_max_cents"`
}

type BillingUsage struct {
	ChannelsUsed      int  `json:"channels_used"`
	PostsUsed         int  `json:"posts_used"`
	AITextTokensUsed  int  `json:"ai_text_tokens_used"`
	AIMediaCreditsUsed int `json:"ai_media_credits_used"`
	PeriodStart       string `json:"period_start"`
}

type PaymentHistoryItem struct {
	ID          string    `json:"id"`
	Kind        string    `json:"kind"`
	AmountCents int       `json:"amount_cents"`
	Status      string    `json:"status"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	PaidAt      *time.Time `json:"paid_at,omitempty"`
}
