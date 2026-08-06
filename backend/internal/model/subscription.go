package model

import "time"

type SubscriptionStatus string

const (
	SubscriptionStatusActive    SubscriptionStatus = "active"
	SubscriptionStatusPastDue   SubscriptionStatus = "past_due"
	SubscriptionStatusCancelled SubscriptionStatus = "cancelled"
)

type CheckoutKind string

const (
	CheckoutKindSubscribe CheckoutKind = "subscribe"
	CheckoutKindUpgrade   CheckoutKind = "upgrade"
	CheckoutKindRenew     CheckoutKind = "renew"
)

type WorkspaceSubscription struct {
	ID               string             `json:"id"`
	WorkspaceID      string             `json:"workspace_id"`
	PlanID           string             `json:"plan_id"`
	BillingPeriod    BillingPeriod      `json:"billing_period"`
	PeriodStart      time.Time          `json:"period_start"`
	PeriodEnd        time.Time          `json:"period_end"`
	BaseAmountCents  int                `json:"base_amount_cents"`
	AutoRenew        bool               `json:"auto_renew"`
	Status           SubscriptionStatus `json:"status"`
	LastCheckoutID   *string            `json:"last_checkout_id,omitempty"`
	CreatedAt        time.Time          `json:"created_at"`
	UpdatedAt        time.Time          `json:"updated_at"`
}

type SubscribePreview struct {
	PlanID            string        `json:"plan_id"`
	BillingPeriod     BillingPeriod `json:"billing_period"`
	ListPriceCents    int           `json:"list_price_cents"`
	ProrateCreditCents int          `json:"prorate_credit_cents"`
	AmountDueCents    int           `json:"amount_due_cents"`
	IsUpgrade         bool          `json:"is_upgrade"`
	CurrentPlanID     *string       `json:"current_plan_id,omitempty"`
	PeriodEnd         *time.Time    `json:"period_end,omitempty"`
}
