package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

const (
	helpTitleMax     = 255
	helpExcerptMax   = 400
	helpImageMaxSize = 8 << 20
)

var (
	ErrHelpArticleNotFound = errors.New("help article not found")
	ErrHelpRouteTaken      = errors.New("help route already used")
	ErrHelpInvalid         = errors.New("help article invalid")
	ErrHelpImageInvalid    = errors.New("help image invalid")
)

type HelpArticleInput struct {
	Title       string
	RouteKey    string
	BodyHTML    string
	Excerpt     string
	IsPublished bool
	SortOrder   int
}

type HelpArticleService struct {
	repo  *repository.HelpArticleRepository
	store *ObjectStorage
}

func NewHelpArticleService(repo *repository.HelpArticleRepository, store *ObjectStorage) *HelpArticleService {
	return &HelpArticleService{repo: repo, store: store}
}

func (s *HelpArticleService) ListAdmin(ctx context.Context) ([]model.HelpArticle, error) {
	return s.repo.List(ctx)
}

func (s *HelpArticleService) ListPublished(ctx context.Context) ([]model.HelpArticleSummary, error) {
	items, err := s.repo.ListPublished(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]model.HelpArticleSummary, 0, len(items))
	for _, item := range items {
		item.BodyHTML = ""
		out = append(out, model.HelpArticleToSummary(item))
	}
	return out, nil
}

func (s *HelpArticleService) GetAdmin(ctx context.Context, id string) (*model.HelpArticle, error) {
	a, err := s.repo.GetByID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrHelpArticleNotFound
	}
	return a, err
}

func (s *HelpArticleService) GetPublished(ctx context.Context, id string) (*model.HelpArticle, error) {
	a, err := s.repo.GetPublishedByID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrHelpArticleNotFound
	}
	return a, err
}

func (s *HelpArticleService) GetPublishedByRoute(ctx context.Context, routeKey string) (*model.HelpArticle, error) {
	key, err := normalizeHelpRoute(routeKey)
	if err != nil {
		return nil, ErrHelpInvalid
	}
	a, err := s.repo.GetPublishedByRoute(ctx, key)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrHelpArticleNotFound
	}
	return a, err
}

func (s *HelpArticleService) Create(ctx context.Context, in HelpArticleInput) (*model.HelpArticle, error) {
	a, err := s.normalizeInput(in)
	if err != nil {
		return nil, err
	}
	taken, err := s.repo.RouteTaken(ctx, a.RouteKey, "")
	if err != nil {
		return nil, err
	}
	if taken {
		return nil, ErrHelpRouteTaken
	}
	return s.repo.Create(ctx, a)
}

func (s *HelpArticleService) Update(ctx context.Context, id string, in HelpArticleInput) (*model.HelpArticle, error) {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrHelpArticleNotFound
		}
		return nil, err
	}
	a, err := s.normalizeInput(in)
	if err != nil {
		return nil, err
	}
	taken, err := s.repo.RouteTaken(ctx, a.RouteKey, id)
	if err != nil {
		return nil, err
	}
	if taken {
		return nil, ErrHelpRouteTaken
	}
	a.ID = id
	out, err := s.repo.Update(ctx, a)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrHelpArticleNotFound
	}
	return out, err
}

func (s *HelpArticleService) Delete(ctx context.Context, id string) error {
	err := s.repo.Delete(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrHelpArticleNotFound
	}
	return err
}

func (s *HelpArticleService) UploadImage(ctx context.Context, file multipart.File, header *multipart.FileHeader) (*model.HelpImage, string, error) {
	if file == nil || header == nil {
		return nil, "", ErrHelpImageInvalid
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, helpImageMaxSize+1))
	if err != nil {
		return nil, "", err
	}
	if len(data) == 0 || len(data) > helpImageMaxSize {
		return nil, "", ErrHelpImageInvalid
	}
	contentType := strings.Split(strings.TrimSpace(header.Header.Get("Content-Type")), ";")[0]
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}
	switch contentType {
	case "image/png", "image/jpeg", "image/webp", "image/gif":
	default:
		detected := http.DetectContentType(data)
		if detected != "image/png" && detected != "image/jpeg" && detected != "image/webp" && detected != "image/gif" {
			return nil, "", ErrHelpImageInvalid
		}
		contentType = detected
	}
	ext := "jpg"
	switch contentType {
	case "image/png":
		ext = "png"
	case "image/webp":
		ext = "webp"
	case "image/gif":
		ext = "gif"
	}
	key := fmt.Sprintf("postilka/help/%s.%s", uuid.NewString(), ext)
	if err := s.store.PutObject(ctx, key, contentType, data); err != nil {
		return nil, "", err
	}
	img, err := s.repo.CreateImage(ctx, &model.HelpImage{StorageKey: key, ContentType: contentType})
	if err != nil {
		_ = s.store.DeleteObject(ctx, key)
		return nil, "", err
	}
	return img, "/app/api/v1/help/images/" + img.ID, nil
}

func (s *HelpArticleService) OpenImage(ctx context.Context, id string) (io.ReadCloser, string, error) {
	img, err := s.repo.GetImage(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, "", ErrHelpArticleNotFound
	}
	if err != nil {
		return nil, "", err
	}
	body, contentType, err := s.store.GetObject(ctx, img.StorageKey)
	if err != nil {
		return nil, "", err
	}
	if img.ContentType != "" {
		contentType = img.ContentType
	}
	return body, contentType, nil
}

func (s *HelpArticleService) normalizeInput(in HelpArticleInput) (*model.HelpArticle, error) {
	title := strings.TrimSpace(in.Title)
	if title == "" || utf8.RuneCountInString(title) > helpTitleMax {
		return nil, ErrHelpInvalid
	}
	routeKey, err := normalizeHelpRoute(in.RouteKey)
	if err != nil {
		return nil, err
	}
	body := SanitizeHelpHTML(in.BodyHTML)
	excerpt := strings.TrimSpace(in.Excerpt)
	if excerpt == "" {
		excerpt = HelpExcerptFromHTML(body, 180)
	}
	if utf8.RuneCountInString(excerpt) > helpExcerptMax {
		excerpt = string([]rune(excerpt)[:helpExcerptMax])
	}
	return &model.HelpArticle{
		Title:       title,
		RouteKey:    routeKey,
		BodyHTML:    body,
		Excerpt:     excerpt,
		IsPublished: in.IsPublished,
		SortOrder:   in.SortOrder,
	}, nil
}

func normalizeHelpRoute(raw string) (string, error) {
	key := strings.ToLower(strings.TrimSpace(raw))
	for _, allowed := range model.HelpRouteKeys {
		if key == allowed {
			return key, nil
		}
	}
	return "", ErrHelpInvalid
}
