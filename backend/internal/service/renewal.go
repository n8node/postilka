package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

type RenewalService struct {
	subs    *repository.SubscriptionRepository
	plans   *repository.PlanRepository
	wallet  *repository.WalletRepository
	ws      *repository.WorkspaceRepository
	subSvc  *SubscriptionService
	logger  *slog.Logger
	notify  *NotificationService
}

func NewRenewalService(
	subs *repository.SubscriptionRepository,
	plans *repository.PlanRepository,
	wallet *repository.WalletRepository,
	ws *repository.WorkspaceRepository,
	subSvc *SubscriptionService,
	logger *slog.Logger,
) *RenewalService {
	return &RenewalService{subs: subs, plans: plans, wallet: wallet, ws: ws, subSvc: subSvc, logger: logger}
}

func (s *RenewalService) SetNotifier(n *NotificationService) {
	s.notify = n
}

func (s *RenewalService) Process(ctx context.Context) error {
	now := time.Now().UTC()
	due, err := s.subs.ListDueForRenewal(ctx, now.Add(72*time.Hour), 100)
	if err != nil {
		return err
	}
	for i := range due {
		if err := s.processOne(ctx, &due[i], now); err != nil {
			s.logger.Warn("subscription renewal failed",
				"workspace_id", due[i].WorkspaceID,
				"error", err,
			)
		}
	}
	return nil
}

func (s *RenewalService) processOne(ctx context.Context, sub *model.WorkspaceSubscription, now time.Time) error {
	if now.Before(sub.PeriodEnd) {
		return nil
	}

	plan, err := s.plans.GetByID(ctx, sub.PlanID)
	if err != nil {
		return err
	}
	if plan.IsFree {
		return s.downgrade(ctx, sub)
	}

	amount, err := planPriceCents(plan, sub.BillingPeriod)
	if err != nil {
		return err
	}

	ownerID, err := s.ws.GetOwnerID(ctx, sub.WorkspaceID)
	if err != nil {
		return err
	}

	balance, err := s.wallet.GetBalance(ctx, ownerID)
	if err != nil {
		return err
	}
	if balance >= int64(amount) {
		desc := fmt.Sprintf("Автопродление тарифа %s", plan.Name)
		if err := s.wallet.Debit(ctx, ownerID, int64(amount), "renew", "subscription", sub.ID, desc); err != nil {
			return err
		}
		if err := s.subSvc.ActivateWalletRenewal(ctx, sub, amount); err != nil {
			return err
		}
		s.logger.Info("subscription renewed from wallet",
			"workspace_id", sub.WorkspaceID,
			"plan_id", sub.PlanID,
			"amount_cents", amount,
		)
		if s.notify != nil {
			s.notify.NotifyPlanRenewed(ctx, sub.WorkspaceID, plan.Name, amount)
			s.notify.MaybeWalletLow(ctx, ownerID)
		}
		return nil
	}

	if now.Sub(sub.PeriodEnd) > billingGracePeriod {
		return s.downgrade(ctx, sub)
	}

	if sub.Status != model.SubscriptionStatusPastDue {
		if err := s.subs.SetStatus(ctx, sub.ID, model.SubscriptionStatusPastDue); err != nil {
			return err
		}
		if s.notify != nil {
			s.notify.NotifyPlanPastDue(ctx, sub.WorkspaceID, plan.Name)
			s.notify.NotifyWalletLow(ctx, ownerID, balance)
		}
	}
	return nil
}

func (s *RenewalService) downgrade(ctx context.Context, sub *model.WorkspaceSubscription) error {
	planName := ""
	if plan, err := s.plans.GetByID(ctx, sub.PlanID); err == nil && plan != nil {
		planName = plan.Name
	}
	free, err := s.plans.GetDefaultFree(ctx)
	if err != nil {
		return err
	}
	if err := s.subs.CancelForWorkspace(ctx, sub.WorkspaceID); err != nil {
		return err
	}
	if err := s.ws.SetPlan(ctx, sub.WorkspaceID, free.ID); err != nil {
		return err
	}
	s.logger.Info("subscription downgraded to free after expiry",
		"workspace_id", sub.WorkspaceID,
	)
	if s.notify != nil {
		s.notify.NotifyPlanDowngraded(ctx, sub.WorkspaceID, planName)
	}
	return nil
}

var ErrRenewalSkipped = errors.New("renewal skipped")
