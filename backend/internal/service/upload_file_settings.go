package service

import (
	"context"
	"errors"
	"path/filepath"
	"strings"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrFileTypeNotAllowed     = errors.New("file type not allowed")
	ErrInvalidUploadSettings  = errors.New("invalid upload file settings")
)

type UploadFileSettingsService struct {
	repo *repository.UploadFileSettingsRepository
}

func NewUploadFileSettingsService(repo *repository.UploadFileSettingsRepository) *UploadFileSettingsService {
	return &UploadFileSettingsService{repo: repo}
}

func (s *UploadFileSettingsService) GetStored(ctx context.Context) (*model.UploadFileSettingsRecord, error) {
	rec, err := s.repo.Get(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			def := model.DefaultUploadFileSettings()
			return &model.UploadFileSettingsRecord{Config: def}, nil
		}
		return nil, err
	}
	return rec, nil
}

func (s *UploadFileSettingsService) GetEffective(ctx context.Context) (model.UploadFileSettings, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return model.UploadFileSettings{}, err
	}
	return normalizeUploadSettings(rec.Config), nil
}

func (s *UploadFileSettingsService) GetAdminView(ctx context.Context) (*model.UploadFileSettingsRecord, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}
	rec.Config = normalizeUploadSettings(rec.Config)
	return rec, nil
}

func (s *UploadFileSettingsService) Update(ctx context.Context, req model.UploadFileSettings) (*model.UploadFileSettingsRecord, error) {
	cfg := normalizeUploadSettings(req)
	if err := validateUploadSettings(cfg); err != nil {
		return nil, err
	}
	return s.repo.Update(ctx, cfg)
}

func (s *UploadFileSettingsService) BuildLimitsView(ctx context.Context, planMaxFileSize, planStorage *int64) (*model.UploadFileLimitsView, error) {
	rec, err := s.GetStored(ctx)
	if err != nil {
		return nil, err
	}
	cfg := normalizeUploadSettings(rec.Config)
	return &model.UploadFileLimitsView{
		AllowedExtensions:    append([]string(nil), cfg.AllowedExtensions...),
		MaxSizeImageBytes:    mbToBytes(cfg.MaxSizeImageMB),
		MaxSizeVideoBytes:    mbToBytes(cfg.MaxSizeVideoMB),
		MaxSizeAudioBytes:    mbToBytes(cfg.MaxSizeAudioMB),
		MaxSizeArchiveBytes:  mbToBytes(cfg.MaxSizeArchiveMB),
		MaxSizeOtherBytes:    mbToBytes(cfg.MaxSizeOtherMB),
		PlanMaxFileSizeBytes: planMaxFileSize,
		PlanStorageBytes:     planStorage,
		UpdatedAt:            rec.UpdatedAt,
	}, nil
}

func (s *UploadFileSettingsService) ValidateUpload(ctx context.Context, mimeType, fileName string, size int64, planMaxFileSize *int64) error {
	cfg, err := s.GetEffective(ctx)
	if err != nil {
		return err
	}
	ext := fileExtension(fileName)
	if ext == "" {
		return ErrFileTypeNotAllowed
	}
	if !extensionAllowed(cfg, ext) {
		return ErrFileTypeNotAllowed
	}
	if !mimeMatchesExtension(mimeType, ext) {
		return ErrFileTypeNotAllowed
	}
	cat := fileCategoryFromMime(mimeType, fileName)
	maxSize := s.maxSizeBytes(cfg, cat)
	if planMaxFileSize != nil && *planMaxFileSize > 0 && *planMaxFileSize < maxSize {
		maxSize = *planMaxFileSize
	}
	if size > maxSize {
		return ErrFileTooLarge
	}
	return nil
}

func (s *UploadFileSettingsService) maxSizeBytes(cfg model.UploadFileSettings, category string) int64 {
	switch category {
	case "image":
		return mbToBytes(cfg.MaxSizeImageMB)
	case "video":
		return mbToBytes(cfg.MaxSizeVideoMB)
	case "audio":
		return mbToBytes(cfg.MaxSizeAudioMB)
	case "archive":
		return mbToBytes(cfg.MaxSizeArchiveMB)
	default:
		return mbToBytes(cfg.MaxSizeOtherMB)
	}
}

func normalizeUploadSettings(cfg model.UploadFileSettings) model.UploadFileSettings {
	exts := make([]string, 0, len(cfg.AllowedExtensions))
	seen := make(map[string]struct{}, len(cfg.AllowedExtensions))
	for _, raw := range cfg.AllowedExtensions {
		ext := strings.ToLower(strings.TrimPrefix(strings.TrimSpace(raw), "."))
		if ext == "" {
			continue
		}
		if _, ok := seen[ext]; ok {
			continue
		}
		seen[ext] = struct{}{}
		exts = append(exts, ext)
	}
	if len(exts) == 0 {
		exts = model.DefaultUploadFileSettings().AllowedExtensions
	}
	if cfg.MaxSizeImageMB <= 0 {
		cfg.MaxSizeImageMB = 150
	}
	if cfg.MaxSizeVideoMB <= 0 {
		cfg.MaxSizeVideoMB = 500
	}
	if cfg.MaxSizeAudioMB <= 0 {
		cfg.MaxSizeAudioMB = 100
	}
	if cfg.MaxSizeArchiveMB <= 0 {
		cfg.MaxSizeArchiveMB = 200
	}
	if cfg.MaxSizeOtherMB <= 0 {
		cfg.MaxSizeOtherMB = 512
	}
	cfg.AllowedExtensions = exts
	return cfg
}

func validateUploadSettings(cfg model.UploadFileSettings) error {
	if len(cfg.AllowedExtensions) == 0 {
		return ErrInvalidUploadSettings
	}
	for _, mb := range []int{cfg.MaxSizeImageMB, cfg.MaxSizeVideoMB, cfg.MaxSizeAudioMB, cfg.MaxSizeArchiveMB, cfg.MaxSizeOtherMB} {
		if mb <= 0 || mb > 10240 {
			return ErrInvalidUploadSettings
		}
	}
	return nil
}

func extensionAllowed(cfg model.UploadFileSettings, ext string) bool {
	ext = strings.ToLower(strings.TrimPrefix(ext, "."))
	for _, allowed := range cfg.AllowedExtensions {
		if allowed == ext {
			return true
		}
	}
	return false
}

func fileExtension(fileName string) string {
	ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(fileName), "."))
	return ext
}

func mbToBytes(mb int) int64 {
	return int64(mb) * 1024 * 1024
}

func mimeMatchesExtension(mimeType, ext string) bool {
	m := strings.ToLower(strings.TrimSpace(mimeType))
	ext = strings.ToLower(ext)
	switch ext {
	case "jpg", "jpeg":
		return strings.HasPrefix(m, "image/") || m == "application/octet-stream" || m == ""
	case "png", "gif", "webp", "bmp", "svg", "heic", "heif", "tiff", "tif", "ico":
		return strings.HasPrefix(m, "image/") || m == "application/octet-stream" || m == ""
	case "mp4", "mov", "avi", "mkv", "webm", "m4v", "mpeg", "mpg", "wmv", "flv":
		return strings.HasPrefix(m, "video/") || m == "application/octet-stream" || m == ""
	case "mp3", "wav", "ogg", "m4a", "aac", "flac", "wma":
		return strings.HasPrefix(m, "audio/") || m == "application/octet-stream" || m == ""
	case "zip", "rar", "7z", "tar", "gz", "bz2":
		return strings.Contains(m, "zip") || strings.Contains(m, "tar") || strings.Contains(m, "rar") ||
			strings.Contains(m, "gzip") || strings.Contains(m, "x-7z") ||
			m == "application/octet-stream" || m == ""
	case "pdf":
		return m == "application/pdf" || m == "application/octet-stream" || m == ""
	case "doc":
		return strings.Contains(m, "msword") || m == "application/octet-stream" || m == ""
	case "docx":
		return strings.Contains(m, "wordprocessingml") || m == "application/octet-stream" || m == ""
	case "xls":
		return strings.Contains(m, "ms-excel") || m == "application/octet-stream" || m == ""
	case "xlsx":
		return strings.Contains(m, "spreadsheetml") || m == "application/octet-stream" || m == ""
	case "ppt":
		return strings.Contains(m, "ms-powerpoint") || m == "application/octet-stream" || m == ""
	case "pptx":
		return strings.Contains(m, "presentationml") || m == "application/octet-stream" || m == ""
	case "txt", "csv", "rtf", "md":
		return strings.HasPrefix(m, "text/") || m == "application/rtf" || m == "application/octet-stream" || m == ""
	default:
		return true
	}
}
