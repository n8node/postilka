package service

import (
	"context"
	"errors"
	"fmt"
	"math"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrInsufficientAICredits = errors.New("insufficient ai media credits")
)

type AIBillingService struct {
	quota    *QuotaService
	usage    *repository.UsageRepository
	wallet   *repository.WalletRepository
	kie      *repository.KieSettingsRepository
}

func NewAIBillingService(
	quota *QuotaService,
	usage *repository.UsageRepository,
	wallet *repository.WalletRepository,
	kie *repository.KieSettingsRepository,
) *AIBillingService {
	return &AIBillingService{quota: quota, usage: usage, wallet: wallet, kie: kie}
}

type aiDebitResult struct {
	QuotaUsed          int
	WalletCentsCharged int64
}

type AIDebitOutcome struct {
	WalletCentsCharged int
	QuotaCreditsUsed   int
}

func (s *AIBillingService) kopecksPerCredit(ctx context.Context) (int, error) {
	settings, err := s.kie.Get(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return 5000, nil
		}
		return 0, err
	}
	if settings.KopecksPerMediaCredit > 0 {
		return settings.KopecksPerMediaCredit, nil
	}
	return 5000, nil
}

func (s *AIBillingService) PrefailCheck(ctx context.Context, workspaceID, userID string, creditCost int) error {
	if creditCost <= 0 {
		return nil
	}
	remaining, unlimited, err := s.quotaRemaining(ctx, workspaceID)
	if err != nil {
		return err
	}
	if unlimited {
		return nil
	}
	if remaining >= creditCost {
		return nil
	}
	overage := creditCost - remaining
	kopecks, err := s.kopecksPerCredit(ctx)
	if err != nil {
		return err
	}
	centsNeeded := int64(overage) * int64(kopecks)
	balance, err := s.wallet.GetBalance(ctx, userID)
	if err != nil {
		return err
	}
	if balance >= centsNeeded {
		return nil
	}
	return ErrInsufficientAICredits
}

func (s *AIBillingService) DebitAfterSuccess(ctx context.Context, workspaceID, userID, generationID string, creditCost int) (AIDebitOutcome, error) {
	if creditCost <= 0 {
		return AIDebitOutcome{}, nil
	}
	result, err := s.debit(ctx, workspaceID, userID, generationID, creditCost)
	if err != nil {
		return AIDebitOutcome{}, err
	}
	return AIDebitOutcome{
		WalletCentsCharged: int(result.WalletCentsCharged),
		QuotaCreditsUsed:   result.QuotaUsed,
	}, nil
}

func (s *AIBillingService) debit(ctx context.Context, workspaceID, userID, generationID string, creditCost int) (aiDebitResult, error) {
	remaining, unlimited, err := s.quotaRemaining(ctx, workspaceID)
	if err != nil {
		return aiDebitResult{}, err
	}
	if unlimited {
		return aiDebitResult{}, nil
	}

	quotaUsed := creditCost
	if quotaUsed > remaining {
		quotaUsed = remaining
	}
	walletCredits := creditCost - quotaUsed

	plan, assignedAt, err := s.quota.getWorkspacePlan(ctx, workspaceID)
	if err != nil {
		return aiDebitResult{}, err
	}
	periodStart := s.quota.periodStartForWorkspace(ctx, workspaceID, assignedAt)

	if quotaUsed > 0 {
		if err := s.usage.Record(ctx, workspaceID, "ai_media_credits", quotaUsed, periodStart); err != nil {
			return aiDebitResult{}, err
		}
	}

	var walletCents int64
	if walletCredits > 0 {
		settings, err := s.kie.Get(ctx)
		if err != nil {
			return aiDebitResult{}, err
		}
		kopecks := settings.KopecksPerMediaCredit
		if kopecks <= 0 {
			kopecks = 5000
		}
		walletCents = int64(walletCredits) * int64(kopecks)
		desc := fmt.Sprintf("AI-генерация (%d кред. × %d ₽)", walletCredits, kopecks/100)
		if kopecks%100 != 0 {
			desc = fmt.Sprintf("AI-генерация (%d кред. × %.2f ₽)", walletCredits, float64(kopecks)/100)
		}
		if err := s.wallet.Debit(ctx, userID, walletCents, "ai_media_overage", "ai_generation", generationID, desc); err != nil {
			return aiDebitResult{}, err
		}
	}

	_ = plan
	return aiDebitResult{QuotaUsed: quotaUsed, WalletCentsCharged: walletCents}, nil
}

func (s *AIBillingService) GetMediaCreditsRemaining(ctx context.Context, workspaceID, userID string) (model.MediaCreditsRemainingView, error) {
	remaining, unlimited, err := s.quotaRemaining(ctx, workspaceID)
	if err != nil {
		return model.MediaCreditsRemainingView{}, err
	}
	balance, err := s.wallet.GetBalance(ctx, userID)
	if err != nil {
		return model.MediaCreditsRemainingView{}, err
	}
	kopecks, err := s.kopecksPerCredit(ctx)
	if err != nil {
		return model.MediaCreditsRemainingView{}, err
	}
	walletCredits := 0
	if kopecks > 0 {
		walletCredits = int(balance / int64(kopecks))
	}

	out := model.MediaCreditsRemainingView{
		WalletCredits:    walletCredits,
		WalletBalanceRub: float64(balance) / 100.0,
		Unlimited:        unlimited,
	}
	if unlimited {
		out.TotalAvailable = math.MaxInt32
		return out, nil
	}
	out.TotalAvailable = remaining + walletCredits
	rem := remaining
	out.QuotaRemaining = &rem
	return out, nil
}

func (s *AIBillingService) quotaRemaining(ctx context.Context, workspaceID string) (remaining int, unlimited bool, err error) {
	plan, assignedAt, err := s.quota.getWorkspacePlan(ctx, workspaceID)
	if err != nil {
		return 0, false, err
	}
	if plan.AIMediaCreditsQuota == nil {
		return 0, true, nil
	}
	usage, err := s.quota.GetUsage(ctx, workspaceID, assignedAt)
	if err != nil {
		return 0, false, err
	}
	remaining = *plan.AIMediaCreditsQuota - usage.AIMediaCreditsUsed
	if remaining < 0 {
		remaining = 0
	}
	return remaining, false, nil
}
