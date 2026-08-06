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
	subSvc     *SubscriptionService
	wsSvc      *WorkspaceService
	emails     *TransactionalEmailService
	telegram   *TelegramService
	cfg        *config.Config
}

func NewCheckoutService(
	checkouts *repository.PlanCheckoutRepository,
	wallet *repository.WalletRepository,
	plans *repository.PlanRepository,
	workspaces *repository.WorkspaceRepository,
	users *repository.UserRepository,
	payments *PaymentSettingsService,
	subSvc *SubscriptionService,
	wsSvc *WorkspaceService,
	emails *TransactionalEmailService,
	telegram *TelegramService,
	cfg *config.Config,
) *CheckoutService {
	return &CheckoutService{
		checkouts:  checkouts,
		wallet:     wallet,
		plans:      plans,
		workspaces: workspaces,
		users:      users,
		payments:   payments,
		subSvc:     subSvc,
		wsSvc:      wsSvc,
		emails:     emails,
		telegram:   telegram,
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

	listPrice, prorateCredit, amountDue, kind, err := s.subSvc.BuildCheckoutPricing(ctx, workspaceID, planID, period)
	if err != nil {
		return nil, err
	}

	if amountDue == 0 {
		if err := s.subSvc.ActivateImmediate(ctx, workspaceID, planID, period, listPrice, prorateCredit, kind, nil); err != nil {
			return nil, err
		}
		return &model.CheckoutResult{
			CheckoutID:  "",
			Kind:        "subscribe",
			Provider:    string(model.PaymentProviderRobokassa),
			CheckoutURL: appendBillingQuery(s.payments.defaultReturnURL(), "payment", "success"),
		}, nil
	}

	checkout, err := s.checkouts.CreateWithPricing(
		ctx, userID, workspaceID, planID, string(provider), period, kind,
		listPrice, prorateCredit, amountDue,
	)
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

	desc := fmt.Sprintf("Postilka — %s", plan.Name)
	if checkout.ProrateCreditCents > 0 {
		desc = fmt.Sprintf("%s (с учётом перерасчёта)", desc)
	}

	params := url.Values{}
	params.Set("MerchantLogin", login)
	params.Set("OutSum", outSum)
	params.Set("InvId", invStr)
	params.Set("Description", desc)
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
	paid, err := s.wallet.MarkTopupPaid(ctx, topup.ID)
	if err != nil {
		return err
	}
	if paid.Status == model.CheckoutStatusPaid && s.emails != nil {
		s.emails.SendWalletTopupPaidBestEffort(ctx, paid)
	}
	if paid.Status == model.CheckoutStatusPaid && s.telegram != nil {
		if user, err := s.users.GetByID(ctx, paid.UserID); err == nil {
			balance, _ := s.wallet.GetBalance(ctx, paid.UserID)
			s.telegram.NotifyWalletTopup(ctx, user, paid.AmountCents, balance)
		}
	}
	return nil
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

	expectedDue := checkout.ListPriceCents - checkout.ProrateCreditCents
	expectedAmount := expectedDue
	if expectedDue > 0 && expectedDue < minCheckoutCents {
		expectedAmount = minCheckoutCents
	}
	if checkout.AmountCents != expectedAmount {
		return ErrInvalidInput
	}

	paid, err := s.checkouts.MarkPaid(ctx, checkoutID)
	if err != nil {
		return err
	}
	if paid.Status != model.CheckoutStatusPaid {
		return nil
	}

	if err := s.subSvc.ActivateFromCheckout(ctx, paid); err != nil {
		return err
	}
	if s.emails != nil {
		s.emails.SendSubscriptionPaidBestEffort(ctx, paid)
	}
	if s.telegram != nil {
		if user, err := s.users.GetByID(ctx, paid.UserID); err == nil {
			if plan, err := s.plans.GetByID(ctx, paid.PlanID); err == nil {
				s.telegram.NotifyPayment(ctx, user, plan, paid.AmountCents)
			}
		}
	}
	return nil
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
