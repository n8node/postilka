package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var ErrInvalidSupportSettings = errors.New("invalid support settings")

type SupportSettingsService struct {
	repo *repository.SupportSettingsRepository
}

func NewSupportSettingsService(repo *repository.SupportSettingsRepository) *SupportSettingsService {
	return &SupportSettingsService{repo: repo}
}

func (s *SupportSettingsService) GetStored(ctx context.Context) (*model.SupportSettingsRecord, error) {
	rec, err := s.repo.Get(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			def := model.DefaultSupportSettings()
			return &model.SupportSettingsRecord{Config: def}, nil
		}
		return nil, err
	}
	return rec, nil
}

func (s *SupportSettingsService) GetEffective(ctx context.Context) (model.SupportSettings, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return model.SupportSettings{}, err
	}
	return rec.Config, nil
}

func (s *SupportSettingsService) GetAdminView(ctx context.Context) (*model.SupportSettingsAdminView, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}
	return buildSupportSettingsAdminView(rec), nil
}

func (s *SupportSettingsService) Update(ctx context.Context, req model.SupportSettingsAdminUpdateRequest) (*model.SupportSettingsAdminView, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}

	cfg := req.Settings
	if strings.TrimSpace(req.TelegramBotToken) != "" {
		cfg.TelegramBotToken = strings.TrimSpace(req.TelegramBotToken)
	} else {
		cfg.TelegramBotToken = rec.Config.TelegramBotToken
	}
	if strings.TrimSpace(req.MaxBotToken) != "" {
		cfg.MaxBotToken = strings.TrimSpace(req.MaxBotToken)
	} else {
		cfg.MaxBotToken = rec.Config.MaxBotToken
	}

	if err := validateSupportSettings(cfg); err != nil {
		return nil, err
	}

	updated, err := s.repo.Update(ctx, cfg)
	if err != nil {
		return nil, err
	}
	return buildSupportSettingsAdminView(updated), nil
}

func buildSupportSettingsAdminView(rec *model.SupportSettingsRecord) *model.SupportSettingsAdminView {
	pub := rec.Config
	pub.TelegramBotToken = ""
	pub.MaxBotToken = ""
	return &model.SupportSettingsAdminView{
		Settings:             pub,
		TelegramBotTokenSet:  strings.TrimSpace(rec.Config.TelegramBotToken) != "",
		TelegramBotTokenHint: maskSecret(rec.Config.TelegramBotToken),
		MaxBotTokenSet:       strings.TrimSpace(rec.Config.MaxBotToken) != "",
		MaxBotTokenHint:      maskSecret(rec.Config.MaxBotToken),
		UpdatedAt:            rec.UpdatedAt,
	}
}

func validateSupportSettings(cfg model.SupportSettings) error {
	if cfg.TelegramEnabled {
		if strings.TrimSpace(cfg.TelegramBotToken) == "" {
			return fmt.Errorf("%w: telegram bot token required when enabled", ErrInvalidSupportSettings)
		}
		if strings.TrimSpace(cfg.TelegramChatID) == "" {
			return fmt.Errorf("%w: telegram chat id required when enabled", ErrInvalidSupportSettings)
		}
	}
	if cfg.MaxEnabled {
		if strings.TrimSpace(cfg.MaxBotToken) == "" {
			return fmt.Errorf("%w: max bot token required when enabled", ErrInvalidSupportSettings)
		}
		if strings.TrimSpace(cfg.MaxRecipientID) == "" {
			return fmt.Errorf("%w: max recipient id required when enabled", ErrInvalidSupportSettings)
		}
	}
	if cfg.AdminEmailEnabled && strings.TrimSpace(cfg.AdminEmailRecipients) == "" {
		return fmt.Errorf("%w: admin email recipients required when enabled", ErrInvalidSupportSettings)
	}
	return nil
}
