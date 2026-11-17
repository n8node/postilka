package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

const antiFraudSettingsKey = "anti_fraud.settings"

var ErrInvalidAntiFraudSettings = errors.New("invalid anti-fraud settings")

func DefaultAntiFraudSettings() model.AntiFraudSettings {
	return model.AntiFraudSettings{
		Enabled: true, Mode: model.AntiFraudModeMonitoring,
		MediumThreshold: 30, HighThreshold: 60, CriticalThreshold: 80,
		DeviceAccountsThreshold: 2, DeviceImageLimit: 5, DeviceVideoLimit: 2,
		RetentionDays: 90,
		Rules: []model.AntiFraudRule{
			{Key: "shared_device", Name: "Общее устройство", Description: "Устройство связано с несколькими аккаунтами", Enabled: true, Weight: 25, Threshold: 2, Action: model.AntiFraudActionManualReview},
			{Key: "shared_ip", Name: "Общий IP", Description: "IP использован несколькими аккаунтами", Enabled: true, Weight: 10, Threshold: 5, Action: model.AntiFraudActionObserve},
			{Key: "free_quota_pattern", Name: "Расходование бесплатной квоты", Description: "Несколько связанных аккаунтов используют бесплатную квоту", Enabled: true, Weight: 25, Threshold: 2, Action: model.AntiFraudActionLimit},
		},
	}
}

type AntiFraudService struct {
	settings *repository.SettingsRepository
	users    *repository.UserRepository
	signals  *repository.UserSecuritySignalRepository
}

func NewAntiFraudService(settings *repository.SettingsRepository, users *repository.UserRepository, signals *repository.UserSecuritySignalRepository) *AntiFraudService {
	return &AntiFraudService{settings: settings, users: users, signals: signals}
}

func (s *AntiFraudService) GetSettings(ctx context.Context) (model.AntiFraudSettings, error) {
	defaults := DefaultAntiFraudSettings()
	raw, err := s.settings.Get(ctx, antiFraudSettingsKey)
	if errors.Is(err, repository.ErrNotFound) || strings.TrimSpace(raw) == "" {
		return defaults, nil
	}
	if err != nil {
		return defaults, err
	}
	var cfg model.AntiFraudSettings
	if err := json.Unmarshal([]byte(raw), &cfg); err != nil {
		return defaults, nil
	}
	return normalizeAntiFraudSettings(cfg), nil
}

func (s *AntiFraudService) UpdateSettings(ctx context.Context, cfg model.AntiFraudSettings) (model.AntiFraudSettings, error) {
	cfg = normalizeAntiFraudSettings(cfg)
	if cfg.MediumThreshold >= cfg.HighThreshold || cfg.HighThreshold >= cfg.CriticalThreshold {
		return model.AntiFraudSettings{}, ErrInvalidAntiFraudSettings
	}
	raw, err := json.Marshal(cfg)
	if err != nil {
		return model.AntiFraudSettings{}, err
	}
	if err := s.settings.Set(ctx, antiFraudSettingsKey, string(raw)); err != nil {
		return model.AntiFraudSettings{}, err
	}
	return cfg, nil
}

func normalizeAntiFraudSettings(cfg model.AntiFraudSettings) model.AntiFraudSettings {
	d := DefaultAntiFraudSettings()
	if cfg.Mode != model.AntiFraudModeMonitoring && cfg.Mode != model.AntiFraudModeSoft && cfg.Mode != model.AntiFraudModeStrict {
		cfg.Mode = d.Mode
	}
	if cfg.MediumThreshold < 1 || cfg.MediumThreshold > 99 {
		cfg.MediumThreshold = d.MediumThreshold
	}
	if cfg.HighThreshold < 1 || cfg.HighThreshold > 99 {
		cfg.HighThreshold = d.HighThreshold
	}
	if cfg.CriticalThreshold < 1 || cfg.CriticalThreshold > 100 {
		cfg.CriticalThreshold = d.CriticalThreshold
	}
	if cfg.DeviceAccountsThreshold < 1 || cfg.DeviceAccountsThreshold > 100 {
		cfg.DeviceAccountsThreshold = d.DeviceAccountsThreshold
	}
	if cfg.DeviceImageLimit < 0 || cfg.DeviceImageLimit > 1000 {
		cfg.DeviceImageLimit = d.DeviceImageLimit
	}
	if cfg.DeviceVideoLimit < 0 || cfg.DeviceVideoLimit > 1000 {
		cfg.DeviceVideoLimit = d.DeviceVideoLimit
	}
	if cfg.RetentionDays < 7 || cfg.RetentionDays > 730 {
		cfg.RetentionDays = d.RetentionDays
	}
	if len(cfg.Rules) == 0 {
		cfg.Rules = d.Rules
	}
	for i := range cfg.Rules {
		if cfg.Rules[i].Weight < 0 {
			cfg.Rules[i].Weight = 0
		}
		if cfg.Rules[i].Weight > 50 {
			cfg.Rules[i].Weight = 50
		}
		if cfg.Rules[i].Threshold < 1 {
			cfg.Rules[i].Threshold = 1
		}
		if cfg.Rules[i].Action == model.AntiFraudActionBlock {
			cfg.Rules[i].Action = model.AntiFraudActionManualReview
		}
	}
	return cfg
}

func (s *AntiFraudService) ListUsers(ctx context.Context, limit, offset int) ([]model.AntiFraudUserProfile, int, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	profiles, total, err := s.signals.ListRiskProfiles(ctx, limit, offset)
	return profiles, total, err
}

func (s *AntiFraudService) SetDecision(ctx context.Context, actorID, userID string, decision model.AntiFraudDecision) error {
	decision.Decision = strings.TrimSpace(decision.Decision)
	if decision.Decision != string(model.AntiFraudActionObserve) && decision.Decision != string(model.AntiFraudActionChallenge) && decision.Decision != string(model.AntiFraudActionLimit) && decision.Decision != string(model.AntiFraudActionManualReview) && decision.Decision != string(model.AntiFraudActionAllowlist) {
		return ErrInvalidAntiFraudSettings
	}
	if strings.TrimSpace(decision.Reason) == "" {
		return ErrInvalidAntiFraudSettings
	}
	return s.signals.SetDecision(ctx, actorID, userID, decision.Decision, decision.Reason)
}
