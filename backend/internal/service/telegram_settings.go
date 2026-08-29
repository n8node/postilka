package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var ErrInvalidTelegramSettings = errors.New("invalid telegram settings")

type TelegramSettingsService struct {
	repo    *repository.TelegramSettingsRepository
	runtime func() model.TelegramBotRuntimeStatus
}

func NewTelegramSettingsService(repo *repository.TelegramSettingsRepository) *TelegramSettingsService {
	return &TelegramSettingsService{repo: repo}
}

func (s *TelegramSettingsService) BindRuntimeStatus(fn func() model.TelegramBotRuntimeStatus) {
	s.runtime = fn
}

func (s *TelegramSettingsService) currentRuntime() model.TelegramBotRuntimeStatus {
	if s.runtime != nil {
		return s.runtime()
	}
	return model.TelegramBotRuntimeStatus{
		Status:  model.TelegramBotStatusStarting,
		Message: "Статус недоступен",
	}
}

func (s *TelegramSettingsService) GetStored(ctx context.Context) (*model.TelegramSettingsRecord, error) {
	rec, err := s.repo.Get(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			def := model.DefaultTelegramSettings()
			return &model.TelegramSettingsRecord{Config: def}, nil
		}
		return nil, err
	}
	return rec, nil
}

func (s *TelegramSettingsService) GetEffective(ctx context.Context) (model.TelegramSettings, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return model.TelegramSettings{}, err
	}
	model.NormalizeTelegramDigestSettings(&rec.Config)
	return rec.Config, nil
}

func (s *TelegramSettingsService) GetAdminView(ctx context.Context) (*model.TelegramAdminView, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}
	model.NormalizeTelegramDigestSettings(&rec.Config)
	return buildTelegramAdminView(rec, s.currentRuntime()), nil
}

func (s *TelegramSettingsService) Update(ctx context.Context, req model.TelegramAdminUpdateRequest) (*model.TelegramAdminView, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}

	cfg := req.Settings
	if strings.TrimSpace(req.BotToken) != "" {
		cfg.BotToken = strings.TrimSpace(req.BotToken)
	} else {
		cfg.BotToken = rec.Config.BotToken
	}
	cfg.ProxyURLs = normalizeProxyURLs(cfg.ProxyURLs)
	cfg.ProxyActiveURL = strings.TrimSpace(cfg.ProxyActiveURL)
	if cfg.ProxyEnabled && cfg.ProxyActiveURL == "" && len(cfg.ProxyURLs) > 0 {
		cfg.ProxyActiveURL = cfg.ProxyURLs[0]
	}
	if !cfg.ProxyEnabled {
		cfg.ProxyActiveURL = ""
	}
	model.NormalizeTelegramDigestSettings(&cfg)

	if err := validateTelegramSettings(cfg); err != nil {
		return nil, err
	}

	updated, err := s.repo.Update(ctx, cfg)
	if err != nil {
		return nil, err
	}
	return buildTelegramAdminView(updated, s.currentRuntime()), nil
}

func buildTelegramAdminView(rec *model.TelegramSettingsRecord, runtime model.TelegramBotRuntimeStatus) *model.TelegramAdminView {
	pub := rec.Config
	pub.BotToken = ""
	return &model.TelegramAdminView{
		Settings:     pub,
		BotTokenSet:  strings.TrimSpace(rec.Config.BotToken) != "",
		BotTokenHint: maskSecret(rec.Config.BotToken),
		UpdatedAt:    rec.UpdatedAt,
		Runtime:      runtime,
	}
}

func validateTelegramSettings(cfg model.TelegramSettings) error {
	cfg.ProxyURLs = normalizeProxyURLs(cfg.ProxyURLs)
	cfg.ProxyActiveURL = strings.TrimSpace(cfg.ProxyActiveURL)
	if cfg.ProxyEnabled {
		if len(cfg.ProxyURLs) == 0 {
			return fmt.Errorf("%w: add at least one proxy url", ErrInvalidTelegramSettings)
		}
		for _, raw := range cfg.ProxyURLs {
			u, err := parseHTTPProxyURL(raw)
			if err != nil || u.Host == "" {
				return fmt.Errorf("%w: invalid proxy url %q", ErrInvalidTelegramSettings, raw)
			}
			if strings.ToLower(u.Scheme) != "http" {
				return fmt.Errorf("%w: proxy url %q: only http:// proxies are supported", ErrInvalidTelegramSettings, raw)
			}
		}
		if cfg.ProxyActiveURL == "" || !containsProxyURL(cfg.ProxyURLs, cfg.ProxyActiveURL) {
			cfg.ProxyActiveURL = cfg.ProxyURLs[0]
		}
	} else {
		cfg.ProxyActiveURL = ""
	}

	if cfg.Enabled {
		if strings.TrimSpace(cfg.ChatID) == "" {
			return fmt.Errorf("%w: chat_id required when notifications enabled", ErrInvalidTelegramSettings)
		}
	}
	model.NormalizeTelegramDigestSettings(&cfg)
	if cfg.DigestEnabled {
		if strings.TrimSpace(cfg.DigestChatID) == "" {
			return fmt.Errorf("%w: укажите ID группы для сводки мониторинга", ErrInvalidTelegramSettings)
		}
		if cfg.DigestTopicID <= 0 {
			return fmt.Errorf("%w: укажите ID темы для сводки мониторинга", ErrInvalidTelegramSettings)
		}
	}
	return nil
}
