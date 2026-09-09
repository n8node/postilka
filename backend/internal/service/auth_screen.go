package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

const (
	maxAuthScreenLogoUpload  = 5 << 20
	maxAuthScreenMediaUpload = 50 << 20
	authScreenTagMax         = 80
	authScreenTitleMax       = 160
	authScreenDescriptionMax = 500
	minAuthScreenDuration    = 3
	maxAuthScreenDuration    = 60
)

var (
	ErrAuthScreenInvalid  = errors.New("auth screen invalid")
	ErrAuthScreenNotFound = errors.New("auth screen asset not found")
)

type AuthScreenService struct {
	repo  *repository.AuthScreenRepository
	store *ObjectStorage
}

func NewAuthScreenService(repo *repository.AuthScreenRepository, store *ObjectStorage) *AuthScreenService {
	return &AuthScreenService{repo: repo, store: store}
}

func (s *AuthScreenService) PublicView(ctx context.Context) (model.AuthScreenSettings, error) {
	return s.view(ctx, true)
}

func (s *AuthScreenService) AdminView(ctx context.Context) (model.AuthScreenAdminView, error) {
	settings, err := s.view(ctx, false)
	if err != nil {
		return model.AuthScreenAdminView{}, err
	}
	return model.AuthScreenAdminView{Settings: settings}, nil
}

func (s *AuthScreenService) view(ctx context.Context, publicOnly bool) (model.AuthScreenSettings, error) {
	config, err := s.repo.GetSettings(ctx)
	if errors.Is(err, repository.ErrNotFound) {
		config = repository.AuthScreenSettingsRecord{}
	} else if err != nil {
		return model.AuthScreenSettings{}, err
	}

	slides, err := s.repo.ListSlides(ctx)
	if err != nil {
		return model.AuthScreenSettings{}, err
	}
	if slides == nil {
		slides = []model.AuthScreenSlide{}
	}

	result := model.AuthScreenSettings{
		Slides:    make([]model.AuthScreenSlide, 0, len(slides)),
		UpdatedAt: config.UpdatedAt,
	}
	if config.LogoS3Key != "" {
		result.LogoURL = model.AuthScreenLogoAPIPath(config.UpdatedAt)
	}
	for _, slide := range slides {
		if publicOnly && (!slide.Enabled || slide.MediaS3Key == "") {
			continue
		}
		if slide.MediaS3Key != "" {
			slide.MediaURL = model.AuthScreenSlideMediaAPIPath(slide.Slot, slide.UpdatedAt)
		}
		result.Slides = append(result.Slides, slide)
	}
	return result, nil
}

func (s *AuthScreenService) UpdateSlide(ctx context.Context, slot int, input model.AuthScreenSlideUpdate) (*model.AuthScreenSlide, error) {
	if !validAuthScreenSlot(slot) {
		return nil, ErrAuthScreenInvalid
	}
	input.Tag = strings.TrimSpace(input.Tag)
	input.Title = strings.TrimSpace(input.Title)
	input.Description = strings.TrimSpace(input.Description)
	if utf8.RuneCountInString(input.Tag) > authScreenTagMax ||
		utf8.RuneCountInString(input.Title) > authScreenTitleMax ||
		utf8.RuneCountInString(input.Description) > authScreenDescriptionMax {
		return nil, ErrAuthScreenInvalid
	}
	if input.DurationSeconds < minAuthScreenDuration || input.DurationSeconds > maxAuthScreenDuration {
		return nil, ErrAuthScreenInvalid
	}
	slide, err := s.repo.UpdateSlide(ctx, slot, input)
	if err != nil {
		return nil, err
	}
	if slide.MediaS3Key != "" {
		slide.MediaURL = model.AuthScreenSlideMediaAPIPath(slide.Slot, slide.UpdatedAt)
	}
	return slide, nil
}

func (s *AuthScreenService) UploadLogo(ctx context.Context, file multipart.File, header *multipart.FileHeader) (*model.AuthScreenAdminView, error) {
	if file == nil || header == nil {
		return nil, ErrAuthScreenInvalid
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, maxAuthScreenLogoUpload+1))
	if err != nil {
		return nil, err
	}
	if len(data) == 0 || len(data) > maxAuthScreenLogoUpload {
		return nil, ErrAuthScreenInvalid
	}
	contentType := authScreenContentType(header, data)
	if !isAuthScreenImageType(contentType) {
		return nil, ErrAuthScreenInvalid
	}

	previous, err := s.repo.GetSettings(ctx)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}
	key := fmt.Sprintf("postilka/auth-screen/logo/%s%s", uuid.NewString(), authScreenExtension(contentType))
	if err := s.store.PutObjectWithCacheControl(ctx, key, contentType, "public, max-age=300", data); err != nil {
		return nil, err
	}
	if _, err := s.repo.UpdateLogo(ctx, key, contentType); err != nil {
		_ = s.store.DeleteObject(ctx, key)
		return nil, err
	}
	if previous.LogoS3Key != "" && previous.LogoS3Key != key {
		_ = s.store.DeleteObject(ctx, previous.LogoS3Key)
	}
	view, err := s.AdminView(ctx)
	if err != nil {
		return nil, err
	}
	return &view, nil
}

func (s *AuthScreenService) DeleteLogo(ctx context.Context) error {
	previous, err := s.repo.GetSettings(ctx)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return err
	}
	if err := s.repo.ClearLogo(ctx); err != nil {
		return err
	}
	if previous.LogoS3Key != "" {
		_ = s.store.DeleteObject(ctx, previous.LogoS3Key)
	}
	return nil
}

func (s *AuthScreenService) UploadSlideMedia(
	ctx context.Context,
	slot int,
	file multipart.File,
	header *multipart.FileHeader,
) (*model.AuthScreenAdminView, error) {
	if !validAuthScreenSlot(slot) || file == nil || header == nil {
		return nil, ErrAuthScreenInvalid
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, maxAuthScreenMediaUpload+1))
	if err != nil {
		return nil, err
	}
	if len(data) == 0 || len(data) > maxAuthScreenMediaUpload {
		return nil, ErrAuthScreenInvalid
	}
	contentType := authScreenContentType(header, data)
	kind := authScreenMediaKind(contentType)
	if kind == "" {
		return nil, ErrAuthScreenInvalid
	}

	previous, err := s.repo.GetSlide(ctx, slot)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrAuthScreenNotFound
	}
	if err != nil {
		return nil, err
	}
	key := fmt.Sprintf("postilka/auth-screen/slides/%d/%s%s", slot, uuid.NewString(), authScreenExtension(contentType))
	if err := s.store.PutObjectWithCacheControl(ctx, key, contentType, "public, max-age=300", data); err != nil {
		return nil, err
	}
	if _, err := s.repo.UpdateSlideMedia(ctx, slot, kind, key, contentType); err != nil {
		_ = s.store.DeleteObject(ctx, key)
		return nil, err
	}
	if previous.MediaS3Key != "" && previous.MediaS3Key != key {
		_ = s.store.DeleteObject(ctx, previous.MediaS3Key)
	}
	view, err := s.AdminView(ctx)
	if err != nil {
		return nil, err
	}
	return &view, nil
}

func (s *AuthScreenService) DeleteSlideMedia(ctx context.Context, slot int) error {
	if !validAuthScreenSlot(slot) {
		return ErrAuthScreenInvalid
	}
	previous, err := s.repo.GetSlide(ctx, slot)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrAuthScreenNotFound
	}
	if err != nil {
		return err
	}
	if _, err := s.repo.UpdateSlideMedia(ctx, slot, "", "", ""); err != nil {
		return err
	}
	if previous.MediaS3Key != "" {
		_ = s.store.DeleteObject(ctx, previous.MediaS3Key)
	}
	return nil
}

func (s *AuthScreenService) FetchLogo(ctx context.Context) ([]byte, string, error) {
	config, err := s.repo.GetSettings(ctx)
	if err != nil || config.LogoS3Key == "" {
		return nil, "", ErrAuthScreenNotFound
	}
	return s.fetchObject(ctx, config.LogoS3Key, config.LogoContentType, maxAuthScreenLogoUpload)
}

func (s *AuthScreenService) FetchSlideMedia(ctx context.Context, slot int) ([]byte, string, error) {
	if !validAuthScreenSlot(slot) {
		return nil, "", ErrAuthScreenNotFound
	}
	slide, err := s.repo.GetSlide(ctx, slot)
	if err != nil || slide.MediaS3Key == "" {
		return nil, "", ErrAuthScreenNotFound
	}
	return s.fetchObject(ctx, slide.MediaS3Key, slide.MediaType, maxAuthScreenMediaUpload)
}

func (s *AuthScreenService) LogoPresignedURL(ctx context.Context) (string, error) {
	config, err := s.repo.GetSettings(ctx)
	if err != nil || config.LogoS3Key == "" {
		return "", ErrAuthScreenNotFound
	}
	return s.store.PresignGetWithOptions(ctx, config.LogoS3Key, authScreenPresignOptions())
}

func (s *AuthScreenService) SlideMediaPresignedURL(ctx context.Context, slot int) (string, error) {
	if !validAuthScreenSlot(slot) {
		return "", ErrAuthScreenNotFound
	}
	slide, err := s.repo.GetSlide(ctx, slot)
	if err != nil || slide.MediaS3Key == "" {
		return "", ErrAuthScreenNotFound
	}
	return s.store.PresignGetWithOptions(ctx, slide.MediaS3Key, authScreenPresignOptions())
}

func authScreenPresignOptions() PresignGetOptions {
	return PresignGetOptions{
		Expires:      15 * time.Minute,
		Inline:       true,
		CacheControl: "public, max-age=300",
	}
}

func (s *AuthScreenService) fetchObject(ctx context.Context, key, contentType string, maxSize int64) ([]byte, string, error) {
	body, detectedType, err := s.store.GetObject(ctx, key)
	if err != nil {
		return nil, "", ErrAuthScreenNotFound
	}
	defer body.Close()
	data, err := io.ReadAll(io.LimitReader(body, maxSize+1))
	if err != nil || len(data) == 0 || int64(len(data)) > maxSize {
		return nil, "", ErrAuthScreenNotFound
	}
	if strings.TrimSpace(contentType) == "" {
		contentType = detectedType
	}
	return data, contentType, nil
}

func validAuthScreenSlot(slot int) bool {
	return slot >= 1 && slot <= model.AuthScreenMaxSlides
}

func authScreenContentType(header *multipart.FileHeader, data []byte) string {
	contentType := strings.TrimSpace(header.Header.Get("Content-Type"))
	contentType = strings.Split(contentType, ";")[0]
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = http.DetectContentType(data)
	}
	if contentType == "application/octet-stream" {
		contentType = contentTypeFromExtension(header.Filename)
	}
	return strings.ToLower(strings.TrimSpace(contentType))
}

func contentTypeFromExtension(filename string) string {
	switch strings.ToLower(filepath.Ext(filename)) {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".webp":
		return "image/webp"
	case ".mp4", ".m4v":
		return "video/mp4"
	case ".webm":
		return "video/webm"
	default:
		return ""
	}
}

func isAuthScreenImageType(contentType string) bool {
	switch contentType {
	case "image/jpeg", "image/png", "image/webp":
		return true
	default:
		return false
	}
}

func authScreenMediaKind(contentType string) string {
	if isAuthScreenImageType(contentType) {
		return "image"
	}
	if contentType == "video/mp4" || contentType == "video/webm" {
		return "video"
	}
	return ""
}

func authScreenExtension(contentType string) string {
	switch contentType {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "video/webm":
		return ".webm"
	default:
		return ".mp4"
	}
}
