package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var ErrInvalidTelegramProviderSettings = errors.New("invalid telegram provider settings")

type TelegramProviderSettingsService struct {
	repo *repository.TelegramProviderSettingsRepository
}

func NewTelegramProviderSettingsService(repo *repository.TelegramProviderSettingsRepository) *TelegramProviderSettingsService {
	return &TelegramProviderSettingsService{repo: repo}
}

func (s *TelegramProviderSettingsService) GetStored(ctx context.Context) (*model.TelegramProviderSettingsRecord, error) {
	rec, err := s.repo.Get(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			def := model.DefaultTelegramProviderSettings()
			return &model.TelegramProviderSettingsRecord{Config: def}, nil
		}
		return nil, err
	}
	return rec, nil
}

func (s *TelegramProviderSettingsService) GetEffective(ctx context.Context) (model.TelegramProviderSettings, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return model.TelegramProviderSettings{}, err
	}
	return rec.Config, nil
}

func (s *TelegramProviderSettingsService) GetAdminView(ctx context.Context) (*model.TelegramProviderAdminView, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}
	return &model.TelegramProviderAdminView{
		Settings:  rec.Config,
		UpdatedAt: rec.UpdatedAt,
	}, nil
}

func (s *TelegramProviderSettingsService) Update(ctx context.Context, cfg model.TelegramProviderSettings) (*model.TelegramProviderAdminView, error) {
	cfg.ProxyURLs = normalizeProxyURLs(cfg.ProxyURLs)
	cfg.ProxyActiveURL = strings.TrimSpace(cfg.ProxyActiveURL)
	if cfg.ProxyEnabled && cfg.ProxyActiveURL == "" && len(cfg.ProxyURLs) > 0 {
		cfg.ProxyActiveURL = cfg.ProxyURLs[0]
	}
	if !cfg.ProxyEnabled {
		cfg.ProxyActiveURL = ""
	}
	if err := validateTelegramProviderSettings(cfg); err != nil {
		return nil, err
	}
	updated, err := s.repo.Update(ctx, cfg)
	if err != nil {
		return nil, err
	}
	return &model.TelegramProviderAdminView{
		Settings:  updated.Config,
		UpdatedAt: updated.UpdatedAt,
	}, nil
}

func validateTelegramProviderSettings(cfg model.TelegramProviderSettings) error {
	if cfg.ProxyEnabled {
		if len(cfg.ProxyURLs) == 0 {
			return fmt.Errorf("%w: add at least one proxy url", ErrInvalidTelegramProviderSettings)
		}
		for _, raw := range cfg.ProxyURLs {
			u, err := parseHTTPProxyURL(raw)
			if err != nil || u.Host == "" {
				return fmt.Errorf("%w: invalid proxy url %q", ErrInvalidTelegramProviderSettings, raw)
			}
			if strings.ToLower(u.Scheme) != "http" {
				return fmt.Errorf("%w: proxy url %q: only http:// proxies are supported", ErrInvalidTelegramProviderSettings, raw)
			}
		}
	}
	return nil
}

func (s *TelegramProviderSettingsService) ConnectHelpText(ctx context.Context) string {
	cfg, err := s.GetEffective(ctx)
	if err != nil {
		return model.DefaultTelegramProviderSettings().ConnectHelpText
	}
	return strings.TrimSpace(cfg.ConnectHelpText)
}

func (s *TelegramProviderSettingsService) ChannelProviderInfo(ctx context.Context) model.ChannelProviderInfo {
	cfg, err := s.GetEffective(ctx)
	if err != nil {
		cfg = model.DefaultTelegramProviderSettings()
	}
	def := model.DefaultTelegramProviderSettings()
	info := model.ChannelProviderInfo{
		TelegramEnabled:                cfg.Enabled,
		TelegramBusinessStoriesEnabled: cfg.Enabled && cfg.BusinessStoriesEnabled,
		BusinessConnectHelpText:        strings.TrimSpace(cfg.BusinessConnectHelpText),
		ConnectHelpText:                strings.TrimSpace(cfg.ConnectHelpText),
		ConnectHelpURL:          fallbackString(cfg.ConnectHelpURL, def.ConnectHelpURL),
		DocsURL:                 fallbackString(cfg.DocsURL, def.DocsURL),
		SupportTelegramUsername: fallbackString(cfg.SupportTelegramUsername, def.SupportTelegramUsername),
		SupportEmail:            fallbackString(cfg.SupportEmail, def.SupportEmail),
		SupportHoursText:        fallbackString(cfg.SupportHoursText, def.SupportHoursText),
	}
	info.SupportTelegramURL = buildSupportTelegramURL(info.SupportTelegramUsername, "connect_help")
	return info
}

func fallbackString(value, def string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return def
	}
	return value
}

func buildSupportTelegramURL(username, startParam string) string {
	username = strings.TrimPrefix(strings.TrimSpace(username), "@")
	if username == "" {
		return ""
	}
	url := "https://t.me/" + username
	if startParam = strings.TrimSpace(startParam); startParam != "" {
		url += "?start=" + startParam
	}
	return url
}
