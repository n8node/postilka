package service

import (
	"context"
	"errors"
	"fmt"

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
	QuotaUsed            int
	PurchasedCreditsUsed int
	WalletCentsCharged   int64
}

type AIDebitOutcome struct {
	WalletCentsCharged     int
	QuotaCreditsUsed       int
	PurchasedCreditsUsed   int
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
	kopecks, err := s.kopecksPerCredit(ctx)
	if err != nil {
		return err
	}
	return s.PrefailCheckWithKopecks(ctx, workspaceID, userID, creditCost, kopecks)
}

func (s *AIBillingService) PrefailCheckWithKopecks(ctx context.Context, workspaceID, userID string, creditCost, kopecksPerCredit int) error {
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
	needed := creditCost - remaining
	purchased, _, err := s.wallet.GetPurchasedCredits(ctx, userID)
	if err != nil {
		return err
	}
	if purchased >= needed {
		return nil
	}
	needed -= purchased
	if kopecksPerCredit <= 0 {
		kopecksPerCredit = 5000
	}
	centsNeeded := int64(needed) * int64(kopecksPerCredit)
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
	kopecks, err := s.kopecksPerCredit(ctx)
	if err != nil {
		return AIDebitOutcome{}, err
	}
	return s.DebitAfterSuccessWithKopecks(ctx, workspaceID, userID, generationID, creditCost, kopecks)
}

func (s *AIBillingService) DebitAfterSuccessWithKopecks(ctx context.Context, workspaceID, userID, generationID string, creditCost, kopecksPerCredit int) (AIDebitOutcome, error) {
	if creditCost <= 0 {
		return AIDebitOutcome{}, nil
	}
	result, err := s.debitWithKopecks(ctx, workspaceID, userID, generationID, creditCost, kopecksPerCredit)
	if err != nil {
		return AIDebitOutcome{}, err
	}
	return AIDebitOutcome{
		WalletCentsCharged:   int(result.WalletCentsCharged),
		QuotaCreditsUsed:     result.QuotaUsed,
		PurchasedCreditsUsed: result.PurchasedCreditsUsed,
	}, nil
}

func (s *AIBillingService) debit(ctx context.Context, workspaceID, userID, generationID string, creditCost int) (aiDebitResult, error) {
	kopecks, err := s.kopecksPerCredit(ctx)
	if err != nil {
		return aiDebitResult{}, err
	}
	return s.debitWithKopecks(ctx, workspaceID, userID, generationID, creditCost, kopecks)
}

func (s *AIBillingService) debitWithKopecks(ctx context.Context, workspaceID, userID, generationID string, creditCost, kopecksPerCredit int) (aiDebitResult, error) {
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
	left := creditCost - quotaUsed

	purchasedAvailable, _, err := s.wallet.GetPurchasedCredits(ctx, userID)
	if err != nil {
		return aiDebitResult{}, err
	}
	purchasedUsed := left
	if purchasedUsed > purchasedAvailable {
		purchasedUsed = purchasedAvailable
	}
	left -= purchasedUsed
	walletCredits := left

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
	if purchasedUsed > 0 {
		if err := s.wallet.DeductPurchasedCredits(ctx, userID, purchasedUsed); err != nil {
			return aiDebitResult{}, err
		}
	}

	var walletCents int64
	if walletCredits > 0 {
		kopecks := kopecksPerCredit
		if kopecks <= 0 {
			settings, err := s.kie.Get(ctx)
			if err != nil {
				return aiDebitResult{}, err
			}
			kopecks = settings.KopecksPerMediaCredit
			if kopecks <= 0 {
				kopecks = 5000
			}
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
	return aiDebitResult{QuotaUsed: quotaUsed, PurchasedCreditsUsed: purchasedUsed, WalletCentsCharged: walletCents}, nil
}

func (s *AIBillingService) GetMediaCreditsRemaining(ctx context.Context, workspaceID, userID string) (model.MediaCreditsRemainingView, error) {
	remaining, unlimited, err := s.quotaRemaining(ctx, workspaceID)
	if err != nil {
		return model.MediaCreditsRemainingView{}, err
	}
	purchased, _, err := s.wallet.GetPurchasedCredits(ctx, userID)
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

	// Remaining credits are quota + purchased packages only.
	// Wallet ₽ stay a separate economy and must not be folded into the credit count.
	out := model.MediaCreditsRemainingView{
		PurchasedCredits: purchased,
		WalletCredits:    walletCredits,
		WalletBalanceRub: float64(balance) / 100.0,
		Unlimited:        unlimited,
	}
	if unlimited {
		out.TotalAvailable = purchased
		return out, nil
	}
	out.TotalAvailable = remaining + purchased
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
