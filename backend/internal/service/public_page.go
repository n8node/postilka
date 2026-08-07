package service

import (
	"context"
	"errors"
	"net/url"
	"strings"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrPublicPageNotFound  = errors.New("public page not found")
	ErrPublicPageSlugTaken = errors.New("public page slug already exists")
)

type PublicPageService struct {
	pages *repository.PublicPageRepository
}

func NewPublicPageService(pages *repository.PublicPageRepository) *PublicPageService {
	return &PublicPageService{pages: pages}
}

func (s *PublicPageService) List(ctx context.Context) ([]model.PublicPage, error) {
	return s.pages.List(ctx)
}

func (s *PublicPageService) Get(ctx context.Context, id string) (*model.PublicPage, error) {
	p, err := s.pages.GetByID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrPublicPageNotFound
	}
	return p, err
}

type PublicPageInput struct {
	Title           string
	Slug            string
	MetaDescription string
	ExternalURL     string
	Category        string
	Provider        *string
	IsPublished     bool
	SortOrder       int
}

func (s *PublicPageService) Create(ctx context.Context, in PublicPageInput) (*model.PublicPage, error) {
	title := strings.TrimSpace(in.Title)
	if title == "" {
		return nil, ErrInvalidInput
	}

	slug := strings.TrimSpace(in.Slug)
	if slug == "" {
		slug = repository.NormalizePublicPageSlug(title)
	}
	exists, err := s.pages.SlugExists(ctx, slug, "")
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrPublicPageSlugTaken
	}

	category, err := normalizePublicPageCategory(in.Category)
	if err != nil {
		return nil, err
	}

	externalURL := strings.TrimSpace(in.ExternalURL)
	if externalURL != "" {
		if _, err := url.ParseRequestURI(externalURL); err != nil {
			return nil, ErrInvalidInput
		}
	}

	p := &model.PublicPage{
		Title:           title,
		Slug:            slug,
		MetaDescription: strings.TrimSpace(in.MetaDescription),
		ExternalURL:     externalURL,
		Category:        category,
		Provider:        normalizeOptionalProvider(in.Provider),
		IsPublished:     in.IsPublished,
		SortOrder:       in.SortOrder,
	}
	return s.pages.Create(ctx, p)
}

func (s *PublicPageService) Update(ctx context.Context, id string, in PublicPageInput) (*model.PublicPage, error) {
	existing, err := s.pages.GetByID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrPublicPageNotFound
	}
	if err != nil {
		return nil, err
	}

	title := strings.TrimSpace(in.Title)
	if title == "" {
		return nil, ErrInvalidInput
	}

	slug := strings.TrimSpace(in.Slug)
	if slug == "" {
		slug = existing.Slug
	}
	exists, err := s.pages.SlugExists(ctx, slug, id)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrPublicPageSlugTaken
	}

	category, err := normalizePublicPageCategory(in.Category)
	if err != nil {
		return nil, err
	}

	externalURL := strings.TrimSpace(in.ExternalURL)
	if externalURL != "" {
		if _, err := url.ParseRequestURI(externalURL); err != nil {
			return nil, ErrInvalidInput
		}
	}

	p := &model.PublicPage{
		ID:              id,
		Title:           title,
		Slug:            slug,
		MetaDescription: strings.TrimSpace(in.MetaDescription),
		ExternalURL:     externalURL,
		Category:        category,
		Provider:        normalizeOptionalProvider(in.Provider),
		IsPublished:     in.IsPublished,
		SortOrder:       in.SortOrder,
	}
	return s.pages.Update(ctx, p)
}

func (s *PublicPageService) Delete(ctx context.Context, id string) error {
	err := s.pages.Delete(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrPublicPageNotFound
	}
	return err
}

func normalizePublicPageCategory(raw string) (string, error) {
	switch strings.TrimSpace(raw) {
	case "", model.PublicPageCategoryOther:
		return model.PublicPageCategoryOther, nil
	case model.PublicPageCategoryInstruction:
		return model.PublicPageCategoryInstruction, nil
	case model.PublicPageCategoryHelpCenter:
		return model.PublicPageCategoryHelpCenter, nil
	case model.PublicPageCategoryLegal:
		return model.PublicPageCategoryLegal, nil
	default:
		return "", ErrInvalidInput
	}
}

func normalizeOptionalProvider(raw *string) *string {
	if raw == nil {
		return nil
	}
	v := strings.TrimSpace(*raw)
	if v == "" {
		return nil
	}
	return &v
}
