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
	maxGenerationNavIconUpload = 5 << 20
	generationNavTitleMax      = 80
	generationNavSubtitleMax   = 120
	generationNavHrefMax       = 500
)

var (
	ErrGenerationNavInvalid = errors.New("generation nav invalid")
	ErrGenerationNavNotFound = errors.New("generation nav not found")
)

var allowedGenerationNavIcons = map[string]struct{}{
	"Aperture": {}, "Box": {}, "Brush": {}, "Calendar": {}, "Camera": {},
	"Clapperboard": {}, "CircleUser": {}, "Crop": {}, "FileText": {}, "Film": {},
	"FolderOpen": {}, "Frame": {}, "GalleryHorizontal": {}, "Grid2x2": {},
	"Hash": {}, "Image": {}, "Images": {}, "Layers": {}, "LayoutGrid": {},
	"Link2": {}, "Megaphone": {}, "MessageSquare": {}, "Mic": {}, "Newspaper": {},
	"Package": {}, "Paintbrush": {}, "Palette": {}, "Pencil": {}, "PenLine": {},
	"Play": {}, "Radio": {}, "Scan": {}, "ShoppingBag": {}, "Smile": {},
	"Sparkles": {}, "Sticker": {}, "Store": {}, "Type": {}, "UserRound": {},
	"Users": {}, "Video": {}, "Volume2": {}, "Wand2": {}, "Workflow": {},
}

type GenerationNavService struct {
	repo  *repository.GenerationNavRepository
	store *ObjectStorage
}

func NewGenerationNavService(repo *repository.GenerationNavRepository, store *ObjectStorage) *GenerationNavService {
	return &GenerationNavService{repo: repo, store: store}
}

func (s *GenerationNavService) PublicView(ctx context.Context) (model.GenerationNavView, error) {
	settings, err := s.repo.GetSettings(ctx)
	if err != nil {
		return model.GenerationNavView{}, err
	}
	items, err := s.repo.List(ctx, true)
	if err != nil {
		return model.GenerationNavView{}, err
	}
	if items == nil {
		items = []model.GenerationNavItem{}
	}
	return model.GenerationNavView{Settings: settings, Items: items}, nil
}

func (s *GenerationNavService) AdminView(ctx context.Context) (model.GenerationNavView, error) {
	settings, err := s.repo.GetSettings(ctx)
	if err != nil {
		return model.GenerationNavView{}, err
	}
	items, err := s.repo.List(ctx, false)
	if err != nil {
		return model.GenerationNavView{}, err
	}
	if items == nil {
		items = []model.GenerationNavItem{}
	}
	return model.GenerationNavView{Settings: settings, Items: items}, nil
}

func (s *GenerationNavService) UpdateSettings(ctx context.Context, in model.GenerationNavSettingsWrite) (model.GenerationNavSettings, error) {
	title := strings.TrimSpace(in.Title)
	if title == "" {
		title = "Генерация"
	}
	if utf8.RuneCountInString(title) > generationNavTitleMax {
		return model.GenerationNavSettings{}, ErrGenerationNavInvalid
	}
	studio, err := sanitizeGenerationNavHref(in.StudioHref)
	if err != nil {
		return model.GenerationNavSettings{}, err
	}
	more, err := sanitizeGenerationNavHref(in.MoreHref)
	if err != nil {
		return model.GenerationNavSettings{}, err
	}
	limit := in.PreviewLimit
	if limit <= 0 {
		limit = 8
	}
	if limit > 24 {
		return model.GenerationNavSettings{}, ErrGenerationNavInvalid
	}
	return s.repo.UpdateSettings(ctx, model.GenerationNavSettings{
		Title:        title,
		StudioHref:   studio,
		MoreHref:     more,
		PreviewLimit: limit,
	})
}

func (s *GenerationNavService) Create(ctx context.Context, in model.GenerationNavItemWrite) (*model.GenerationNavItem, error) {
	item, err := normalizeGenerationNavWrite(in, nil)
	if err != nil {
		return nil, err
	}
	if in.Position == nil {
		pos, err := s.repo.NextPosition(ctx)
		if err != nil {
			return nil, err
		}
		item.Position = pos
	}
	return s.repo.Create(ctx, item)
}

func (s *GenerationNavService) Update(ctx context.Context, id string, in model.GenerationNavItemWrite) (*model.GenerationNavItem, error) {
	prev, err := s.repo.Get(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrGenerationNavNotFound
		}
		return nil, err
	}
	item, err := normalizeGenerationNavWrite(in, prev)
	if err != nil {
		return nil, err
	}
	updated, err := s.repo.Update(ctx, id, item)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrGenerationNavNotFound
		}
		return nil, err
	}
	if updated.IconKind == model.GenerationNavIconLucide && prev.S3Key != "" {
		cleared, clearErr := s.repo.UpdateIcon(ctx, id, model.GenerationNavIconLucide, updated.IconName, "")
		if clearErr == nil {
			_ = s.store.DeleteObject(ctx, prev.S3Key)
			updated = cleared
		}
	}
	return updated, nil
}

func (s *GenerationNavService) Delete(ctx context.Context, id string) error {
	key, err := s.repo.Delete(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return ErrGenerationNavNotFound
		}
		return err
	}
	if key != "" {
		_ = s.store.DeleteObject(ctx, key)
	}
	return nil
}

func (s *GenerationNavService) Reorder(ctx context.Context, ids []string) error {
	if len(ids) == 0 {
		return ErrGenerationNavInvalid
	}
	seen := map[string]struct{}{}
	for _, id := range ids {
		if strings.TrimSpace(id) == "" {
			return ErrGenerationNavInvalid
		}
		if _, ok := seen[id]; ok {
			return ErrGenerationNavInvalid
		}
		seen[id] = struct{}{}
	}
	return s.repo.Reorder(ctx, ids)
}

func (s *GenerationNavService) UploadIcon(ctx context.Context, id string, file multipart.File, header *multipart.FileHeader) (*model.GenerationNavItem, error) {
	prev, err := s.repo.Get(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrGenerationNavNotFound
		}
		return nil, err
	}
	if file == nil || header == nil {
		return nil, ErrGenerationNavInvalid
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, maxGenerationNavIconUpload+1))
	if err != nil {
		return nil, err
	}
	if len(data) == 0 || len(data) > maxGenerationNavIconUpload {
		return nil, ErrGenerationNavInvalid
	}
	contentType := strings.TrimSpace(header.Header.Get("Content-Type"))
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}
	contentType = strings.Split(contentType, ";")[0]
	if contentType != "image/png" && http.DetectContentType(data) != "image/png" {
		return nil, ErrGenerationNavInvalid
	}
	normalized, err := normalizeProviderLogoPNG(data)
	if err != nil {
		return nil, ErrGenerationNavInvalid
	}

	key := fmt.Sprintf("postilka/generation-nav/%s/%s.png", id, uuid.NewString())
	if err := s.store.PutObject(ctx, key, "image/png", normalized); err != nil {
		return nil, err
	}
	updated, err := s.repo.UpdateIcon(ctx, id, model.GenerationNavIconUpload, prev.IconName, key)
	if err != nil {
		_ = s.store.DeleteObject(ctx, key)
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrGenerationNavNotFound
		}
		return nil, err
	}
	if prev.S3Key != "" && prev.S3Key != key {
		_ = s.store.DeleteObject(ctx, prev.S3Key)
	}
	return updated, nil
}

func (s *GenerationNavService) DeleteIcon(ctx context.Context, id string) (*model.GenerationNavItem, error) {
	prev, err := s.repo.Get(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrGenerationNavNotFound
		}
		return nil, err
	}
	name := prev.IconName
	if !isAllowedGenerationNavIcon(name) {
		name = "Sparkles"
	}
	updated, err := s.repo.UpdateIcon(ctx, id, model.GenerationNavIconLucide, name, "")
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrGenerationNavNotFound
		}
		return nil, err
	}
	if prev.S3Key != "" {
		_ = s.store.DeleteObject(ctx, prev.S3Key)
	}
	return updated, nil
}

func (s *GenerationNavService) FetchIcon(ctx context.Context, id string) ([]byte, string, error) {
	item, err := s.repo.Get(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, "", ErrGenerationNavNotFound
		}
		return nil, "", err
	}
	if item.IconKind != model.GenerationNavIconUpload || item.S3Key == "" {
		return nil, "", ErrGenerationNavNotFound
	}
	body, contentType, err := s.store.GetObject(ctx, item.S3Key)
	if err != nil {
		return nil, "", ErrGenerationNavNotFound
	}
	defer body.Close()
	data, err := io.ReadAll(io.LimitReader(body, maxGenerationNavIconUpload+1))
	if err != nil {
		return nil, "", err
	}
	if len(data) == 0 {
		return nil, "", ErrGenerationNavNotFound
	}
	if contentType == "" {
		contentType = "image/png"
	}
	return data, contentType, nil
}

func normalizeGenerationNavWrite(in model.GenerationNavItemWrite, prev *model.GenerationNavItem) (model.GenerationNavItem, error) {
	title := strings.TrimSpace(in.Title)
	if title == "" || utf8.RuneCountInString(title) > generationNavTitleMax {
		return model.GenerationNavItem{}, ErrGenerationNavInvalid
	}
	subtitle := strings.TrimSpace(in.Subtitle)
	if utf8.RuneCountInString(subtitle) > generationNavSubtitleMax {
		return model.GenerationNavItem{}, ErrGenerationNavInvalid
	}
	href, err := sanitizeGenerationNavHref(in.Href)
	if err != nil {
		return model.GenerationNavItem{}, err
	}
	kind := strings.TrimSpace(in.IconKind)
	if kind == "" && prev != nil {
		kind = prev.IconKind
	}
	if kind == "" {
		kind = model.GenerationNavIconLucide
	}
	if kind != model.GenerationNavIconLucide && kind != model.GenerationNavIconUpload {
		return model.GenerationNavItem{}, ErrGenerationNavInvalid
	}
	name := strings.TrimSpace(in.IconName)
	if name == "" && prev != nil {
		name = prev.IconName
	}
	if name == "" {
		name = "Sparkles"
	}
	if kind == model.GenerationNavIconLucide && !isAllowedGenerationNavIcon(name) {
		return model.GenerationNavItem{}, ErrGenerationNavInvalid
	}
	if kind == model.GenerationNavIconUpload && prev != nil && prev.S3Key == "" && prev.IconKind != model.GenerationNavIconUpload {
		kind = model.GenerationNavIconLucide
	}
	visible := true
	if in.Visible != nil {
		visible = *in.Visible
	} else if prev != nil {
		visible = prev.Visible
	}
	featured := false
	if in.Featured != nil {
		featured = *in.Featured
	} else if prev != nil {
		featured = prev.Featured
	}
	position := 0
	if in.Position != nil {
		position = *in.Position
	} else if prev != nil {
		position = prev.Position
	}
	return model.GenerationNavItem{
		Title:    title,
		Subtitle: subtitle,
		Href:     href,
		Position: position,
		Visible:  visible,
		Featured: featured,
		IconKind: kind,
		IconName: name,
	}, nil
}

func sanitizeGenerationNavHref(raw string) (string, error) {
	h := strings.TrimSpace(raw)
	if h == "" {
		return "", ErrGenerationNavInvalid
	}
	if strings.ContainsAny(h, "\n\r") || len(h) > generationNavHrefMax {
		return "", ErrGenerationNavInvalid
	}
	if !strings.HasPrefix(h, "/") || strings.HasPrefix(h, "//") {
		return "", ErrGenerationNavInvalid
	}
	return h, nil
}

func isAllowedGenerationNavIcon(name string) bool {
	_, ok := allowedGenerationNavIcons[name]
	return ok
}
