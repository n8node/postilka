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
	ErrKieVideoNotConfigured       = errors.New("kie video not configured")
	ErrKieVideoConnectionFailed    = errors.New("kie video connection failed")
	ErrKieVideoAPIKeyDecryptFailed = errors.New("stored kie video api key decrypt failed")
)

type KieVideoConfigService struct {
	repo   *repository.KieVideoSettingsRepository
	cfg    *config.Config
	cipher *SecretCipher
}

func NewKieVideoConfigService(
	repo *repository.KieVideoSettingsRepository,
	cfg *config.Config,
	cipher *SecretCipher,
) *KieVideoConfigService {
	return &KieVideoConfigService{repo: repo, cfg: cfg, cipher: cipher}
}

func (s *KieVideoConfigService) Get(ctx context.Context) (model.KieVideoSettingsDTO, error) {
	current, err := s.repo.Get(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return toKieVideoSettingsDTO(defaultKieVideoSettings()), nil
		}
		return model.KieVideoSettingsDTO{}, err
	}
	return toKieVideoSettingsDTO(current), nil
}

func (s *KieVideoConfigService) Update(ctx context.Context, in model.KieVideoUpdateRequest) (model.KieVideoSettingsDTO, error) {
	current, err := s.repo.Get(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			current = defaultKieVideoSettings()
		} else {
			return model.KieVideoSettingsDTO{}, err
		}
	}

	if in.APIBaseURL != nil {
		url := strings.TrimSpace(*in.APIBaseURL)
		if url == "" {
			return model.KieVideoSettingsDTO{}, errors.New("invalid api base url")
		}
		current.APIBaseURL = url
	}

	if in.DefaultDurationTextToVideo != nil {
		current.DefaultDurationTextToVideo = modelClampDuration(*in.DefaultDurationTextToVideo)
	}
	if in.DefaultDurationImageToVideo != nil {
		current.DefaultDurationImageToVideo = modelClampDuration(*in.DefaultDurationImageToVideo)
	}
	if in.DefaultDurationReferenceToVideo != nil {
		current.DefaultDurationReferenceToVideo = modelClampDuration(*in.DefaultDurationReferenceToVideo)
	}
	if in.TokenCostTextToVideo != nil {
		if *in.TokenCostTextToVideo < 0 || *in.TokenCostTextToVideo > 1_000_000 {
			return model.KieVideoSettingsDTO{}, errors.New("invalid token cost for text-to-video")
		}
		current.TokenCostTextToVideo = *in.TokenCostTextToVideo
	}
	if in.TokenCostImageToVideo != nil {
		if *in.TokenCostImageToVideo < 0 || *in.TokenCostImageToVideo > 1_000_000 {
			return model.KieVideoSettingsDTO{}, errors.New("invalid token cost for image-to-video")
		}
		current.TokenCostImageToVideo = *in.TokenCostImageToVideo
	}
	if in.TokenCostReferenceToVideo != nil {
		if *in.TokenCostReferenceToVideo < 0 || *in.TokenCostReferenceToVideo > 1_000_000 {
			return model.KieVideoSettingsDTO{}, errors.New("invalid token cost for reference-to-video")
		}
		current.TokenCostReferenceToVideo = *in.TokenCostReferenceToVideo
	}
	if in.KopecksPerMediaCredit != nil {
		if *in.KopecksPerMediaCredit <= 0 || *in.KopecksPerMediaCredit > 10_000_000 {
			return model.KieVideoSettingsDTO{}, errors.New("invalid kopecks per media credit")
		}
		current.KopecksPerMediaCredit = *in.KopecksPerMediaCredit
	}

	if in.ModelTextToVideo != nil {
		current.ModelTextToVideo = ai.NormalizeKieVideoModelID(*in.ModelTextToVideo)
	}
	if in.ModelImageToVideo != nil {
		current.ModelImageToVideo = ai.NormalizeKieVideoModelID(*in.ModelImageToVideo)
	}
	if in.ModelReferenceToVideo != nil {
		current.ModelReferenceToVideo = ai.NormalizeKieVideoModelID(*in.ModelReferenceToVideo)
	}

	apiKeyEnc := current.APIKey
	if in.APIKey != nil {
		key := strings.TrimSpace(*in.APIKey)
		if key != "" {
			if s.cipher == nil {
				return model.KieVideoSettingsDTO{}, ErrCryptoUnavailable
			}
			enc, err := s.cipher.Encrypt(key)
			if err != nil {
				return model.KieVideoSettingsDTO{}, err
			}
			apiKeyEnc = enc
		}
	}

	if err := s.repo.Upsert(ctx, current, apiKeyEnc); err != nil {
		return model.KieVideoSettingsDTO{}, err
	}

	updated, err := s.repo.Get(ctx)
	if err != nil {
		return model.KieVideoSettingsDTO{}, err
	}
	return toKieVideoSettingsDTO(updated), nil
}

func (s *KieVideoConfigService) TestConnection(ctx context.Context, in model.KieVideoTestRequest) (model.KieVideoTestResult, error) {
	baseURL, apiKey, err := s.resolveCredentials(ctx, in.APIBaseURL, in.APIKey)
	if err != nil {
		return model.KieVideoTestResult{OK: false, Message: err.Error()}, nil
	}

	client := ai.NewKieClient(baseURL, apiKey)
	result, err := client.TestConnectionVideo(ctx)
	if err != nil {
		return model.KieVideoTestResult{OK: false, Message: err.Error()}, nil
	}

	out := make([]model.KieModelView, 0, len(result.Models))
	for _, m := range result.Models {
		out = append(out, model.KieModelView{ID: m.ID, Name: m.Name, Category: m.Category})
	}

	return model.KieVideoTestResult{
		OK:               true,
		Models:           out,
		CreditsRemaining: result.CreditsRemaining,
		Message:          fmt.Sprintf("connected, %d video models, credits: %.1f", len(out), result.CreditsRemaining),
	}, nil
}

func (s *KieVideoConfigService) ResolveCredentials(ctx context.Context) (baseURL, apiKey string, err error) {
	return s.resolveCredentials(ctx, "", "")
}

func (s *KieVideoConfigService) GetSettings(ctx context.Context) (model.KieVideoSettings, error) {
	settings, err := s.repo.Get(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return defaultKieVideoSettings(), nil
		}
		return model.KieVideoSettings{}, err
	}
	return settings, nil
}

func (s *KieVideoConfigService) resolveCredentials(ctx context.Context, overrideBaseURL, overrideKey string) (baseURL, apiKey string, err error) {
	settings, settingsErr := s.repo.Get(ctx)
	baseURL = ai.DefaultKieBaseURL
	apiKey = strings.TrimSpace(s.cfg.KIEVideoAPIKey)

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
				return "", "", fmt.Errorf("%w: %v", ErrKieVideoAPIKeyDecryptFailed, decErr)
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
		return "", "", ErrKieVideoNotConfigured
	}
	return baseURL, apiKey, nil
}

func defaultKieVideoSettings() model.KieVideoSettings {
	return model.KieVideoSettings{
		APIBaseURL:                      ai.DefaultKieBaseURL,
		DefaultDurationTextToVideo:      5,
		DefaultDurationImageToVideo:     5,
		DefaultDurationReferenceToVideo: 5,
		TokenCostTextToVideo:            50,
		TokenCostImageToVideo:           50,
		TokenCostReferenceToVideo:       75,
		KopecksPerMediaCredit:           5000,
	}
}

func toKieVideoSettingsDTO(s model.KieVideoSettings) model.KieVideoSettingsDTO {
	dto := model.KieVideoSettingsDTO{
		APIBaseURL:                      s.APIBaseURL,
		APIKeySet:                       strings.TrimSpace(s.APIKey) != "",
		ModelTextToVideo:                s.ModelTextToVideo,
		ModelImageToVideo:               s.ModelImageToVideo,
		ModelReferenceToVideo:           s.ModelReferenceToVideo,
		DefaultDurationTextToVideo:      modelClampDuration(s.DefaultDurationTextToVideo),
		DefaultDurationImageToVideo:     modelClampDuration(s.DefaultDurationImageToVideo),
		DefaultDurationReferenceToVideo: modelClampDuration(s.DefaultDurationReferenceToVideo),
		TokenCostTextToVideo:            s.TokenCostTextToVideo,
		TokenCostImageToVideo:           s.TokenCostImageToVideo,
		TokenCostReferenceToVideo:       s.TokenCostReferenceToVideo,
		KopecksPerMediaCredit:           positiveKopecksOr(s.KopecksPerMediaCredit, 5000),
	}
	if !s.UpdatedAt.IsZero() {
		dto.UpdatedAt = s.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z")
	}
	return dto
}

func modelClampDuration(n int) int {
	if n < 4 {
		return 4
	}
	if n > 15 {
		return 15
	}
	return n
}

func positiveKopecksOr(n, def int) int {
	if n > 0 {
		return n
	}
	return def
}
