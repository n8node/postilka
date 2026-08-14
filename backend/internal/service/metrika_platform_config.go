package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var ErrInvalidMetrikaPlatformConfig = errors.New("invalid metrika platform config")

type MetrikaPlatformConfigService struct {
	repo   *repository.MetrikaPlatformConfigRepository
	cfg    *config.Config
	cipher *SecretCipher
}

func NewMetrikaPlatformConfigService(
	repo *repository.MetrikaPlatformConfigRepository,
	cfg *config.Config,
	cipher *SecretCipher,
) *MetrikaPlatformConfigService {
	return &MetrikaPlatformConfigService{repo: repo, cfg: cfg, cipher: cipher}
}

func (s *MetrikaPlatformConfigService) GetStored(ctx context.Context) (*model.MetrikaPlatformConfigRecord, error) {
	rec, err := s.repo.Get(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			def := model.DefaultMetrikaPlatformConfig()
			return &model.MetrikaPlatformConfigRecord{Config: def}, nil
		}
		return nil, err
	}
	return rec, nil
}

func (s *MetrikaPlatformConfigService) GetAdminView(ctx context.Context) (*model.MetrikaPlatformAdminView, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}
	return s.buildAdminView(rec), nil
}

func (s *MetrikaPlatformConfigService) Update(
	ctx context.Context,
	req model.MetrikaPlatformAdminUpdateRequest,
) (*model.MetrikaPlatformAdminView, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}
	cfg := rec.Config

	clientID := strings.TrimSpace(req.OAuthClientID)
	cfg.Enabled = req.Enabled
	cfg.OAuthClientID = clientID

	if strings.TrimSpace(req.OAuthClientSecret) != "" {
		if s.cipher == nil {
			return nil, ErrCryptoUnavailable
		}
		enc, err := s.cipher.Encrypt(strings.TrimSpace(req.OAuthClientSecret))
		if err != nil {
			return nil, err
		}
		cfg.OAuthClientSecretEncrypted = enc
	}

	if req.Enabled {
		effectiveID := clientID
		if effectiveID == "" {
			effectiveID = strings.TrimSpace(s.cfg.YandexMetrikaClientID)
		}
		if effectiveID == "" {
			return nil, fmt.Errorf("%w: oauth client id required when enabled", ErrInvalidMetrikaPlatformConfig)
		}
		secret, err := s.decryptSecret(cfg.OAuthClientSecretEncrypted)
		if err != nil {
			return nil, err
		}
		if secret == "" {
			secret = strings.TrimSpace(s.cfg.YandexMetrikaClientSecret)
		}
		if secret == "" {
			return nil, fmt.Errorf("%w: oauth client secret required when enabled", ErrInvalidMetrikaPlatformConfig)
		}
	}

	updated, err := s.repo.Update(ctx, cfg)
	if err != nil {
		return nil, err
	}
	return s.buildAdminView(updated), nil
}

func (s *MetrikaPlatformConfigService) OAuthReady(ctx context.Context) (bool, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return false, err
	}
	if !rec.Config.Enabled {
		return false, nil
	}
	_, _, _, err = s.resolveOAuthCredentials(ctx)
	if errors.Is(err, ErrMetrikaPlatformNotConfigured) {
		return false, nil
	}
	return err == nil, err
}

var ErrMetrikaPlatformNotConfigured = errors.New("metrika platform oauth not configured")

func (s *MetrikaPlatformConfigService) ResolveOAuthCredentials(ctx context.Context) (clientID, clientSecret, redirectURI string, err error) {
	return s.resolveOAuthCredentials(ctx)
}

func (s *MetrikaPlatformConfigService) resolveOAuthCredentials(ctx context.Context) (clientID, clientSecret, redirectURI string, err error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return "", "", "", err
	}
	stored := rec.Config

	clientID = strings.TrimSpace(stored.OAuthClientID)
	if clientID == "" {
		clientID = strings.TrimSpace(s.cfg.YandexMetrikaClientID)
	}

	clientSecret, err = s.decryptSecret(stored.OAuthClientSecretEncrypted)
	if err != nil {
		return "", "", "", err
	}
	if clientSecret == "" {
		clientSecret = strings.TrimSpace(s.cfg.YandexMetrikaClientSecret)
	}

	redirectURI = s.cfg.MetrikaOAuthRedirectURI()

	if clientID == "" || clientSecret == "" {
		return "", "", "", ErrMetrikaPlatformNotConfigured
	}
	return clientID, clientSecret, redirectURI, nil
}

func (s *MetrikaPlatformConfigService) buildAdminView(rec *model.MetrikaPlatformConfigRecord) *model.MetrikaPlatformAdminView {
	cfg := rec.Config
	secret := s.decryptSecretOrEmpty(cfg.OAuthClientSecretEncrypted)
	if secret == "" {
		secret = strings.TrimSpace(s.cfg.YandexMetrikaClientSecret)
	}
	return &model.MetrikaPlatformAdminView{
		Enabled:          cfg.Enabled,
		OAuthClientID:    cfg.OAuthClientID,
		ClientSecretSet:  secret != "",
		ClientSecretHint: model.MaskOAuthClientSecret(secret),
		OAuthRedirectURI: s.cfg.MetrikaOAuthRedirectURI(),
		UpdatedAt:        rec.UpdatedAt,
	}
}

func (s *MetrikaPlatformConfigService) decryptSecret(enc string) (string, error) {
	enc = strings.TrimSpace(enc)
	if enc == "" {
		return "", nil
	}
	if s.cipher == nil {
		return "", ErrCryptoUnavailable
	}
	plain, err := s.cipher.Decrypt(enc)
	if err != nil {
		return "", fmt.Errorf("saved oauth client secret cannot be decrypted; save the secret again")
	}
	return strings.TrimSpace(plain), nil
}

func (s *MetrikaPlatformConfigService) decryptSecretOrEmpty(enc string) string {
	plain, err := s.decryptSecret(enc)
	if err != nil {
		return ""
	}
	return plain
}
