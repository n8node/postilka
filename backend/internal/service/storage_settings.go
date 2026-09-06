package service

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var ErrInvalidStorageSettings = errors.New("invalid storage settings")

type StorageSettingsService struct {
	repo *repository.StorageSettingsRepository
	cfg  *config.Config
}

func NewStorageSettingsService(repo *repository.StorageSettingsRepository, cfg *config.Config) *StorageSettingsService {
	return &StorageSettingsService{repo: repo, cfg: cfg}
}

func (s *StorageSettingsService) GetStored(ctx context.Context) (*model.StorageSettingsRecord, error) {
	rec, err := s.repo.Get(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			def := model.DefaultStorageSettings()
			return &model.StorageSettingsRecord{Config: def}, nil
		}
		return nil, err
	}
	return rec, nil
}

func (s *StorageSettingsService) GetEffective(ctx context.Context) (model.StorageSettings, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return model.StorageSettings{}, err
	}
	return rec.Config, nil
}

func (s *StorageSettingsService) GetAdminView(ctx context.Context) (*model.StorageAdminView, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}
	return s.buildAdminView(rec), nil
}

func (s *StorageSettingsService) Update(ctx context.Context, req model.StorageAdminUpdateRequest) (*model.StorageAdminView, error) {
	if err := validateStorageSettings(req); err != nil {
		return nil, err
	}

	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}

	cfg := rec.Config
	cfg.Endpoint = strings.TrimSpace(req.Endpoint)
	cfg.Bucket = strings.TrimSpace(req.Bucket)
	cfg.Region = strings.TrimSpace(req.Region)
	cfg.AccessKey = strings.TrimSpace(req.AccessKey)
	cfg.UseSSL = req.UseSSL
	cfg.PathStyle = req.PathStyle
	cfg.Enabled = req.Enabled

	if strings.TrimSpace(req.SecretKey) != "" {
		cfg.SecretKey = strings.TrimSpace(req.SecretKey)
	}

	if cfg.Region == "" {
		cfg.Region = "ru-central1"
	}

	// Complete S3 config is enough for media storage; keep the admin toggle in sync.
	if StorageConfigured(cfg) {
		cfg.Enabled = true
	}

	updated, err := s.repo.Update(ctx, cfg)
	if err != nil {
		return nil, err
	}
	return s.buildAdminView(updated), nil
}

func (s *StorageSettingsService) TestConnection(ctx context.Context) (*model.StorageTestResult, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}
	st := rec.Config

	if strings.TrimSpace(st.Endpoint) == "" {
		return &model.StorageTestResult{OK: false, Message: "Укажите endpoint (URL)"}, nil
	}
	if strings.TrimSpace(st.Bucket) == "" {
		return &model.StorageTestResult{OK: false, Message: "Укажите имя бакета"}, nil
	}
	if strings.TrimSpace(st.AccessKey) == "" {
		return &model.StorageTestResult{OK: false, Message: "Укажите Access Key ID"}, nil
	}
	if strings.TrimSpace(st.SecretKey) == "" {
		return &model.StorageTestResult{OK: false, Message: "Укажите Secret Access Key"}, nil
	}

	client, err := newS3Client(st)
	if err != nil {
		return &model.StorageTestResult{OK: false, Message: "Некорректный endpoint: " + err.Error()}, nil
	}

	_, err = client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(st.Bucket),
	})
	if err != nil {
		return &model.StorageTestResult{
			OK:      false,
			Message: "Не удалось подключиться к бакету: " + sanitizeS3Error(err),
		}, nil
	}

	return &model.StorageTestResult{
		OK:      true,
		Message: fmt.Sprintf("Соединение успешно. Бакет «%s» доступен.", st.Bucket),
	}, s.enableIfConfigured(ctx, st)
}

func (s *StorageSettingsService) enableIfConfigured(ctx context.Context, st model.StorageSettings) error {
	if !StorageConfigured(st) || st.Enabled {
		return nil
	}
	st.Enabled = true
	_, err := s.repo.Update(ctx, st)
	return err
}

func (s *StorageSettingsService) buildAdminView(rec *model.StorageSettingsRecord) *model.StorageAdminView {
	st := rec.Config
	origins := buildCORSOrigins(s.cfg.Domain, s.cfg.PublicAppURL)
	return &model.StorageAdminView{
		Endpoint:      st.Endpoint,
		Bucket:        st.Bucket,
		Region:        st.Region,
		AccessKey:     st.AccessKey,
		SecretKeySet:  strings.TrimSpace(st.SecretKey) != "",
		SecretKeyHint: maskSecret(st.SecretKey),
		UseSSL:        st.UseSSL,
		PathStyle:     st.PathStyle,
		Enabled:       st.Enabled,
		CORSOrigins:   origins,
		CORSXML:       buildCORSXML(origins),
		UpdatedAt:     rec.UpdatedAt,
	}
}

func validateStorageSettings(req model.StorageAdminUpdateRequest) error {
	if req.Enabled {
		if strings.TrimSpace(req.Endpoint) == "" {
			return fmt.Errorf("%w: endpoint required when enabled", ErrInvalidStorageSettings)
		}
		if strings.TrimSpace(req.Bucket) == "" {
			return fmt.Errorf("%w: bucket required when enabled", ErrInvalidStorageSettings)
		}
		if strings.TrimSpace(req.AccessKey) == "" {
			return fmt.Errorf("%w: access_key required when enabled", ErrInvalidStorageSettings)
		}
	}
	return nil
}

func buildCORSOrigins(domain, publicAppURL string) []string {
	origins := []string{
		"http://localhost:3000",
		"http://localhost:3001",
	}
	domain = strings.TrimSpace(domain)
	if domain != "" && domain != "localhost" {
		origins = append([]string{
			"https://" + domain,
			"https://www." + domain,
		}, origins...)
	}
	if u, err := url.Parse(publicAppURL); err == nil && u.Scheme != "" && u.Host != "" {
		origin := u.Scheme + "://" + u.Host
		if !stringSliceContains(origins, origin) {
			origins = append(origins, origin)
		}
	}
	return origins
}

func buildCORSXML(origins []string) string {
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	b.WriteString(`<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">` + "\n")
	b.WriteString("  <CORSRule>\n")
	for _, o := range origins {
		b.WriteString("    <AllowedOrigin>" + o + "</AllowedOrigin>\n")
	}
	for _, method := range []string{"GET", "PUT", "POST", "DELETE", "HEAD"} {
		b.WriteString("    <AllowedMethod>" + method + "</AllowedMethod>\n")
	}
	b.WriteString("    <AllowedHeader>*</AllowedHeader>\n")
	b.WriteString("    <ExposeHeader>ETag</ExposeHeader>\n")
	b.WriteString("  </CORSRule>\n")
	b.WriteString("</CORSConfiguration>")
	return b.String()
}

func newS3Client(st model.StorageSettings) (*s3.Client, error) {
	endpoint := normalizeEndpoint(st.Endpoint, st.UseSSL)
	if endpoint == "" {
		return nil, errors.New("empty endpoint")
	}

	region := strings.TrimSpace(st.Region)
	if region == "" {
		region = "us-east-1"
	}

	awsCfg := aws.Config{
		Region:      region,
		Credentials: credentials.NewStaticCredentialsProvider(st.AccessKey, st.SecretKey, ""),
	}

	return s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = st.PathStyle
		// Beget/other S3-compatible storage rejects the optional SDK checksum
		// headers/trailers on multipart UploadPart with
		// XAmzContentSHA256Mismatch. Calculate checksums only when the service
		// explicitly requires one, which preserves AWS compatibility while
		// avoiding unsupported optional checksum negotiation.
		o.RequestChecksumCalculation = aws.RequestChecksumCalculationWhenRequired
	}), nil
}

func normalizeEndpoint(raw string, useSSL bool) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if !strings.Contains(raw, "://") {
		scheme := "http"
		if useSSL {
			scheme = "https"
		}
		raw = scheme + "://" + raw
	}
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" {
		return strings.TrimSuffix(raw, "/")
	}
	u.Path = strings.TrimSuffix(u.Path, "/")
	return u.Scheme + "://" + u.Host + u.Path
}

func sanitizeS3Error(err error) string {
	msg := err.Error()
	if len(msg) > 200 {
		return msg[:200] + "…"
	}
	return msg
}

func stringSliceContains(items []string, target string) bool {
	for _, item := range items {
		if item == target {
			return true
		}
	}
	return false
}

func StorageConfigured(st model.StorageSettings) bool {
	return strings.TrimSpace(st.Endpoint) != "" &&
		strings.TrimSpace(st.Bucket) != "" &&
		strings.TrimSpace(st.AccessKey) != "" &&
		strings.TrimSpace(st.SecretKey) != ""
}

func IsStorageEnabled(st model.StorageSettings) bool {
	return st.Enabled && StorageConfigured(st)
}
