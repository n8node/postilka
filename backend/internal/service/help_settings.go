package service

import (
	"context"
	"errors"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

type HelpSettingsService struct {
	repo *repository.HelpSettingsRepository
}

func NewHelpSettingsService(repo *repository.HelpSettingsRepository) *HelpSettingsService {
	return &HelpSettingsService{repo: repo}
}

func (s *HelpSettingsService) Get(ctx context.Context) (*model.HelpSettings, error) {
	settings, err := s.repo.Get(ctx)
	if errors.Is(err, repository.ErrNotFound) {
		return &model.HelpSettings{Enabled: true}, nil
	}
	return settings, err
}

func (s *HelpSettingsService) Update(ctx context.Context, enabled bool) (*model.HelpSettings, error) {
	return s.repo.Update(ctx, enabled)
}
