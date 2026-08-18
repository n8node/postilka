package model

import "time"

type TokenPackage struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Tokens     int       `json:"tokens"`
	PriceCents int       `json:"price_cents"`
	SortOrder  int       `json:"sort_order"`
	IsActive   bool      `json:"is_active"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type TokenPackageCheckout struct {
	ID          string         `json:"id"`
	UserID      string         `json:"user_id"`
	PackageID   string         `json:"package_id"`
	Provider    string         `json:"provider"`
	AmountCents int            `json:"amount_cents"`
	Tokens      int            `json:"tokens"`
	Status      CheckoutStatus `json:"status"`
	ExternalID  *string        `json:"external_id,omitempty"`
	InvID       *int64         `json:"inv_id,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	PaidAt      *time.Time     `json:"paid_at,omitempty"`
}

type TokenBalanceView struct {
	TotalRemaining           int    `json:"total_remaining"`
	PlanTokensRemaining      int    `json:"plan_tokens_remaining"`
	PurchasedTokensRemaining int    `json:"purchased_tokens_remaining"`
	PlanTokensAllowance      *int   `json:"plan_tokens_allowance,omitempty"`
	PlanPeriodEnd            string `json:"plan_period_end,omitempty"`
	Unlimited                bool   `json:"unlimited"`
}

type TokenPackageUpsert struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Tokens     int    `json:"tokens"`
	PriceCents int    `json:"price_cents"`
	SortOrder  int    `json:"sort_order"`
	IsActive   bool   `json:"is_active"`
}
