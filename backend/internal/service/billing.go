package service

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

type BillingService struct {
	plans      *repository.PlanRepository
	workspaces *repository.WorkspaceRepository
	wallet     *repository.WalletRepository
	checkouts  *repository.PlanCheckoutRepository
	pkgCheckouts *repository.TokenPackageCheckoutRepository
	packages   *repository.TokenPackageRepository
	payments   *PaymentSettingsService
	quota      *QuotaService
	subSvc     *SubscriptionService
	wsSvc      *WorkspaceService
	tokenBal   *TokenBalanceService
}

func NewBillingService(
	plans *repository.PlanRepository,
	workspaces *repository.WorkspaceRepository,
	wallet *repository.WalletRepository,
	checkouts *repository.PlanCheckoutRepository,
	pkgCheckouts *repository.TokenPackageCheckoutRepository,
	packages *repository.TokenPackageRepository,
	payments *PaymentSettingsService,
	quota *QuotaService,
	subSvc *SubscriptionService,
	wsSvc *WorkspaceService,
	tokenBal *TokenBalanceService,
) *BillingService {
	return &BillingService{
		plans:        plans,
		workspaces:   workspaces,
		wallet:       wallet,
		checkouts:    checkouts,
		pkgCheckouts: pkgCheckouts,
		packages:     packages,
		payments:     payments,
		quota:        quota,
		subSvc:       subSvc,
		wsSvc:        wsSvc,
		tokenBal:     tokenBal,
	}
}

func (s *BillingService) ListPublicPlans(ctx context.Context) ([]model.Plan, error) {
	all, err := s.plans.List(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]model.Plan, 0, len(all))
	for _, p := range all {
		if p.IsActive {
			out = append(out, p)
		}
	}
	return out, nil
}

func (s *BillingService) Overview(ctx context.Context, userID string, r *http.Request) (*model.BillingOverview, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if ws == nil {
		return nil, ErrNoPrimaryWS
	}

	enabled, provider, err := s.payments.PaymentsEnabled(ctx)
	if err != nil {
		return nil, err
	}
	cfg, err := s.payments.GetEffective(ctx)
	if err != nil {
		return nil, err
	}

	balance, err := s.wallet.GetBalance(ctx, userID)
	if err != nil {
		return nil, err
	}

	planID, assignedAt, err := s.workspaces.GetPlanMeta(ctx, ws.ID)
	if err != nil {
		return nil, err
	}
	plan, err := s.plans.GetByID(ctx, planID)
	if err != nil {
		plan, err = s.plans.GetDefaultFree(ctx)
		if err != nil {
			return nil, err
		}
	}

	usage, err := s.quota.GetUsage(ctx, ws.ID, assignedAt)
	if err != nil {
		return nil, err
	}

	sub, _ := s.subSvc.GetActive(ctx, ws.ID)

	tokenBalance, err := s.tokenBal.GetBalance(ctx, ws.ID, userID)
	if err != nil {
		return nil, err
	}

	var assignedPtr *time.Time
	if !assignedAt.IsZero() {
		t := assignedAt
		assignedPtr = &t
	}

	return &model.BillingOverview{
		PaymentsEnabled:     enabled,
		ActiveProvider:      string(provider),
		WorkspaceID:         ws.ID,
		Plan:                plan,
		PlanAssignedAt:      assignedPtr,
		Subscription:        sub,
		Usage:               usage,
		TokenBalance:        tokenBalance,
		WalletBalanceCents:  balance,
		WalletTopupMinCents: cfg.WalletTopupMinCents,
		WalletTopupMaxCents: cfg.WalletTopupMaxCents,
	}, nil
}

func (s *BillingService) PreviewSubscribe(
	ctx context.Context,
	userID, workspaceID, planID string,
	period model.BillingPeriod,
	r *http.Request,
) (*model.SubscribePreview, error) {
	if workspaceID == "" {
		ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
		if err != nil || ws == nil {
			return nil, ErrNoPrimaryWS
		}
		workspaceID = ws.ID
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, workspaceID, model.RoleAdmin); err != nil {
		return nil, err
	}
	return s.subSvc.PreviewSubscribe(ctx, workspaceID, planID, period)
}

func (s *BillingService) SetAutoRenew(
	ctx context.Context,
	userID, workspaceID string,
	autoRenew bool,
	r *http.Request,
) (*model.WorkspaceSubscription, error) {
	if workspaceID == "" {
		ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
		if err != nil || ws == nil {
			return nil, ErrNoPrimaryWS
		}
		workspaceID = ws.ID
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, workspaceID, model.RoleAdmin); err != nil {
		return nil, err
	}
	return s.subSvc.SetAutoRenew(ctx, workspaceID, autoRenew)
}

func (s *BillingService) SwitchToFree(ctx context.Context, userID, workspaceID string) error {
	if _, err := s.wsSvc.RequireMembership(ctx, userID, workspaceID, model.RoleAdmin); err != nil {
		return err
	}
	if err := s.subSvc.CancelForWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	free, err := s.plans.GetDefaultFree(ctx)
	if err != nil {
		return err
	}
	return s.workspaces.SetPlan(ctx, workspaceID, free.ID)
}

func (s *BillingService) PaymentHistory(ctx context.Context, userID string) ([]model.PaymentHistoryItem, error) {
	checkouts, err := s.checkouts.ListForUser(ctx, userID, 20)
	if err != nil {
		return nil, err
	}
	topups, err := s.wallet.ListTopups(ctx, userID, 20)
	if err != nil {
		return nil, err
	}
	pkgCheckouts, err := s.pkgCheckouts.ListForUser(ctx, userID, 20)
	if err != nil {
		return nil, err
	}

	items := make([]model.PaymentHistoryItem, 0, len(checkouts)+len(topups)+len(pkgCheckouts))
	for _, c := range checkouts {
		desc := fmt.Sprintf("Оплата тарифа (%s)", c.BillingPeriod)
		if c.ProrateCreditCents > 0 {
			desc = fmt.Sprintf("%s, перерасчёт −%d ₽", desc, c.ProrateCreditCents/100)
		}
		items = append(items, model.PaymentHistoryItem{
			ID:          c.ID,
			Kind:        "subscribe",
			AmountCents: c.AmountCents,
			Status:      string(c.Status),
			Description: desc,
			CreatedAt:   c.CreatedAt,
			PaidAt:      c.PaidAt,
		})
	}
	for _, t := range topups {
		items = append(items, model.PaymentHistoryItem{
			ID:          t.ID,
			Kind:        "wallet_topup",
			AmountCents: t.AmountCents,
			Status:      string(t.Status),
			Description: "Пополнение кошелька",
			CreatedAt:   t.CreatedAt,
			PaidAt:      t.PaidAt,
		})
	}
	for _, pc := range pkgCheckouts {
		desc := fmt.Sprintf("%d токенов", pc.Tokens)
		if pkg, err := s.packages.GetByID(ctx, pc.PackageID); err == nil {
			desc = pkg.Name
		}
		items = append(items, model.PaymentHistoryItem{
			ID:          pc.ID,
			Kind:        "token_package",
			AmountCents: pc.AmountCents,
			Status:      string(pc.Status),
			Description: desc,
			CreatedAt:   pc.CreatedAt,
			PaidAt:      pc.PaidAt,
		})
	}

	for i := 0; i < len(items); i++ {
		for j := i + 1; j < len(items); j++ {
			if items[j].CreatedAt.After(items[i].CreatedAt) {
				items[i], items[j] = items[j], items[i]
			}
		}
	}
	if len(items) > 40 {
		items = items[:40]
	}
	return items, nil
}

func (s *BillingService) WalletLedger(ctx context.Context, userID string) ([]model.WalletLedgerEntry, error) {
	return s.wallet.ListLedger(ctx, userID, 30)
}
