package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var ErrInvalidSocialProviderSettings = errors.New("invalid social provider settings")
var ErrSocialProviderDisabled = errors.New("social provider disabled")
var ErrSocialProviderNotReady = errors.New("social provider not configured")

type SocialProviderSettingsService struct {
	repo *repository.SocialProviderSettingsRepository
}

func NewSocialProviderSettingsService(repo *repository.SocialProviderSettingsRepository) *SocialProviderSettingsService {
	return &SocialProviderSettingsService{repo: repo}
}

func (s *SocialProviderSettingsService) ListAdmin(ctx context.Context) (*model.SocialProviderAdminListView, error) {
	recs, err := s.repo.List(ctx)
	if err != nil {
		return nil, err
	}
	byProvider := map[model.SocialProvider]model.SocialProviderSettingsRecord{}
	for _, rec := range recs {
		byProvider[rec.Provider] = rec
	}

	out := make([]model.SocialProviderAdminView, 0, len(model.AllSocialProviders))
	for _, p := range model.AllSocialProviders {
		rec, ok := byProvider[p]
		cfg := rec.Config
		var updatedAt = rec.UpdatedAt
		if !ok {
			cfg = model.DefaultSocialProviderSettings(p)
		}
		out = append(out, model.SocialProviderAdminView{
			Provider:    p,
			Label:       p.Label(),
			ConnectFlow: p.ConnectFlow(),
			Settings:    cfg,
			UpdatedAt:   updatedAt,
		})
	}
	return &model.SocialProviderAdminListView{Providers: out}, nil
}

func (s *SocialProviderSettingsService) GetAdmin(ctx context.Context, provider model.SocialProvider) (*model.SocialProviderAdminView, error) {
	rec, err := s.repo.Get(ctx, provider)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			cfg := model.DefaultSocialProviderSettings(provider)
			return &model.SocialProviderAdminView{
				Provider:    provider,
				Label:       provider.Label(),
				ConnectFlow: provider.ConnectFlow(),
				Settings:    cfg,
			}, nil
		}
		return nil, err
	}
	return &model.SocialProviderAdminView{
		Provider:    rec.Provider,
		Label:       rec.Provider.Label(),
		ConnectFlow: rec.Provider.ConnectFlow(),
		Settings:    rec.Config,
		UpdatedAt:   rec.UpdatedAt,
	}, nil
}

func (s *SocialProviderSettingsService) UpdateAdmin(
	ctx context.Context,
	provider model.SocialProvider,
	cfg model.SocialProviderSettings,
) (*model.SocialProviderAdminView, error) {
	cfg.OAuthClientID = strings.TrimSpace(cfg.OAuthClientID)
	cfg.OAuthClientSecret = strings.TrimSpace(cfg.OAuthClientSecret)
	cfg.ConnectHelpURL = strings.TrimSpace(cfg.ConnectHelpURL)
	cfg.DocsURL = strings.TrimSpace(cfg.DocsURL)
	cfg.SupportTelegramUsername = strings.TrimPrefix(strings.TrimSpace(cfg.SupportTelegramUsername), "@")
	cfg.SupportEmail = strings.TrimSpace(cfg.SupportEmail)

	if cfg.Enabled && provider.ConnectFlow() == "oauth" {
		if cfg.OAuthClientID == "" {
			return nil, fmt.Errorf("%w: укажите OAuth Client ID", ErrInvalidSocialProviderSettings)
		}
	}

	updated, err := s.repo.Update(ctx, provider, cfg)
	if err != nil {
		return nil, err
	}
	return &model.SocialProviderAdminView{
		Provider:    updated.Provider,
		Label:       updated.Provider.Label(),
		ConnectFlow: updated.Provider.ConnectFlow(),
		Settings:    updated.Config,
		UpdatedAt:   updated.UpdatedAt,
	}, nil
}

func (s *SocialProviderSettingsService) GetEffective(ctx context.Context, provider model.SocialProvider) (model.SocialProviderSettings, error) {
	rec, err := s.repo.Get(ctx, provider)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return model.DefaultSocialProviderSettings(provider), nil
		}
		return model.SocialProviderSettings{}, err
	}
	return rec.Config, nil
}

func (s *SocialProviderSettingsService) PublicInfo(ctx context.Context, provider model.SocialProvider) model.SocialProviderPublicInfo {
	cfg, err := s.GetEffective(ctx, provider)
	if err != nil {
		cfg = model.DefaultSocialProviderSettings(provider)
	}
	def := model.DefaultSocialProviderSettings(provider)
	info := model.SocialProviderPublicInfo{
		Provider:                provider,
		Label:                   provider.Label(),
		Enabled:                 cfg.Enabled,
		ConnectFlow:             provider.ConnectFlow(),
		ConnectHelpText:         fallbackString(cfg.ConnectHelpText, def.ConnectHelpText),
		ConnectHelpURL:          fallbackString(cfg.ConnectHelpURL, def.ConnectHelpURL),
		DocsURL:                 fallbackString(cfg.DocsURL, def.DocsURL),
		SupportTelegramUsername: fallbackString(cfg.SupportTelegramUsername, def.SupportTelegramUsername),
		SupportEmail:            fallbackString(cfg.SupportEmail, def.SupportEmail),
		SupportHoursText:        fallbackString(cfg.SupportHoursText, def.SupportHoursText),
	}
	if provider == model.SocialProviderMAX && cfg.PlatformBotEnabled {
		if bot, ok := s.MAXPlatformBotPublicInfo(ctx); ok {
			info.PlatformBotEnabled = true
			info.PlatformBot = bot
		}
	}
	info.SupportTelegramURL = buildSupportTelegramURL(info.SupportTelegramUsername, "connect_"+string(provider))
	return info
}

func (s *SocialProviderSettingsService) AllPublicInfo(ctx context.Context) []model.SocialProviderPublicInfo {
	out := make([]model.SocialProviderPublicInfo, 0, len(model.AllSocialProviders))
	for _, p := range model.AllSocialProviders {
		out = append(out, s.PublicInfo(ctx, p))
	}
	return out
}

func (s *SocialProviderSettingsService) EnsureReady(ctx context.Context, provider model.SocialProvider) (model.SocialProviderSettings, error) {
	cfg, err := s.GetEffective(ctx, provider)
	if err != nil {
		return cfg, err
	}
	if !cfg.Enabled {
		return cfg, ErrSocialProviderDisabled
	}
	if provider.ConnectFlow() == "oauth" && strings.TrimSpace(cfg.OAuthClientID) == "" {
		return cfg, ErrSocialProviderNotReady
	}
	return cfg, nil
}
