package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var ErrInvalidInstagramProviderSettings = errors.New("invalid instagram provider settings")

type InstagramProviderSettingsService struct {
	repo *repository.InstagramProviderSettingsRepository
}

func NewInstagramProviderSettingsService(repo *repository.InstagramProviderSettingsRepository) *InstagramProviderSettingsService {
	return &InstagramProviderSettingsService{repo: repo}
}

func (s *InstagramProviderSettingsService) GetEffective(ctx context.Context) (model.InstagramProviderSettings, error) {
	rec, err := s.repo.Get(ctx)
	if errors.Is(err, repository.ErrNotFound) {
		return model.DefaultInstagramProviderSettings(), nil
	}
	if err != nil {
		return model.InstagramProviderSettings{}, err
	}
	return rec.Config, nil
}

func (s *InstagramProviderSettingsService) GetAdminView(ctx context.Context) (*model.InstagramProviderAdminView, error) {
	cfg, err := s.GetEffective(ctx)
	if err != nil {
		return nil, err
	}
	return &model.InstagramProviderAdminView{Settings: cfg}, nil
}

func (s *InstagramProviderSettingsService) Update(ctx context.Context, cfg model.InstagramProviderSettings) (*model.InstagramProviderAdminView, error) {
	cfg.ProxyURLs = normalizeProxyURLs(cfg.ProxyURLs)
	cfg.ProxyActiveURL = strings.TrimSpace(cfg.ProxyActiveURL)
	if cfg.ProxyEnabled && cfg.ProxyActiveURL == "" && len(cfg.ProxyURLs) > 0 {
		cfg.ProxyActiveURL = cfg.ProxyURLs[0]
	}
	if !cfg.ProxyEnabled {
		cfg.ProxyActiveURL = ""
	}
	if cfg.ProxyEnabled && len(cfg.ProxyURLs) == 0 {
		return nil, fmt.Errorf("%w: укажите хотя бы один proxy URL", ErrInvalidInstagramProviderSettings)
	}
	for _, raw := range cfg.ProxyURLs {
		u, err := parseHTTPProxyURL(raw)
		if err != nil || u.Host == "" || strings.ToLower(u.Scheme) != "http" {
			return nil, fmt.Errorf("%w: поддерживаются только корректные http:// proxy URL", ErrInvalidInstagramProviderSettings)
		}
	}
	updated, err := s.repo.Update(ctx, cfg)
	if err != nil {
		return nil, err
	}
	return &model.InstagramProviderAdminView{Settings: updated.Config, UpdatedAt: updated.UpdatedAt}, nil
}

func (s *InstagramProviderSettingsService) HTTPClient(ctx context.Context) (*http.Client, error) {
	cfg, err := s.GetEffective(ctx)
	if err != nil {
		return nil, err
	}
	base := &http.Client{Timeout: 90 * time.Second, Transport: directHTTPTransport()}
	if !cfg.ProxyEnabled {
		return base, nil
	}
	proxies := buildProxyChain("", cfg.ProxyActiveURL, cfg.ProxyURLs)
	if len(proxies) == 0 {
		return base, nil
	}
	return &http.Client{Timeout: base.Timeout, Transport: &instagramProxyRoundTripper{base: base, proxies: proxies, failover: cfg.ProxyAutoFailover}}, nil
}

type instagramProxyRoundTripper struct {
	base     *http.Client
	proxies  []string
	failover bool
}

func (t *instagramProxyRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	var body []byte
	if req.Body != nil {
		var err error
		body, err = io.ReadAll(req.Body)
		req.Body.Close()
		if err != nil {
			return nil, err
		}
	}
	makeReq := func(client *http.Client) (*http.Response, error) {
		clone := req.Clone(req.Context())
		clone.Body = io.NopCloser(bytes.NewReader(body))
		return client.Do(clone)
	}
	var last error
	for i, raw := range t.proxies {
		client, err := httpClientForProxy(t.base, raw)
		if err != nil {
			last = err
			if !t.failover {
				return nil, err
			}
			continue
		}
		resp, err := makeReq(client)
		if err == nil {
			return resp, nil
		}
		last = err
		if !t.failover || i == len(t.proxies)-1 {
			return nil, err
		}
	}
	return nil, last
}
