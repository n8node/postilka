package service

import (
	"context"
	"errors"
	"fmt"
	"net"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/ai"
	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrInvalidYandexGptConfig   = errors.New("invalid yandex gpt config")
	ErrYandexGptNotConfigured    = errors.New("yandex gpt not configured")
	ErrYandexGptConnectionFailed = errors.New("yandex gpt connection failed")
	ErrYandexGptTimeout          = errors.New("yandex gpt timeout")
)

type YandexGptConfigService struct {
	repo   *repository.YandexGptConfigRepository
	cfg    *config.Config
	cipher *SecretCipher
}

func NewYandexGptConfigService(
	repo *repository.YandexGptConfigRepository,
	cfg *config.Config,
	cipher *SecretCipher,
) *YandexGptConfigService {
	return &YandexGptConfigService{repo: repo, cfg: cfg, cipher: cipher}
}

func (s *YandexGptConfigService) GetStored(ctx context.Context) (*model.YandexGptConfigRecord, error) {
	rec, err := s.repo.Get(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			def := model.DefaultYandexGptConfig()
			return &model.YandexGptConfigRecord{Config: def}, nil
		}
		return nil, err
	}
	normalizeYandexConfig(&rec.Config)
	return rec, nil
}

func (s *YandexGptConfigService) GetAdminView(ctx context.Context) (*model.YandexGptAdminView, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}
	return s.buildAdminView(rec), nil
}

func (s *YandexGptConfigService) Update(ctx context.Context, req model.YandexGptAdminUpdateRequest) (*model.YandexGptAdminView, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}
	cfg := rec.Config

	baseURL := strings.TrimSpace(req.APIBaseURL)
	if baseURL == "" {
		return nil, fmt.Errorf("%w: api base url required", ErrInvalidYandexGptConfig)
	}
	cfg.APIBaseURL = baseURL

	folderID := strings.TrimSpace(req.FolderID)
	if folderID != "" && !model.IsValidYandexCloudFolderID(folderID) {
		if strings.Contains(folderID, "@") {
			return nil, fmt.Errorf("%w: folder id must be a catalog ID like b1g..., not an email", ErrInvalidYandexGptConfig)
		}
		return nil, fmt.Errorf("%w: folder id must look like b1g... from Yandex Cloud console", ErrInvalidYandexGptConfig)
	}
	cfg.FolderID = folderID

	modelDefault := strings.TrimSpace(req.ModelDefault)
	if modelDefault != "" {
		cfg.ModelDefault = ai.YandexModelURI(cfg.FolderID, modelDefault)
	}

	if req.ModelPricing != nil {
		if cfg.ModelPricing == nil {
			cfg.ModelPricing = map[string]model.YandexModelPricing{}
		}
		for modelID, pricing := range req.ModelPricing {
			modelID = strings.TrimSpace(modelID)
			if modelID == "" {
				continue
			}
			if err := validateYandexModelPricing(modelID, pricing); err != nil {
				return nil, err
			}
			pricing.Currency = "RUB"
			cfg.ModelPricing[modelID] = pricing
		}
	}

	if req.TaskModels != nil {
		if cfg.TaskModels == nil {
			cfg.TaskModels = map[string]string{}
		}
		for task, modelID := range req.TaskModels {
			task = strings.TrimSpace(task)
			modelID = strings.TrimSpace(modelID)
			if task == "" {
				continue
			}
			if modelID == "" {
				delete(cfg.TaskModels, task)
				continue
			}
			cfg.TaskModels[task] = ai.YandexModelURI(cfg.FolderID, modelID)
		}
	}

	if strings.TrimSpace(req.APIKey) != "" {
		if s.cipher == nil {
			return nil, ErrCryptoUnavailable
		}
		enc, err := s.cipher.Encrypt(strings.TrimSpace(req.APIKey))
		if err != nil {
			return nil, err
		}
		cfg.APIKeyEncrypted = enc
	}

	normalizeYandexConfig(&cfg)
	updated, err := s.repo.Update(ctx, cfg)
	if err != nil {
		return nil, err
	}
	return s.buildAdminView(updated), nil
}

func (s *YandexGptConfigService) TestConnection(
	ctx context.Context,
	req model.YandexGptTestRequest,
) (*model.YandexGptTestResult, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}

	apiKey, folderID, baseURL, err := s.resolveCredentials(rec.Config, req.APIKey, req.FolderID)
	if err != nil {
		return &model.YandexGptTestResult{OK: false, Message: err.Error()}, nil
	}

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	client := ai.NewYandexGPTClient(baseURL, apiKey, folderID)
	result, err := client.TestConnection(ctx)
	if err != nil {
		return &model.YandexGptTestResult{
			OK:      false,
			Message: err.Error(),
		}, nil
	}

	cfg := rec.Config
	cfg.ModelsCache = result.Models
	if cfg.ModelDefault == "" || !containsString(result.Models, cfg.ModelDefault) {
		if len(result.Models) > 0 {
			cfg.ModelDefault = result.Models[0]
		}
	}

	if _, err := s.repo.Update(ctx, cfg); err != nil {
		return nil, err
	}

	return &model.YandexGptTestResult{
		OK:      true,
		Message: fmt.Sprintf("connected, %d models loaded", len(result.Models)),
		Models:  result.Models,
	}, nil
}

func (s *YandexGptConfigService) resolveCredentials(
	stored model.YandexGptStoredConfig,
	overrideKey, overrideFolder string,
) (apiKey, folderID, baseURL string, err error) {
	baseURL = strings.TrimSpace(stored.APIBaseURL)
	if baseURL == "" {
		baseURL = strings.TrimSpace(s.cfg.YandexGPTBaseURL)
	}
	if baseURL == "" {
		baseURL = ai.DefaultYandexGPTBaseURL
	}

	folderID = strings.TrimSpace(stored.FolderID)
	if folderID == "" {
		folderID = strings.TrimSpace(s.cfg.YandexGPTFolderID)
	}
	if strings.TrimSpace(overrideFolder) != "" {
		folderID = strings.TrimSpace(overrideFolder)
	}

	apiKey = strings.TrimSpace(s.cfg.YandexGPTAPIKey)
	if enc := strings.TrimSpace(stored.APIKeyEncrypted); enc != "" {
		if s.cipher == nil {
			return "", "", "", ErrCryptoUnavailable
		}
		dec, decErr := s.cipher.Decrypt(enc)
		if decErr != nil {
			return "", "", "", fmt.Errorf("saved api key cannot be decrypted; save the key again")
		}
		if key := strings.TrimSpace(dec); key != "" {
			apiKey = key
		}
	}
	if strings.TrimSpace(overrideKey) != "" {
		apiKey = strings.TrimSpace(overrideKey)
	}

	if apiKey == "" {
		return "", "", "", ErrYandexGptNotConfigured
	}
	if folderID == "" {
		return "", "", "", errors.New("folder id not configured")
	}
	if !model.IsValidYandexCloudFolderID(folderID) {
		return "", "", "", errors.New("invalid folder id")
	}
	return apiKey, folderID, baseURL, nil
}

func (s *YandexGptConfigService) buildAdminView(rec *model.YandexGptConfigRecord) *model.YandexGptAdminView {
	cfg := rec.Config
	apiKey := s.decryptKey(cfg.APIKeyEncrypted)
	models := cfg.ModelsCache
	if models == nil {
		models = []string{}
	}
	pricing := cfg.ModelPricing
	if pricing == nil {
		pricing = map[string]model.YandexModelPricing{}
	}
	taskModels := cfg.TaskModels
	if taskModels == nil {
		taskModels = map[string]string{}
	}
	return &model.YandexGptAdminView{
		APIBaseURL:   cfg.APIBaseURL,
		APIKeySet:    apiKey != "",
		APIKeyHint:   model.MaskAPIKey(apiKey),
		FolderID:     cfg.FolderID,
		FolderHint:   model.MaskFolderID(cfg.FolderID),
		ModelDefault: cfg.ModelDefault,
		Models:       models,
		ModelPricing: pricing,
		TaskModels:   taskModels,
		UpdatedAt:    rec.UpdatedAt,
	}
}

func (s *YandexGptConfigService) decryptKey(enc string) string {
	enc = strings.TrimSpace(enc)
	if enc == "" {
		return strings.TrimSpace(s.cfg.YandexGPTAPIKey)
	}
	if s.cipher == nil {
		return ""
	}
	plain, err := s.cipher.Decrypt(enc)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(plain)
}

func normalizeYandexConfig(cfg *model.YandexGptStoredConfig) {
	if cfg.ModelsCache == nil {
		cfg.ModelsCache = []string{}
	}
	if cfg.ModelPricing == nil {
		cfg.ModelPricing = map[string]model.YandexModelPricing{}
	}
	if cfg.TaskModels == nil {
		cfg.TaskModels = map[string]string{}
	}
	if cfg.APIBaseURL == "" {
		cfg.APIBaseURL = ai.DefaultYandexGPTBaseURL
	}
}

func validateYandexModelPricing(label string, p model.YandexModelPricing) error {
	if p.InputPer1K < 0 || p.OutputPer1K < 0 {
		return fmt.Errorf("%w: pricing for %s must be non-negative", ErrInvalidYandexGptConfig, label)
	}
	if p.InputPer1K > 10000 || p.OutputPer1K > 10000 {
		return fmt.Errorf("%w: pricing for %s out of range", ErrInvalidYandexGptConfig, label)
	}
	return nil
}

func containsString(list []string, value string) bool {
	for _, item := range list {
		if item == value {
			return true
		}
	}
	return false
}

// ModelForTask returns the model URI for a text task; falls back to ModelDefault.
func ModelForTask(cfg model.YandexGptStoredConfig, task string) string {
	task = strings.TrimSpace(task)
	if task != "" && cfg.TaskModels != nil {
		if m, ok := cfg.TaskModels[task]; ok && strings.TrimSpace(m) != "" {
			return m
		}
	}
	return cfg.ModelDefault
}

func (s *YandexGptConfigService) Client(ctx context.Context) (*ai.YandexGPTClient, model.YandexGptStoredConfig, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, model.YandexGptStoredConfig{}, err
	}
	apiKey, folderID, baseURL, err := s.resolveCredentials(rec.Config, "", "")
	if err != nil {
		return nil, model.YandexGptStoredConfig{}, err
	}
	return ai.NewYandexGPTClient(baseURL, apiKey, folderID), rec.Config, nil
}

func isTimeoutErr(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}
	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return true
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "timeout") || strings.Contains(msg, "deadline exceeded")
}

func wrapYandexChatError(err error) error {
	if err == nil {
		return nil
	}
	if isTimeoutErr(err) {
		return fmt.Errorf("%w: агент отвечает дольше обычного. Отправьте сообщение ещё раз", ErrYandexGptTimeout)
	}
	return fmt.Errorf("%w: агент не ответил. Попробуйте ещё раз", ErrYandexGptConnectionFailed)
}
