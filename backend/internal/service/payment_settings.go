package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var ErrInvalidPaymentSettings = errors.New("invalid payment settings")

type PaymentSettingsService struct {
	repo *repository.PaymentSettingsRepository
	cfg  *config.Config
}

func NewPaymentSettingsService(repo *repository.PaymentSettingsRepository, cfg *config.Config) *PaymentSettingsService {
	return &PaymentSettingsService{repo: repo, cfg: cfg}
}

func (s *PaymentSettingsService) GetStored(ctx context.Context) (*model.PaymentSettingsRecord, error) {
	rec, err := s.repo.Get(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			def := model.DefaultPaymentSettings()
			return &model.PaymentSettingsRecord{Config: def}, nil
		}
		return nil, err
	}
	return rec, nil
}

func (s *PaymentSettingsService) GetEffective(ctx context.Context) (model.PaymentSettings, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return model.PaymentSettings{}, err
	}
	return rec.Config, nil
}

func (s *PaymentSettingsService) GetAdminView(ctx context.Context) (*model.PaymentAdminView, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}
	return s.buildAdminView(rec), nil
}

func (s *PaymentSettingsService) Update(ctx context.Context, req model.PaymentAdminUpdateRequest) (*model.PaymentAdminView, error) {
	if err := validatePaymentSettings(req); err != nil {
		return nil, err
	}

	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}

	cfg := rec.Config
	cfg.ActiveProvider = model.PaymentProviderRobokassa
	cfg.Robokassa.MerchantLogin = strings.TrimSpace(req.Robokassa.MerchantLogin)
	cfg.Robokassa.TestMode = req.Robokassa.TestMode
	cfg.Robokassa.Enabled = req.Robokassa.Enabled

	if strings.TrimSpace(req.RobokassaPassword1) != "" {
		cfg.Robokassa.Password1 = strings.TrimSpace(req.RobokassaPassword1)
	}
	if strings.TrimSpace(req.RobokassaPassword2) != "" {
		cfg.Robokassa.Password2 = strings.TrimSpace(req.RobokassaPassword2)
	}
	if req.WalletTopupMinCents != nil && *req.WalletTopupMinCents > 0 {
		cfg.WalletTopupMinCents = *req.WalletTopupMinCents
	}
	if req.WalletTopupMaxCents != nil && *req.WalletTopupMaxCents > 0 {
		cfg.WalletTopupMaxCents = *req.WalletTopupMaxCents
	}
	if cfg.WalletTopupMinCents <= 0 {
		cfg.WalletTopupMinCents = 10000
	}
	if cfg.WalletTopupMaxCents <= 0 {
		cfg.WalletTopupMaxCents = 10000000
	}
	if cfg.WalletTopupMaxCents < cfg.WalletTopupMinCents {
		return nil, fmt.Errorf("%w: max top-up must be >= min", ErrInvalidPaymentSettings)
	}

	if robokassaConfigured(cfg.Robokassa) && cfg.Robokassa.Enabled {
		cfg.Robokassa.Enabled = true
	}

	updated, err := s.repo.Update(ctx, cfg)
	if err != nil {
		return nil, err
	}
	return s.buildAdminView(updated), nil
}

func (s *PaymentSettingsService) TestRobokassa(ctx context.Context) (*model.PaymentTestResult, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}
	rk := rec.Config.Robokassa
	if strings.TrimSpace(rk.MerchantLogin) == "" {
		return &model.PaymentTestResult{OK: false, Message: "Укажите логин магазина"}, nil
	}
	if strings.TrimSpace(rk.Password1) == "" {
		return &model.PaymentTestResult{OK: false, Message: "Укажите пароль #1"}, nil
	}
	if strings.TrimSpace(rk.Password2) == "" {
		return &model.PaymentTestResult{OK: false, Message: "Укажите пароль #2"}, nil
	}
	return &model.PaymentTestResult{
		OK:      true,
		Message: "Учётные данные заполнены. В кабинете Robokassa укажите Result URL backend API. Сервер отвечает OK{InvId}.",
	}, nil
}

func (s *PaymentSettingsService) RobokassaResultURL() string {
	return s.cfg.PublicAppURLNormalized() + "/api/v1/webhooks/robokassa/result"
}

func (s *PaymentSettingsService) defaultReturnURL() string {
	return s.cfg.PublicAppURLNormalized() + "/plans"
}

func (s *PaymentSettingsService) PaymentsEnabled(ctx context.Context) (bool, model.PaymentProvider, error) {
	cfg, err := s.GetEffective(ctx)
	if err != nil {
		return false, "", err
	}
	return IsPaymentEnabled(cfg), cfg.ActiveProvider, nil
}

func IsPaymentEnabled(cfg model.PaymentSettings) bool {
	return cfg.Robokassa.Enabled && robokassaConfigured(cfg.Robokassa)
}

func robokassaConfigured(rk model.RobokassaSettings) bool {
	return strings.TrimSpace(rk.MerchantLogin) != "" &&
		strings.TrimSpace(rk.Password1) != "" &&
		strings.TrimSpace(rk.Password2) != ""
}

func RobokassaConfigured(rk model.RobokassaSettings) bool {
	return robokassaConfigured(rk)
}

func (s *PaymentSettingsService) buildAdminView(rec *model.PaymentSettingsRecord) *model.PaymentAdminView {
	rk := rec.Config.Robokassa
	return &model.PaymentAdminView{
		ActiveProvider:         model.PaymentProviderRobokassa,
		Robokassa:              model.RobokassaAdminSettings{MerchantLogin: rk.MerchantLogin, TestMode: rk.TestMode, Enabled: rk.Enabled},
		RobokassaPassword1Set:  strings.TrimSpace(rk.Password1) != "",
		RobokassaPassword1Hint: maskSecret(rk.Password1),
		RobokassaPassword2Set:  strings.TrimSpace(rk.Password2) != "",
		RobokassaPassword2Hint: maskSecret(rk.Password2),
		RobokassaResultURL:     s.RobokassaResultURL(),
		DefaultReturnURL:       s.defaultReturnURL(),
		WalletTopupMinCents:    rec.Config.WalletTopupMinCents,
		WalletTopupMaxCents:    rec.Config.WalletTopupMaxCents,
		UpdatedAt:              rec.UpdatedAt,
	}
}

func validatePaymentSettings(req model.PaymentAdminUpdateRequest) error {
	if req.Robokassa.Enabled {
		if strings.TrimSpace(req.Robokassa.MerchantLogin) == "" {
			return fmt.Errorf("%w: robokassa merchant_login required when enabled", ErrInvalidPaymentSettings)
		}
	}
	return nil
}
