package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrSketchStyleNotFound     = errors.New("sketch style not found")
	ErrSketchStyleNotPublished = errors.New("sketch style not published")
	ErrSketchSourceRequired    = errors.New("sketch source required")
	ErrSketchTitleRequired     = errors.New("sketch style title required")
	ErrSketchPromptRequired    = errors.New("sketch style prompt required")
	ErrSketchPreviewInvalid    = errors.New("sketch preview invalid")
)

type SketchService struct {
	repo        *repository.SketchStyleRepository
	generation  *GenerationService
	objectStore *ObjectStorage
}

func NewSketchService(
	repo *repository.SketchStyleRepository,
	generation *GenerationService,
	objectStore *ObjectStorage,
) *SketchService {
	return &SketchService{repo: repo, generation: generation, objectStore: objectStore}
}

func (s *SketchService) ListPublic(ctx context.Context) ([]model.SketchStylePublicView, error) {
	items, err := s.repo.List(ctx, true)
	if err != nil {
		return nil, err
	}
	out := make([]model.SketchStylePublicView, 0, len(items))
	for _, item := range items {
		out = append(out, item.ToPublicView())
	}
	return out, nil
}

func (s *SketchService) GetPublic(ctx context.Context, id string) (model.SketchStylePublicView, error) {
	item, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return model.SketchStylePublicView{}, err
	}
	if !item.IsPublished {
		return model.SketchStylePublicView{}, ErrSketchStyleNotPublished
	}
	return item.ToPublicView(), nil
}

func (s *SketchService) ListAdmin(ctx context.Context) ([]model.SketchStyleAdminView, error) {
	items, err := s.repo.List(ctx, false)
	if err != nil {
		return nil, err
	}
	out := make([]model.SketchStyleAdminView, 0, len(items))
	for _, item := range items {
		out = append(out, item.ToAdminView())
	}
	return out, nil
}

func (s *SketchService) CreateAdmin(ctx context.Context, req model.SketchStyleWriteRequest) (model.SketchStyleAdminView, error) {
	item, err := sketchStyleFromWrite(model.SketchStyle{}, req)
	if err != nil {
		return model.SketchStyleAdminView{}, err
	}
	created, err := s.repo.Create(ctx, item)
	if err != nil {
		return model.SketchStyleAdminView{}, err
	}
	return created.ToAdminView(), nil
}

func (s *SketchService) UpdateAdmin(ctx context.Context, id string, req model.SketchStyleWriteRequest) (model.SketchStyleAdminView, error) {
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return model.SketchStyleAdminView{}, err
	}
	item, err := sketchStyleFromWrite(current, req)
	if err != nil {
		return model.SketchStyleAdminView{}, err
	}
	updated, err := s.repo.Update(ctx, item)
	if err != nil {
		return model.SketchStyleAdminView{}, err
	}
	return updated.ToAdminView(), nil
}

func (s *SketchService) DeleteAdmin(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *SketchService) PreviewPresignedURL(ctx context.Context, id string, publishedOnly bool) (string, error) {
	item, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return "", err
	}
	if publishedOnly && !item.IsPublished {
		return "", ErrSketchStyleNotPublished
	}
	key := strings.TrimSpace(item.PreviewS3Key)
	if key == "" {
		return "", repository.ErrNotFound
	}
	return s.objectStore.PresignGetWithOptions(ctx, key, PresignGetOptions{
		Expires:      time.Hour,
		Inline:       true,
		CacheControl: "public, max-age=86400",
	})
}

func (s *SketchService) UploadPreviewAdmin(ctx context.Context, id string, file multipart.File, header *multipart.FileHeader) error {
	if file == nil || header == nil {
		return ErrSketchPreviewInvalid
	}
	defer file.Close()

	item, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	const maxSize = 10 << 20
	data, err := io.ReadAll(io.LimitReader(file, maxSize+1))
	if err != nil {
		return err
	}
	if len(data) == 0 || len(data) > maxSize {
		return ErrSketchPreviewInvalid
	}

	contentType := strings.Split(strings.TrimSpace(header.Header.Get("Content-Type")), ";")[0]
	if contentType == "" {
		contentType = http.DetectContentType(data)
		contentType = strings.Split(contentType, ";")[0]
	}
	if !strings.HasPrefix(contentType, "image/") {
		return ErrSketchPreviewInvalid
	}

	ext := ".jpg"
	switch contentType {
	case "image/png":
		ext = ".png"
	case "image/webp":
		ext = ".webp"
	}
	key := fmt.Sprintf("postilka/sketch-styles/%s/preview%s", item.ID, ext)
	if err := s.objectStore.PutObject(ctx, key, contentType, data); err != nil {
		return err
	}
	oldKey := strings.TrimSpace(item.PreviewS3Key)
	if err := s.repo.UpdatePreview(ctx, id, key, contentType); err != nil {
		_ = s.objectStore.DeleteObject(ctx, key)
		return err
	}
	if oldKey != "" && oldKey != key {
		_ = s.objectStore.DeleteObject(ctx, oldKey)
	}
	return nil
}

func (s *SketchService) Generate(
	ctx context.Context,
	userID string,
	r *http.Request,
	req model.SketchGenerateRequest,
) (StartGenerateResult, string, error) {
	styleID := strings.TrimSpace(req.StyleID)
	if styleID == "" {
		return StartGenerateResult{}, "", ErrSketchStyleNotFound
	}
	style, err := s.repo.GetByID(ctx, styleID)
	if err != nil {
		return StartGenerateResult{}, "", err
	}
	if !style.IsPublished {
		return StartGenerateResult{}, "", ErrSketchStyleNotPublished
	}

	sourceID := strings.TrimSpace(req.SourceUploadID)
	if sourceID == "" {
		return StartGenerateResult{}, "", ErrSketchSourceRequired
	}

	strength := req.Strength
	if strength <= 0 {
		strength = style.DefaultStrength
	}
	if strength < 0 {
		strength = 0
	}
	if strength > 1 {
		strength = 1
	}

	aspectRatio := strings.TrimSpace(req.AspectRatio)
	if aspectRatio == "" {
		aspectRatio = style.AspectRatio
	}
	if aspectRatio == "" {
		aspectRatio = "1:1"
	}

	prompt := composeSketchPrompt(style, strings.TrimSpace(req.Prompt), strength)
	output := strings.ToLower(strings.TrimSpace(req.Output))
	if output == "" {
		output = "image"
	}

	switch output {
	case "video":
		duration := req.Duration
		if duration <= 0 {
			duration = 5
		}
		result, err := s.generation.StartGenerateVideo(ctx, userID, r, GenerateVideoInput{
			Mode:           model.KieVideoModeImageToVideo,
			Prompt:         prompt,
			AspectRatio:    aspectRatio,
			Duration:       duration,
			SourceUploadID: sourceID,
		})
		return result, "video", err
	default:
		result, err := s.generation.StartGenerate(ctx, userID, r, GenerateImageInput{
			Mode:           "sketch",
			Prompt:         prompt,
			AspectRatio:    aspectRatio,
			SourceUploadID: sourceID,
		})
		return result, "image", err
	}
}

func composeSketchPrompt(style model.SketchStyle, userPrompt string, strength float64) string {
	parts := []string{strings.TrimSpace(style.PositivePrompt)}
	if userPrompt != "" {
		parts = append(parts, userPrompt)
	}
	switch {
	case strength >= 0.75:
		parts = append(parts, "Strictly follow the sketch composition, layout and object placement from the reference drawing.")
	case strength >= 0.45:
		parts = append(parts, "Use the sketch as a structural guide while applying the requested visual style.")
	default:
		parts = append(parts, "Loosely inspired by the sketch layout; prioritize the described style and scene.")
	}
	if neg := strings.TrimSpace(style.NegativePrompt); neg != "" {
		parts = append(parts, "Avoid: "+neg)
	}
	return strings.Join(parts, ". ")
}

func sketchStyleFromWrite(current model.SketchStyle, req model.SketchStyleWriteRequest) (model.SketchStyle, error) {
	title := strings.TrimSpace(req.Title)
	if title == "" && current.ID == "" {
		return model.SketchStyle{}, ErrSketchTitleRequired
	}
	if title != "" {
		current.Title = title
	}
	if req.Description != "" || current.ID == "" {
		current.Description = strings.TrimSpace(req.Description)
	}
	positive := strings.TrimSpace(req.PositivePrompt)
	if positive == "" && current.ID == "" {
		return model.SketchStyle{}, ErrSketchPromptRequired
	}
	if positive != "" {
		current.PositivePrompt = positive
	}
	if req.NegativePrompt != "" || current.ID == "" {
		current.NegativePrompt = strings.TrimSpace(req.NegativePrompt)
	}
	if req.DefaultStrength != nil {
		st := *req.DefaultStrength
		if st < 0 {
			st = 0
		}
		if st > 1 {
			st = 1
		}
		current.DefaultStrength = st
	} else if current.ID == "" {
		current.DefaultStrength = 0.65
	}
	if ar := strings.TrimSpace(req.AspectRatio); ar != "" {
		current.AspectRatio = ar
	} else if current.ID == "" {
		current.AspectRatio = "1:1"
	}
	if req.SortOrder != nil {
		current.SortOrder = *req.SortOrder
	}
	if req.IsPublished != nil {
		current.IsPublished = *req.IsPublished
	}
	return current, nil
}

// ExportSketchPNG validates sketch bytes for admin tooling (optional).
func ExportSketchPNG(data []byte) ([]byte, error) {
	if len(data) == 0 {
		return nil, ErrSketchPreviewInvalid
	}
	if !bytes.HasPrefix(data, []byte{0x89, 'P', 'N', 'G'}) {
		return nil, ErrSketchPreviewInvalid
	}
	return data, nil
}
