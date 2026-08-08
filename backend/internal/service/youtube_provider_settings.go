package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var ErrInvalidYouTubeProviderSettings = errors.New("invalid youtube provider settings")

type YouTubeProviderSettingsService struct {
	repo *repository.YouTubeProviderSettingsRepository
}

func NewYouTubeProviderSettingsService(repo *repository.YouTubeProviderSettingsRepository) *YouTubeProviderSettingsService {
	return &YouTubeProviderSettingsService{repo: repo}
}

func (s *YouTubeProviderSettingsService) GetStored(ctx context.Context) (*model.YouTubeProviderSettingsRecord, error) {
	rec, err := s.repo.Get(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			def := model.DefaultYouTubeProviderSettings()
			return &model.YouTubeProviderSettingsRecord{Config: def}, nil
		}
		return nil, err
	}
	return rec, nil
}

func (s *YouTubeProviderSettingsService) GetEffective(ctx context.Context) (model.YouTubeProviderSettings, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return model.YouTubeProviderSettings{}, err
	}
	return rec.Config, nil
}

func (s *YouTubeProviderSettingsService) GetAdminView(ctx context.Context) (*model.YouTubeProviderAdminView, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}
	return &model.YouTubeProviderAdminView{
		Settings:  rec.Config,
		UpdatedAt: rec.UpdatedAt,
	}, nil
}

func (s *YouTubeProviderSettingsService) Update(ctx context.Context, cfg model.YouTubeProviderSettings) (*model.YouTubeProviderAdminView, error) {
	cfg.ProxyURLs = normalizeProxyURLs(cfg.ProxyURLs)
	cfg.ProxyActiveURL = strings.TrimSpace(cfg.ProxyActiveURL)
	if cfg.ProxyEnabled && cfg.ProxyActiveURL == "" && len(cfg.ProxyURLs) > 0 {
		cfg.ProxyActiveURL = cfg.ProxyURLs[0]
	}
	if !cfg.ProxyEnabled {
		cfg.ProxyActiveURL = ""
	}
	if err := validateYouTubeProviderSettings(cfg); err != nil {
		return nil, err
	}
	updated, err := s.repo.Update(ctx, cfg)
	if err != nil {
		return nil, err
	}
	return &model.YouTubeProviderAdminView{
		Settings:  updated.Config,
		UpdatedAt: updated.UpdatedAt,
	}, nil
}

func validateYouTubeProviderSettings(cfg model.YouTubeProviderSettings) error {
	if cfg.ProxyEnabled {
		if len(cfg.ProxyURLs) == 0 {
			return fmt.Errorf("%w: add at least one proxy url", ErrInvalidYouTubeProviderSettings)
		}
		for _, raw := range cfg.ProxyURLs {
			u, err := parseHTTPProxyURL(raw)
			if err != nil || u.Host == "" {
				return fmt.Errorf("%w: invalid proxy url %q", ErrInvalidYouTubeProviderSettings, raw)
			}
			if strings.ToLower(u.Scheme) != "http" {
				return fmt.Errorf("%w: proxy url %q: only http:// proxies are supported", ErrInvalidYouTubeProviderSettings, raw)
			}
		}
	}
	return nil
}
