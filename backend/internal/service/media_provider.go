package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/postilka/postilka/internal/ai"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

type MediaProviderRuntime struct {
	ID       string
	BaseURL  string
	APIKey   string
	Settings map[string]any
}

type MediaProviderUserLookup interface {
	GetByID(context.Context, string) (*model.User, error)
}

type MediaProviderService struct {
	repo   *repository.MediaProviderRepository
	cipher *SecretCipher
}

func NewMediaProviderService(repo *repository.MediaProviderRepository, cipher *SecretCipher) *MediaProviderService {
	return &MediaProviderService{repo: repo, cipher: cipher}
}

func providerView(p model.MediaProvider) model.MediaProviderView {
	v := model.MediaProviderView{ID: p.ID, DisplayName: p.DisplayName, APIBaseURL: p.APIBaseURL, APIKeySet: p.APIKeySet, Enabled: p.Enabled, TestOnly: p.TestOnly, Capabilities: p.Capabilities, Settings: p.Settings}
	if !p.UpdatedAt.IsZero() {
		v.UpdatedAt = p.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z")
	}
	return v
}

func (s *MediaProviderService) List(ctx context.Context) ([]model.MediaProviderView, error) {
	items, err := s.repo.List(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]model.MediaProviderView, 0, len(items))
	for _, p := range items {
		out = append(out, providerView(p))
	}
	return out, nil
}

func (s *MediaProviderService) Get(ctx context.Context, id string) (model.MediaProviderView, error) {
	p, err := s.repo.Get(ctx, id)
	if err != nil {
		return model.MediaProviderView{}, err
	}
	return providerView(p), nil
}

func (s *MediaProviderService) Update(ctx context.Context, id string, in model.MediaProviderUpdateRequest) (model.MediaProviderView, error) {
	p, err := s.repo.Get(ctx, id)
	if err != nil {
		return model.MediaProviderView{}, err
	}
	if in.DisplayName != nil {
		p.DisplayName = strings.TrimSpace(*in.DisplayName)
		if p.DisplayName == "" {
			return model.MediaProviderView{}, errors.New("display name is required")
		}
	}
	if in.APIBaseURL != nil {
		p.APIBaseURL = strings.TrimRight(strings.TrimSpace(*in.APIBaseURL), "/")
		if p.APIBaseURL == "" {
			return model.MediaProviderView{}, errors.New("api base url is required")
		}
	}
	if in.Enabled != nil {
		p.Enabled = *in.Enabled
	}
	if in.TestOnly != nil {
		p.TestOnly = *in.TestOnly
	}
	if in.Capabilities != nil {
		p.Capabilities = *in.Capabilities
	}
	if in.Settings != nil {
		p.Settings = in.Settings
	}
	key := ""
	if in.APIKey != nil && strings.TrimSpace(*in.APIKey) != "" {
		if s.cipher == nil {
			return model.MediaProviderView{}, ErrCryptoUnavailable
		}
		key, err = s.cipher.Encrypt(strings.TrimSpace(*in.APIKey))
		if err != nil {
			return model.MediaProviderView{}, err
		}
	}
	if err = s.repo.Upsert(ctx, p, key); err != nil {
		return model.MediaProviderView{}, err
	}
	return s.Get(ctx, id)
}

func (s *MediaProviderService) Models(ctx context.Context, id string) ([]model.MediaProviderModel, error) {
	return s.repo.ListModels(ctx, id)
}
func (s *MediaProviderService) Pricing(ctx context.Context, id string) ([]model.MediaProviderPricing, error) {
	return s.repo.ListPricing(ctx, id)
}

func (s *MediaProviderService) TestOneFast(ctx context.Context, baseURL, apiKey string) (map[string]any, error) {
	provider, err := s.repo.Get(ctx, "onefast")
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(baseURL) == "" {
		baseURL = provider.APIBaseURL
	}
	if strings.TrimSpace(apiKey) == "" {
		stored, keyErr := s.repo.GetStoredKey(ctx, "onefast")
		if keyErr != nil {
			return nil, keyErr
		}
		if strings.TrimSpace(stored) == "" || s.cipher == nil {
			return nil, fmt.Errorf("onefast api key is not configured")
		}
		apiKey, err = s.cipher.Decrypt(stored)
		if err != nil {
			return nil, fmt.Errorf("onefast api key decrypt failed: %w", err)
		}
	}
	if strings.TrimSpace(baseURL) == "" || strings.TrimSpace(apiKey) == "" {
		return nil, fmt.Errorf("onefast api base url and api key are required")
	}
	client := ai.NewOneFastClient(baseURL, apiKey, "")
	if err := client.TestConnection(ctx); err != nil {
		return nil, err
	}
	models, modelsErr := client.ListModels(ctx)
	if modelsErr != nil || len(models) == 0 {
		models = oneFastFallbackModels()
	}
	imageModels, videoModels := make([]map[string]string, 0), make([]map[string]string, 0)
	for _, item := range models {
		entry := map[string]string{"id": item.ID, "name": item.Name}
		if isOneFastImageModel(item.ID) {
			imageModels = append(imageModels, entry)
		}
		if isOneFastVideoModel(item.ID) {
			videoModels = append(videoModels, entry)
		}
	}
	return map[string]any{"ok": true, "message": "Соединение OneFast успешно проверено", "image_models": imageModels, "video_models": videoModels}, nil
}

func oneFastFallbackModels() []ai.OneFastModel {
	return []ai.OneFastModel{{ID: "gpt-image-2.5", Name: "GPT Image 2.5"}, {ID: "gemini-3.1-flash-image-preview", Name: "Gemini 3.1 Flash Image"}, {ID: "gemini-3-pro-image-preview", Name: "Gemini 3 Pro Image"}, {ID: "dreamina-seedance-2-0-260128", Name: "Seedance 2.0"}, {ID: "grok-imagine-video", Name: "Grok Imagine Video"}, {ID: "wan-2-7-video", Name: "Wan 2.7 Video"}}
}
func isOneFastImageModel(id string) bool {
	s := strings.ToLower(id)
	return strings.Contains(s, "image") || strings.Contains(s, "nano-banana") || strings.HasPrefix(s, "gpt-image")
}
func isOneFastVideoModel(id string) bool {
	s := strings.ToLower(id)
	for _, part := range []string{"video", "seedance", "wan-", "grok-imagine", "happyhorse", "gemini-omni", "minimax-h3"} {
		if strings.Contains(s, part) {
			return true
		}
	}
	return false
}
func (s *MediaProviderService) Routes(ctx context.Context) ([]model.MediaProviderRoute, error) {
	return s.repo.ListRoutes(ctx)
}
func (s *MediaProviderService) UpdateRoutes(ctx context.Context, in model.MediaProviderRoutesUpdateRequest) error {
	return s.repo.ReplaceRoutes(ctx, in.Routes)
}

func (s *MediaProviderService) IsAvailableForUser(ctx context.Context, id string, isPlatformAdmin bool) (bool, error) {
	p, err := s.repo.Get(ctx, id)
	if err != nil {
		return false, err
	}
	if !p.Enabled {
		return false, nil
	}
	if p.TestOnly && !isPlatformAdmin {
		return false, nil
	}
	return true, nil
}

func (s *MediaProviderService) ResolveRuntime(ctx context.Context, id string) (MediaProviderRuntime, error) {
	p, err := s.repo.Get(ctx, id)
	if err != nil {
		return MediaProviderRuntime{}, err
	}
	if !p.Enabled {
		return MediaProviderRuntime{}, fmt.Errorf("media provider %s is disabled", id)
	}
	if s.cipher == nil {
		return MediaProviderRuntime{}, ErrCryptoUnavailable
	}
	stored, err := s.repo.GetStoredKey(ctx, id)
	if err != nil {
		return MediaProviderRuntime{}, err
	}
	key, err := s.cipher.Decrypt(stored)
	if err != nil || strings.TrimSpace(key) == "" {
		return MediaProviderRuntime{}, fmt.Errorf("media provider %s api key is not configured", id)
	}
	return MediaProviderRuntime{ID: p.ID, BaseURL: p.APIBaseURL, APIKey: strings.TrimSpace(key), Settings: p.Settings}, nil
}

func (s *MediaProviderService) Primary(ctx context.Context, mediaType string) (MediaProviderRuntime, error) {
	routes, err := s.repo.ListRoutes(ctx)
	if err != nil {
		return MediaProviderRuntime{}, err
	}
	for _, route := range routes {
		if route.MediaType != mediaType || !route.Enabled {
			continue
		}
		p, getErr := s.repo.Get(ctx, route.ProviderID)
		if getErr != nil || !p.Enabled || p.TestOnly {
			continue
		}
		runtime, runtimeErr := s.ResolveRuntime(ctx, route.ProviderID)
		if runtimeErr == nil {
			return runtime, nil
		}
	}
	return MediaProviderRuntime{}, fmt.Errorf("no configured media provider for %s", mediaType)
}

func (s *MediaProviderService) PrimaryID(ctx context.Context, mediaType string) (string, error) {
	routes, err := s.repo.ListRoutes(ctx)
	if err != nil {
		return "", err
	}
	for _, route := range routes {
		if route.MediaType != mediaType || !route.Enabled {
			continue
		}
		p, getErr := s.repo.Get(ctx, route.ProviderID)
		if getErr != nil || !p.Enabled || p.TestOnly {
			continue
		}
		if _, runtimeErr := s.ResolveRuntime(ctx, route.ProviderID); runtimeErr == nil {
			return p.ID, nil
		}
	}
	return "", fmt.Errorf("no configured media provider for %s", mediaType)
}

func (s *MediaProviderService) PrimaryIDForUser(ctx context.Context, mediaType, userID string, users MediaProviderUserLookup) (string, error) {
	isAdmin := false
	if users != nil {
		if user, err := users.GetByID(ctx, userID); err == nil && user != nil {
			isAdmin = user.IsPlatformAdmin
		}
	}
	routes, err := s.repo.ListRoutes(ctx)
	if err != nil {
		return "", err
	}
	for _, route := range routes {
		if route.MediaType != mediaType || !route.Enabled {
			continue
		}
		p, getErr := s.repo.Get(ctx, route.ProviderID)
		if getErr != nil || !p.Enabled || (p.TestOnly && !isAdmin) {
			continue
		}
		if _, runtimeErr := s.ResolveRuntime(ctx, p.ID); runtimeErr == nil {
			return p.ID, nil
		}
	}
	return "", fmt.Errorf("no configured media provider for %s", mediaType)
}

func ValidateProviderID(id string) error {
	if strings.TrimSpace(id) == "" {
		return fmt.Errorf("provider id is required")
	}
	return nil
}
