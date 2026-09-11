package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

const (
	minCarouselSlides = 3
	maxCarouselSlides = 6
	maxCarouselTitle  = 200
)

var ErrCarouselNotFound = errors.New("carousel not found")

type CarouselService struct {
	repo  *repository.CarouselRepository
	files *repository.WorkspaceFileRepository
}

func NewCarouselService(
	repo *repository.CarouselRepository,
	files *repository.WorkspaceFileRepository,
) *CarouselService {
	return &CarouselService{repo: repo, files: files}
}

func (s *CarouselService) List(ctx context.Context, workspaceID string) ([]model.Carousel, error) {
	return s.repo.ListByWorkspace(ctx, workspaceID)
}

func (s *CarouselService) Get(ctx context.Context, id, workspaceID string) (*model.Carousel, error) {
	carousel, err := s.repo.GetByID(ctx, id, workspaceID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrCarouselNotFound
	}
	return carousel, err
}

func (s *CarouselService) Create(ctx context.Context, workspaceID, userID string, req model.SaveCarouselRequest) (*model.Carousel, error) {
	carousel, err := s.prepare(ctx, workspaceID, userID, "", req)
	if err != nil {
		return nil, err
	}
	return s.repo.Create(ctx, carousel)
}

func (s *CarouselService) Update(ctx context.Context, id, workspaceID string, req model.SaveCarouselRequest) (*model.Carousel, error) {
	carousel, err := s.Get(ctx, id, workspaceID)
	if err != nil {
		return nil, err
	}
	prepared, err := s.prepare(ctx, workspaceID, "", id, req)
	if err != nil {
		return nil, err
	}
	prepared.CreatedBy = carousel.CreatedBy
	prepared.CreatedAt = carousel.CreatedAt
	return s.repo.Update(ctx, prepared)
}

func (s *CarouselService) Delete(ctx context.Context, id, workspaceID string) error {
	if err := s.repo.Delete(ctx, id, workspaceID); errors.Is(err, repository.ErrNotFound) {
		return ErrCarouselNotFound
	} else {
		return err
	}
}

func (s *CarouselService) prepare(ctx context.Context, workspaceID, userID, id string, req model.SaveCarouselRequest) (*model.Carousel, error) {
	title := strings.TrimSpace(req.Title)
	if title == "" {
		return nil, errors.New("carousel title is required")
	}
	if len([]rune(title)) > maxCarouselTitle {
		return nil, errors.New("carousel title is too long")
	}
	if len(req.Slides) < minCarouselSlides || len(req.Slides) > maxCarouselSlides {
		return nil, fmt.Errorf("carousel must contain %d to %d slides", minCarouselSlides, maxCarouselSlides)
	}
	for index := range req.Slides {
		slide := &req.Slides[index]
		slide.Role = strings.TrimSpace(slide.Role)
		slide.Headline = strings.TrimSpace(slide.Headline)
		slide.Body = strings.TrimSpace(slide.Body)
		slide.File.ID = strings.TrimSpace(slide.File.ID)
		if slide.File.ID == "" {
			return nil, fmt.Errorf("slide %d has no file", index+1)
		}
		file, err := s.files.GetByID(ctx, workspaceID, slide.File.ID, false)
		if err != nil {
			return nil, fmt.Errorf("slide %d file is not available", index+1)
		}
		if !strings.HasPrefix(file.MimeType, "image/") {
			return nil, fmt.Errorf("slide %d file must be an image", index+1)
		}
		slide.File = model.CarouselFile{ID: file.ID, Name: file.Name, MimeType: file.MimeType}
		if slide.BackgroundFile != nil {
			slide.BackgroundFile.ID = strings.TrimSpace(slide.BackgroundFile.ID)
			background, err := s.files.GetByID(ctx, workspaceID, slide.BackgroundFile.ID, false)
			if err != nil || !strings.HasPrefix(background.MimeType, "image/") {
				return nil, fmt.Errorf("slide %d background is not available", index+1)
			}
			slide.BackgroundFile = &model.CarouselFile{ID: background.ID, Name: background.Name, MimeType: background.MimeType}
		}
	}
	if req.GenerationCredits < 0 || req.TextCredits < 0 {
		return nil, errors.New("carousel credit totals cannot be negative")
	}
	return &model.Carousel{
		ID:                id,
		WorkspaceID:       workspaceID,
		CreatedBy:         optionalString(userID),
		Title:             title,
		Topic:             strings.TrimSpace(req.Topic),
		Caption:           strings.TrimSpace(req.Caption),
		Slides:            req.Slides,
		GenerationCredits: req.GenerationCredits,
		TextCredits:       req.TextCredits,
	}, nil
}

func optionalString(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
