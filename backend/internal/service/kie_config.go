package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/postilka/postilka/internal/ai"
	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrKieNotConfigured       = errors.New("kie not configured")
	ErrKieConnectionFailed    = errors.New("kie connection failed")
	ErrKieAPIKeyDecryptFailed = errors.New("stored kie api key decrypt failed")
)

type KieConfigService struct {
	repo   *repository.KieSettingsRepository
	cfg    *config.Config
	cipher *SecretCipher
}

func NewKieConfigService(
	repo *repository.KieSettingsRepository,
	cfg *config.Config,
	cipher *SecretCipher,
) *KieConfigService {
	return &KieConfigService{repo: repo, cfg: cfg, cipher: cipher}
}

func (s *KieConfigService) Get(ctx context.Context) (model.KieSettingsDTO, error) {
	current, err := s.repo.Get(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return toKieSettingsDTO(model.KieSettings{APIBaseURL: ai.DefaultKieBaseURL}), nil
		}
		return model.KieSettingsDTO{}, err
	}
	return toKieSettingsDTO(current), nil
}

func (s *KieConfigService) Update(ctx context.Context, in model.KieUpdateRequest) (model.KieSettingsDTO, error) {
	current, err := s.repo.Get(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			current = model.KieSettings{APIBaseURL: ai.DefaultKieBaseURL}
		} else {
			return model.KieSettingsDTO{}, err
		}
	}

	if in.APIBaseURL != nil {
		url := strings.TrimSpace(*in.APIBaseURL)
		if url == "" {
			return model.KieSettingsDTO{}, errors.New("invalid api base url")
		}
		current.APIBaseURL = url
	}

	if in.TokenCostTextToImage != nil {
		if *in.TokenCostTextToImage < 0 || *in.TokenCostTextToImage > 1_000_000 {
			return model.KieSettingsDTO{}, errors.New("invalid token cost for text-to-image")
		}
		current.TokenCostTextToImage = *in.TokenCostTextToImage
	}
	if in.TokenCostImageToImage != nil {
		if *in.TokenCostImageToImage < 0 || *in.TokenCostImageToImage > 1_000_000 {
			return model.KieSettingsDTO{}, errors.New("invalid token cost for image-to-image")
		}
		current.TokenCostImageToImage = *in.TokenCostImageToImage
	}
	if in.TokenCostCombine != nil {
		if *in.TokenCostCombine < 0 || *in.TokenCostCombine > 1_000_000 {
			return model.KieSettingsDTO{}, errors.New("invalid token cost for combine")
		}
		current.TokenCostCombine = *in.TokenCostCombine
	}
	if in.TokenCostFilter != nil {
		if *in.TokenCostFilter < 0 || *in.TokenCostFilter > 1_000_000 {
			return model.KieSettingsDTO{}, errors.New("invalid token cost for filter")
		}
		current.TokenCostFilter = *in.TokenCostFilter
	}

	if in.ModelTextToImage != nil {
		current.ModelTextToImage = ai.NormalizeKieModelID(*in.ModelTextToImage)
	}
	if in.ModelImageToImage != nil {
		current.ModelImageToImage = ai.NormalizeKieModelID(*in.ModelImageToImage)
	}
	if in.ModelCombine != nil {
		current.ModelCombine = ai.NormalizeKieModelID(*in.ModelCombine)
	}
	if in.ModelFilter != nil {
		current.ModelFilter = ai.NormalizeKieModelID(*in.ModelFilter)
	}

	apiKeyEnc := current.APIKey
	if in.APIKey != nil {
		key := strings.TrimSpace(*in.APIKey)
		if key != "" {
			if s.cipher == nil {
				return model.KieSettingsDTO{}, ErrCryptoUnavailable
			}
			enc, err := s.cipher.Encrypt(key)
			if err != nil {
				return model.KieSettingsDTO{}, err
			}
			apiKeyEnc = enc
		}
	}

	if err := s.repo.Upsert(ctx, current, apiKeyEnc); err != nil {
		return model.KieSettingsDTO{}, err
	}

	updated, err := s.repo.Get(ctx)
	if err != nil {
		return model.KieSettingsDTO{}, err
	}
	return toKieSettingsDTO(updated), nil
}

func (s *KieConfigService) TestConnection(ctx context.Context, in model.KieTestRequest) (model.KieTestResult, error) {
	baseURL, apiKey, err := s.resolveCredentials(ctx, in.APIBaseURL, in.APIKey)
	if err != nil {
		return model.KieTestResult{OK: false, Message: err.Error()}, nil
	}

	client := ai.NewKieClient(baseURL, apiKey)
	result, err := client.TestConnection(ctx)
	if err != nil {
		return model.KieTestResult{
			OK:      false,
			Message: err.Error(),
		}, nil
	}

	out := make([]model.KieModelView, 0, len(result.Models))
	for _, m := range result.Models {
		out = append(out, model.KieModelView{
			ID:       m.ID,
			Name:     m.Name,
			Category: m.Category,
		})
	}

	return model.KieTestResult{
		OK:               true,
		Models:           out,
		CreditsRemaining: result.CreditsRemaining,
		Message:          fmt.Sprintf("connected, %d models, credits: %.1f", len(out), result.CreditsRemaining),
	}, nil
}

func (s *KieConfigService) resolveCredentials(ctx context.Context, overrideBaseURL, overrideKey string) (baseURL, apiKey string, err error) {
	settings, settingsErr := s.repo.Get(ctx)
	baseURL = ai.DefaultKieBaseURL
	apiKey = strings.TrimSpace(s.cfg.KIEAPIKey)

	if settingsErr == nil {
		if settings.APIBaseURL != "" {
			baseURL = settings.APIBaseURL
		}
		if enc := strings.TrimSpace(settings.APIKey); enc != "" {
			if s.cipher == nil {
				return "", "", ErrCryptoUnavailable
			}
			dec, decErr := s.cipher.Decrypt(enc)
			if decErr != nil {
				return "", "", fmt.Errorf("%w: %v", ErrKieAPIKeyDecryptFailed, decErr)
			}
			if key := strings.TrimSpace(dec); key != "" {
				apiKey = key
			}
		}
	}

	if strings.TrimSpace(overrideBaseURL) != "" {
		baseURL = strings.TrimSpace(overrideBaseURL)
	}
	if strings.TrimSpace(overrideKey) != "" {
		apiKey = strings.TrimSpace(overrideKey)
	}

	if apiKey == "" {
		return "", "", ErrKieNotConfigured
	}
	return baseURL, apiKey, nil
}

func toKieSettingsDTO(s model.KieSettings) model.KieSettingsDTO {
	dto := model.KieSettingsDTO{
		APIBaseURL:            s.APIBaseURL,
		APIKeySet:             strings.TrimSpace(s.APIKey) != "",
		ModelTextToImage:      s.ModelTextToImage,
		ModelImageToImage:     s.ModelImageToImage,
		ModelCombine:          s.ModelCombine,
		ModelFilter:           s.ModelFilter,
		TokenCostTextToImage:  s.TokenCostTextToImage,
		TokenCostImageToImage: s.TokenCostImageToImage,
		TokenCostCombine:      s.TokenCostCombine,
		TokenCostFilter:       s.TokenCostFilter,
	}
	if !s.UpdatedAt.IsZero() {
		dto.UpdatedAt = s.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z")
	}
	return dto
}
