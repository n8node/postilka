package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var ErrInvalidAntiFraudTelegramSettings = errors.New("invalid anti-fraud telegram settings")

type AntiFraudTelegramSettingsService struct {
	repo   *repository.AntiFraudTelegramSettingsRepository
	cipher *SecretCipher
}

func NewAntiFraudTelegramSettingsService(repo *repository.AntiFraudTelegramSettingsRepository, cipher *SecretCipher) *AntiFraudTelegramSettingsService {
	return &AntiFraudTelegramSettingsService{repo: repo, cipher: cipher}
}

func (s *AntiFraudTelegramSettingsService) GetStored(ctx context.Context) (*model.AntiFraudTelegramSettingsRecord, error) {
	rec, err := s.repo.Get(ctx)
	if errors.Is(err, repository.ErrNotFound) {
		def := model.DefaultAntiFraudTelegramSettings()
		return &model.AntiFraudTelegramSettingsRecord{Config: def}, nil
	}
	if err != nil {
		return nil, err
	}
	return rec, nil
}

func (s *AntiFraudTelegramSettingsService) GetAdminView(ctx context.Context) (*model.AntiFraudTelegramAdminView, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}
	return &model.AntiFraudTelegramAdminView{
		Settings:         rec.Config,
		BotTokenSet:      strings.TrimSpace(rec.Config.BotTokenEncrypted) != "",
		BotTokenHint:     maskSecret(s.decryptOrEmpty(rec.Config.BotTokenEncrypted)),
		WebhookSecretSet: strings.TrimSpace(rec.Config.WebhookSecretEncrypted) != "",
		UpdatedAt:        rec.UpdatedAt,
	}, nil
}

func (s *AntiFraudTelegramSettingsService) Update(ctx context.Context, req model.AntiFraudTelegramUpdateRequest) (*model.AntiFraudTelegramAdminView, error) {
	old, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}
	cfg := req.Settings
	cfg.ProxyURLs = normalizeProxyURLs(cfg.ProxyURLs)
	cfg.ProxyActiveURL = strings.TrimSpace(cfg.ProxyActiveURL)
	if cfg.ProxyEnabled && cfg.ProxyActiveURL == "" && len(cfg.ProxyURLs) > 0 {
		cfg.ProxyActiveURL = cfg.ProxyURLs[0]
	}
	if !cfg.ProxyEnabled {
		cfg.ProxyActiveURL = ""
	}
	if strings.TrimSpace(req.BotToken) != "" {
		if s.cipher == nil {
			return nil, ErrCryptoUnavailable
		}
		cfg.BotTokenEncrypted, err = s.cipher.Encrypt(strings.TrimSpace(req.BotToken))
		if err != nil {
			return nil, err
		}
	} else {
		cfg.BotTokenEncrypted = old.Config.BotTokenEncrypted
	}
	if strings.TrimSpace(req.WebhookSecret) != "" {
		if s.cipher == nil {
			return nil, ErrCryptoUnavailable
		}
		cfg.WebhookSecretEncrypted, err = s.cipher.Encrypt(strings.TrimSpace(req.WebhookSecret))
		if err != nil {
			return nil, err
		}
	} else {
		cfg.WebhookSecretEncrypted = old.Config.WebhookSecretEncrypted
	}
	if err := validateAntiFraudTelegramSettings(cfg); err != nil {
		return nil, err
	}
	if _, err := s.repo.Update(ctx, cfg); err != nil {
		return nil, err
	}
	return s.GetAdminView(ctx)
}

func (s *AntiFraudTelegramSettingsService) decryptOrEmpty(value string) string {
	if strings.TrimSpace(value) == "" || s.cipher == nil {
		return ""
	}
	plain, err := s.cipher.Decrypt(value)
	if err != nil {
		return ""
	}
	return plain
}

func validateAntiFraudTelegramSettings(cfg model.AntiFraudTelegramSettings) error {
	if cfg.Enabled {
		if cfg.AdminTelegramID == 0 {
			return fmt.Errorf("%w: укажите Telegram ID администратора", ErrInvalidAntiFraudTelegramSettings)
		}
		if strings.TrimSpace(cfg.BotTokenEncrypted) == "" {
			return fmt.Errorf("%w: укажите токен отдельного бота", ErrInvalidAntiFraudTelegramSettings)
		}
	}
	if cfg.ProxyEnabled {
		if len(cfg.ProxyURLs) == 0 {
			return fmt.Errorf("%w: добавьте хотя бы один proxy URL", ErrInvalidAntiFraudTelegramSettings)
		}
		for _, raw := range cfg.ProxyURLs {
			u, err := parseHTTPProxyURL(raw)
			if err != nil || u.Host == "" || strings.ToLower(u.Scheme) != "http" {
				return fmt.Errorf("%w: некорректный http:// proxy URL %q", ErrInvalidAntiFraudTelegramSettings, raw)
			}
		}
	}
	return nil
}
