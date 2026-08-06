package service

import (
	"context"
	"errors"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

const (
	minCheckoutCents   = 100
	billingGracePeriod = 72 * time.Hour
)

type SubscriptionService struct {
	subs       *repository.SubscriptionRepository
	plans      *repository.PlanRepository
	workspaces *repository.WorkspaceRepository
}

func NewSubscriptionService(
	subs *repository.SubscriptionRepository,
	plans *repository.PlanRepository,
	workspaces *repository.WorkspaceRepository,
) *SubscriptionService {
	return &SubscriptionService{subs: subs, plans: plans, workspaces: workspaces}
}

func PeriodEndFromStart(start time.Time, period model.BillingPeriod) time.Time {
	switch period {
	case model.BillingPeriodYearly:
		return start.AddDate(1, 0, 0)
	default:
		return start.AddDate(0, 1, 0)
	}
}

func CalcProrateCredit(now, periodStart, periodEnd time.Time, paidAmountCents int) int {
	if paidAmountCents <= 0 || !now.Before(periodEnd) {
		return 0
	}
	total := periodEnd.Sub(periodStart)
	remaining := periodEnd.Sub(now)
	if total <= 0 || remaining <= 0 {
		return 0
	}
	return int(int64(paidAmountCents) * remaining.Milliseconds() / total.Milliseconds())
}

func (s *SubscriptionService) PreviewSubscribe(
	ctx context.Context,
	workspaceID, planID string,
	period model.BillingPeriod,
) (*model.SubscribePreview, error) {
	plan, err := s.plans.GetByID(ctx, planID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrPlanNotFound
		}
		return nil, err
	}
	listPrice, err := planPriceCents(plan, period)
	if err != nil {
		return nil, err
	}

	preview := &model.SubscribePreview{
		PlanID:         planID,
		BillingPeriod:  period,
		ListPriceCents: listPrice,
		AmountDueCents: listPrice,
	}

	active, err := s.subs.GetActiveForWorkspace(ctx, workspaceID)
	if errors.Is(err, repository.ErrNotFound) {
		return preview, nil
	}
	if err != nil {
		return nil, err
	}

	currentPlan, err := s.plans.GetByID(ctx, active.PlanID)
	if err != nil {
		return preview, nil
	}
	if currentPlan.IsFree {
		return preview, nil
	}

	credit := CalcProrateCredit(time.Now().UTC(), active.PeriodStart, active.PeriodEnd, active.BaseAmountCents)
	preview.ProrateCreditCents = credit
	preview.AmountDueCents = max(minCheckoutCents, listPrice-credit)
	if listPrice-credit <= 0 {
		preview.AmountDueCents = 0
	}
	if active.PlanID != planID {
		preview.IsUpgrade = true
	}
	pid := active.PlanID
	preview.CurrentPlanID = &pid
	end := active.PeriodEnd
	preview.PeriodEnd = &end

	return preview, nil
}

func (s *SubscriptionService) BuildCheckoutPricing(
	ctx context.Context,
	workspaceID, planID string,
	period model.BillingPeriod,
) (listPrice, prorateCredit, amountDue int, kind model.CheckoutKind, err error) {
	preview, err := s.PreviewsSubscribeOrError(ctx, workspaceID, planID, period)
	if err != nil {
		return 0, 0, 0, "", err
	}
	kind = model.CheckoutKindSubscribe
	if preview.IsUpgrade {
		kind = model.CheckoutKindUpgrade
	}
	active, _ := s.subs.GetActiveForWorkspace(ctx, workspaceID)
	if active != nil && active.PlanID == planID && time.Now().UTC().Before(active.PeriodEnd) {
		kind = model.CheckoutKindRenew
	}
	return preview.ListPriceCents, preview.ProrateCreditCents, preview.AmountDueCents, kind, nil
}

func (s *SubscriptionService) PreviewsSubscribeOrError(ctx context.Context, workspaceID, planID string, period model.BillingPeriod) (*model.SubscribePreview, error) {
	return s.PreviewSubscribe(ctx, workspaceID, planID, period)
}

func (s *SubscriptionService) ActivateImmediate(
	ctx context.Context,
	workspaceID, planID string,
	period model.BillingPeriod,
	listPrice, prorateCredit int,
	kind model.CheckoutKind,
	checkoutID *string,
) error {
	checkout := &model.PlanCheckout{
		WorkspaceID:        workspaceID,
		PlanID:             planID,
		BillingPeriod:      period,
		CheckoutKind:       kind,
		ListPriceCents:     listPrice,
		ProrateCreditCents: prorateCredit,
		AmountCents:        0,
	}
	if checkoutID != nil {
		checkout.ID = *checkoutID
	}
	return s.ActivateFromCheckout(ctx, checkout)
}

func (s *SubscriptionService) ActivateFromCheckout(ctx context.Context, checkout *model.PlanCheckout) error {
	now := time.Now().UTC()
	periodStart := now
	periodEnd := PeriodEndFromStart(periodStart, checkout.BillingPeriod)

	active, err := s.subs.GetActiveForWorkspace(ctx, checkout.WorkspaceID)
	if err == nil && checkout.CheckoutKind == model.CheckoutKindRenew && active.PlanID == checkout.PlanID {
		if now.Before(active.PeriodEnd) {
			periodStart = active.PeriodStart
			periodEnd = PeriodEndFromStart(active.PeriodEnd, checkout.BillingPeriod)
		}
	}

	checkoutID := checkout.ID
	var lastCheckout *string
	if checkoutID != "" {
		lastCheckout = &checkoutID
	}

	sub := &model.WorkspaceSubscription{
		WorkspaceID:     checkout.WorkspaceID,
		PlanID:          checkout.PlanID,
		BillingPeriod:   checkout.BillingPeriod,
		PeriodStart:     periodStart,
		PeriodEnd:       periodEnd,
		BaseAmountCents: checkout.ListPriceCents,
		AutoRenew:       true,
		Status:          model.SubscriptionStatusActive,
		LastCheckoutID:  lastCheckout,
	}

	if _, err := s.subs.UpsertActive(ctx, sub); err != nil {
		return err
	}
	return s.workspaces.SetPlanWithPeriod(ctx, checkout.WorkspaceID, checkout.PlanID, periodStart)
}

func (s *SubscriptionService) ActivateWalletRenewal(
	ctx context.Context,
	sub *model.WorkspaceSubscription,
	amountCents int,
) error {
	now := time.Now().UTC()
	periodStart := sub.PeriodStart
	periodEnd := sub.PeriodEnd
	if now.Before(sub.PeriodEnd) {
		periodEnd = PeriodEndFromStart(sub.PeriodEnd, sub.BillingPeriod)
	} else {
		periodStart = now
		periodEnd = PeriodEndFromStart(now, sub.BillingPeriod)
	}

	if err := s.subs.UpdatePeriod(ctx, sub.ID, periodStart, periodEnd, amountCents, sub.LastCheckoutID); err != nil {
		return err
	}
	return s.workspaces.SetPlanWithPeriod(ctx, sub.WorkspaceID, sub.PlanID, periodStart)
}

func (s *SubscriptionService) SetAutoRenew(ctx context.Context, workspaceID string, autoRenew bool) (*model.WorkspaceSubscription, error) {
	return s.subs.SetAutoRenew(ctx, workspaceID, autoRenew)
}

func (s *SubscriptionService) CancelForWorkspace(ctx context.Context, workspaceID string) error {
	return s.subs.CancelForWorkspace(ctx, workspaceID)
}

func (s *SubscriptionService) GetActive(ctx context.Context, workspaceID string) (*model.WorkspaceSubscription, error) {
	return s.subs.GetActiveForWorkspace(ctx, workspaceID)
}

func (s *SubscriptionService) PeriodStartForUsage(ctx context.Context, workspaceID string, fallback time.Time) time.Time {
	sub, err := s.subs.GetActiveForWorkspace(ctx, workspaceID)
	if err != nil {
		return fallback.UTC()
	}
	return sub.PeriodStart.UTC()
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
