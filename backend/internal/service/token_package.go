package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var ErrTokenPackageNotFound = errors.New("token package not found")

type TokenPackageService struct {
	packages *repository.TokenPackageRepository
}

func NewTokenPackageService(packages *repository.TokenPackageRepository) *TokenPackageService {
	return &TokenPackageService{packages: packages}
}

func (s *TokenPackageService) ListPublic(ctx context.Context) ([]model.TokenPackage, error) {
	return s.packages.ListActive(ctx)
}

func (s *TokenPackageService) ListAdmin(ctx context.Context) ([]model.TokenPackage, error) {
	return s.packages.ListAll(ctx)
}

func (s *TokenPackageService) GetByID(ctx context.Context, id string) (*model.TokenPackage, error) {
	pkg, err := s.packages.GetByID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrTokenPackageNotFound
	}
	return pkg, err
}

func (s *TokenPackageService) Create(ctx context.Context, input model.TokenPackageUpsert) (*model.TokenPackage, error) {
	if err := validateTokenPackageUpsert(input); err != nil {
		return nil, err
	}
	return s.packages.Create(ctx, input)
}

func (s *TokenPackageService) Update(ctx context.Context, id string, input model.TokenPackageUpsert) (*model.TokenPackage, error) {
	if err := validateTokenPackageUpsert(input); err != nil {
		return nil, err
	}
	pkg, err := s.packages.Update(ctx, id, input)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrTokenPackageNotFound
	}
	return pkg, err
}

func (s *TokenPackageService) Delete(ctx context.Context, id string) error {
	err := s.packages.Delete(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrTokenPackageNotFound
	}
	return err
}

func validateTokenPackageUpsert(input model.TokenPackageUpsert) error {
	if strings.TrimSpace(input.ID) == "" || strings.TrimSpace(input.Name) == "" {
		return ErrInvalidInput
	}
	if input.Tokens <= 0 || input.PriceCents <= 0 {
		return ErrInvalidInput
	}
	return nil
}

type TokenBalanceService struct {
	wallet   *repository.WalletRepository
	quota    *QuotaService
	workspaces *repository.WorkspaceRepository
}

func NewTokenBalanceService(
	wallet *repository.WalletRepository,
	quota *QuotaService,
	workspaces *repository.WorkspaceRepository,
) *TokenBalanceService {
	return &TokenBalanceService{wallet: wallet, quota: quota, workspaces: workspaces}
}

func (s *TokenBalanceService) GetBalance(ctx context.Context, workspaceID, userID string) (model.TokenBalanceView, error) {
	purchased, _, err := s.wallet.GetPurchasedCredits(ctx, userID)
	if err != nil {
		return model.TokenBalanceView{}, err
	}

	planRemaining, unlimited, allowance, periodEnd, err := s.planTokenBalance(ctx, workspaceID)
	if err != nil {
		return model.TokenBalanceView{}, err
	}

	out := model.TokenBalanceView{
		PlanTokensRemaining:      planRemaining,
		PurchasedTokensRemaining: purchased,
		PlanPeriodEnd:            periodEnd.Format(time.RFC3339),
		Unlimited:                unlimited,
	}
	if allowance != nil {
		out.PlanTokensAllowance = allowance
	}
	if unlimited {
		out.TotalRemaining = purchased
	} else {
		out.TotalRemaining = planRemaining + purchased
	}
	return out, nil
}

func (s *TokenBalanceService) planTokenBalance(ctx context.Context, workspaceID string) (remaining int, unlimited bool, allowance *int, periodEnd time.Time, err error) {
	plan, assignedAt, err := s.quota.getWorkspacePlan(ctx, workspaceID)
	if err != nil {
		return 0, false, nil, time.Time{}, err
	}
	periodEnd = s.quota.periodEndForWorkspace(ctx, workspaceID, assignedAt)
	if plan.AIMediaCreditsQuota == nil {
		return 0, true, nil, periodEnd, nil
	}
	usage, err := s.quota.GetUsage(ctx, workspaceID, assignedAt)
	if err != nil {
		return 0, false, nil, time.Time{}, err
	}
	allow := *plan.AIMediaCreditsQuota
	remaining = allow - usage.AIMediaCreditsUsed
	if remaining < 0 {
		remaining = 0
	}
	return remaining, false, &allow, periodEnd, nil
}
