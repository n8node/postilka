package service

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrCheckoutUnavailable = errors.New("checkout unavailable")
	ErrCheckoutNotFound    = errors.New("checkout not found")
	ErrQuotaExceeded       = errors.New("quota exceeded")
)

type CheckoutService struct {
	checkouts  *repository.PlanCheckoutRepository
	wallet     *repository.WalletRepository
	plans      *repository.PlanRepository
	workspaces *repository.WorkspaceRepository
	users      *repository.UserRepository
	payments   *PaymentSettingsService
	wsSvc      *WorkspaceService
	cfg        *config.Config
}

func NewCheckoutService(
	checkouts *repository.PlanCheckoutRepository,
	wallet *repository.WalletRepository,
	plans *repository.PlanRepository,
	workspaces *repository.WorkspaceRepository,
	users *repository.UserRepository,
	payments *PaymentSettingsService,
	wsSvc *WorkspaceService,
	cfg *config.Config,
) *CheckoutService {
	return &CheckoutService{
		checkouts:  checkouts,
		wallet:     wallet,
		plans:      plans,
		workspaces: workspaces,
		users:      users,
		payments:   payments,
		wsSvc:      wsSvc,
		cfg:        cfg,
	}
}

func (s *CheckoutService) CreateSubscribe(
	ctx context.Context,
	userID, workspaceID, planID string,
	period model.BillingPeriod,
) (*model.CheckoutResult, error) {
	enabled, provider, err := s.payments.PaymentsEnabled(ctx)
	if err != nil {
		return nil, err
	}
	if !enabled {
		return nil, ErrCheckoutUnavailable
	}

	if _, err := s.wsSvc.RequireMembership(ctx, userID, workspaceID, model.RoleAdmin); err != nil {
		return nil, err
	}

	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user.IsBlocked {
		return nil, ErrUserBlocked
	}

	plan, err := s.plans.GetByID(ctx, planID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrPlanNotFound
		}
		return nil, err
	}
	if !plan.IsActive || plan.IsFree {
		return nil, ErrInvalidInput
	}

	amountCents, err := planPriceCents(plan, period)
	if err != nil {
		return nil, err
	}
	if amountCents <= 0 {
		return nil, ErrInvalidInput
	}

	checkout, err := s.checkouts.Create(ctx, userID, workspaceID, planID, string(provider), period, amountCents)
	if err != nil {
		return nil, err
	}

	cfg, err := s.payments.GetEffective(ctx)
	if err != nil {
		return nil, err
	}

	return s.createRobokassaSubscribe(ctx, cfg, checkout, plan)
}

func (s *CheckoutService) CreateWalletTopup(ctx context.Context, userID string, amountCents int) (*model.CheckoutResult, error) {
	enabled, provider, err := s.payments.PaymentsEnabled(ctx)
	if err != nil {
		return nil, err
	}
	if !enabled {
		return nil, ErrCheckoutUnavailable
	}

	cfg, err := s.payments.GetEffective(ctx)
	if err != nil {
		return nil, err
	}
	if amountCents < cfg.WalletTopupMinCents || amountCents > cfg.WalletTopupMaxCents {
		return nil, ErrInvalidInput
	}

	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user.IsBlocked {
		return nil, ErrUserBlocked
	}

	topup, err := s.wallet.CreateTopup(ctx, userID, string(provider), amountCents)
	if err != nil {
		return nil, err
	}

	return s.createRobokassaTopup(ctx, cfg, topup)
}

func (s *CheckoutService) createRobokassaSubscribe(
	ctx context.Context,
	cfg model.PaymentSettings,
	checkout *model.PlanCheckout,
	plan *model.Plan,
) (*model.CheckoutResult, error) {
	rk := cfg.Robokassa
	invID, err := s.checkouts.NextInvID(ctx)
	if err != nil {
		return nil, err
	}

	outSum := FormatRubOutSum(checkout.AmountCents)
	login := strings.TrimSpace(rk.MerchantLogin)
	pass1 := strings.TrimSpace(rk.Password1)
	invStr := strconv.FormatInt(invID, 10)
	signature := BuildRobokassaPaymentSignature(login, outSum, invStr, pass1, "")

	returnURL := s.payments.defaultReturnURL()
	successURL := appendBillingQuery(returnURL, "payment", "success")
	failURL := appendBillingQuery(returnURL, "payment", "failed")

	params := url.Values{}
	params.Set("MerchantLogin", login)
	params.Set("OutSum", outSum)
	params.Set("InvId", invStr)
	params.Set("Description", fmt.Sprintf("Postilka — %s", plan.Name))
	params.Set("SignatureValue", signature)
	params.Set("SuccessURL", successURL)
	params.Set("FailURL", failURL)
	if rk.TestMode {
		params.Set("IsTest", "1")
	}

	if err := s.checkouts.SetExternal(ctx, checkout.ID, invStr, &invID); err != nil {
		return nil, err
	}

	return &model.CheckoutResult{
		CheckoutID:  checkout.ID,
		Kind:        "subscribe",
		Provider:    string(model.PaymentProviderRobokassa),
		CheckoutURL: "https://auth.robokassa.ru/Merchant/Index.aspx?" + params.Encode(),
	}, nil
}

func (s *CheckoutService) createRobokassaTopup(
	ctx context.Context,
	cfg model.PaymentSettings,
	topup *model.WalletTopup,
) (*model.CheckoutResult, error) {
	rk := cfg.Robokassa
	invID, err := s.wallet.NextInvID(ctx)
	if err != nil {
		return nil, err
	}

	outSum := FormatRubOutSum(topup.AmountCents)
	login := strings.TrimSpace(rk.MerchantLogin)
	pass1 := strings.TrimSpace(rk.Password1)
	invStr := strconv.FormatInt(invID, 10)
	signature := BuildRobokassaPaymentSignature(login, outSum, invStr, pass1, "")

	returnURL := s.payments.defaultReturnURL()
	successURL := appendBillingQuery(returnURL, "payment", "success")
	failURL := appendBillingQuery(returnURL, "payment", "failed")

	params := url.Values{}
	params.Set("MerchantLogin", login)
	params.Set("OutSum", outSum)
	params.Set("InvId", invStr)
	params.Set("Description", "Postilka — пополнение кошелька")
	params.Set("SignatureValue", signature)
	params.Set("SuccessURL", successURL)
	params.Set("FailURL", failURL)
	if rk.TestMode {
		params.Set("IsTest", "1")
	}

	if err := s.wallet.SetTopupExternal(ctx, topup.ID, invStr, &invID); err != nil {
		return nil, err
	}

	return &model.CheckoutResult{
		CheckoutID:  topup.ID,
		Kind:        "wallet_topup",
		Provider:    string(model.PaymentProviderRobokassa),
		CheckoutURL: "https://auth.robokassa.ru/Merchant/Index.aspx?" + params.Encode(),
	}, nil
}

func (s *CheckoutService) HandleRobokassaResult(ctx context.Context, invIDStr, outSumStr string) error {
	invID, err := strconv.ParseInt(strings.TrimSpace(invIDStr), 10, 64)
	if err != nil {
		return ErrInvalidInput
	}

	if checkout, err := s.checkouts.GetByInvID(ctx, invID); err == nil {
		if err := VerifyRobokassaOutSum(checkout.AmountCents, outSumStr); err != nil {
			return err
		}
		return s.FulfillSubscribe(ctx, checkout.ID)
	} else if !errors.Is(err, repository.ErrNotFound) {
		return err
	}

	topup, err := s.wallet.GetTopupByInvID(ctx, invID)
	if err != nil {
		return err
	}
	if err := VerifyRobokassaOutSum(topup.AmountCents, outSumStr); err != nil {
		return err
	}
	_, err = s.wallet.MarkTopupPaid(ctx, topup.ID)
	return err
}

func (s *CheckoutService) FulfillSubscribe(ctx context.Context, checkoutID string) error {
	checkout, err := s.checkouts.GetByID(ctx, checkoutID)
	if err != nil {
		return err
	}
	if checkout.Status == model.CheckoutStatusPaid {
		return nil
	}
	if checkout.Status != model.CheckoutStatusPending {
		return ErrInvalidInput
	}

	plan, err := s.plans.GetByID(ctx, checkout.PlanID)
	if err != nil {
		return err
	}
	expected, err := planPriceCents(plan, checkout.BillingPeriod)
	if err != nil {
		return err
	}
	if expected != checkout.AmountCents {
		return ErrInvalidInput
	}

	paid, err := s.checkouts.MarkPaid(ctx, checkoutID)
	if err != nil {
		return err
	}
	if paid.Status != model.CheckoutStatusPaid {
		return nil
	}

	return s.workspaces.SetPlan(ctx, checkout.WorkspaceID, checkout.PlanID)
}

func planPriceCents(plan *model.Plan, period model.BillingPeriod) (int, error) {
	switch period {
	case model.BillingPeriodMonthly:
		if plan.PriceMonthlyCents == nil || *plan.PriceMonthlyCents <= 0 {
			return 0, ErrInvalidInput
		}
		return *plan.PriceMonthlyCents, nil
	case model.BillingPeriodYearly:
		if plan.PriceYearlyCents == nil || *plan.PriceYearlyCents <= 0 {
			return 0, ErrInvalidInput
		}
		return *plan.PriceYearlyCents, nil
	default:
		return 0, ErrInvalidInput
	}
}

func appendBillingQuery(rawURL, key, value string) string {
	u, err := url.Parse(rawURL)
	if err != nil {
		return rawURL
	}
	q := u.Query()
	q.Set(key, value)
	u.RawQuery = q.Encode()
	return u.String()
}
