package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math/rand/v2"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"path/filepath"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/postilka/postilka/internal/ai"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrAdStudioProductRequired = errors.New("ad studio product required")
	ErrAdStudioAvatarRequired  = errors.New("ad studio avatar required")
	ErrAdStudioNotPublished    = errors.New("ad studio template not published")
	ErrAdStudioInvalidCategory = errors.New("ad studio invalid category")
	ErrAdStudioInvalidKind     = errors.New("ad studio invalid media kind")
	ErrAdStudioTitleRequired   = errors.New("ad studio title required")
	ErrAdStudioPromptRequired  = errors.New("ad studio prompt required")
	ErrAdStudioPreviewInvalid  = errors.New("ad studio preview invalid")
	ErrAdStudioPreviewRequired = errors.New("ad studio preview required")
	ErrAdStudioPreviewProcess  = errors.New("ad studio preview process failed")
	ErrAdStudioInvalidMode     = errors.New("ad studio invalid generation mode")
)

type AdStudioService struct {
	repo        *repository.AdStudioRepository
	promptsRepo *repository.AdStudioSystemPromptRepository
	settings    *repository.SettingsRepository
	generation  *GenerationService
	objectStore *ObjectStorage
}

func NewAdStudioService(
	repo *repository.AdStudioRepository,
	promptsRepo *repository.AdStudioSystemPromptRepository,
	settings *repository.SettingsRepository,
	generation *GenerationService,
	objectStore *ObjectStorage,
) *AdStudioService {
	return &AdStudioService{repo: repo, promptsRepo: promptsRepo, settings: settings, generation: generation, objectStore: objectStore}
}

const (
	adStudioCatalogDefaultLimit = 18
	adStudioCatalogMaxLimit     = 48
)

func (s *AdStudioService) listPublishedFiltered(ctx context.Context, catalog, category string) ([]model.AdStudioTemplate, []string, error) {
	catalog = model.NormalizeAdStudioCatalog(catalog)
	if err := validateAdStudioCategory(catalog, category, true); err != nil {
		return nil, nil, err
	}
	hidden, err := s.HiddenCategories(ctx, catalog)
	if err != nil {
		return nil, nil, err
	}
	if cat := strings.TrimSpace(category); cat != "" && hiddenSet(hidden)[cat] {
		return []model.AdStudioTemplate{}, hidden, nil
	}
	items, err := s.repo.List(ctx, catalog, category, true)
	if err != nil {
		return nil, hidden, err
	}
	blocked := hiddenSet(hidden)
	out := make([]model.AdStudioTemplate, 0, len(items))
	for _, t := range items {
		if blocked[t.Category] {
			continue
		}
		out = append(out, t)
	}
	return out, hidden, nil
}

func (s *AdStudioService) ListPublic(ctx context.Context, catalog, category string) ([]model.AdStudioTemplatePublicView, []string, error) {
	items, hidden, err := s.listPublishedFiltered(ctx, catalog, category)
	if err != nil {
		return nil, hidden, err
	}
	out := make([]model.AdStudioTemplatePublicView, 0, len(items))
	for _, t := range items {
		out = append(out, t.ToPublicView())
	}
	if shuffle, err := s.ShuffleTemplatesEnabled(ctx, catalog); err == nil && shuffle {
		shuffleAdStudioPublicViews(out)
	}
	return out, hidden, nil
}

func (s *AdStudioService) ListCatalog(ctx context.Context, catalog, category string, limit, offset int) ([]model.AdStudioTemplatePublicView, []string, int, error) {
	if limit < 1 {
		limit = adStudioCatalogDefaultLimit
	}
	if limit > adStudioCatalogMaxLimit {
		limit = adStudioCatalogMaxLimit
	}
	if offset < 0 {
		offset = 0
	}
	items, hidden, err := s.listPublishedFiltered(ctx, catalog, category)
	if err != nil {
		return nil, hidden, 0, err
	}
	total := len(items)
	if offset >= total {
		return []model.AdStudioTemplatePublicView{}, hidden, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	page := items[offset:end]
	out := make([]model.AdStudioTemplatePublicView, 0, len(page))
	for _, t := range page {
		out = append(out, t.ToCatalogView())
	}
	return out, hidden, total, nil
}

func (s *AdStudioService) GetPublic(ctx context.Context, id string) (model.AdStudioTemplatePublicView, error) {
	t, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return model.AdStudioTemplatePublicView{}, err
	}
	if !t.IsPublished {
		return model.AdStudioTemplatePublicView{}, ErrAdStudioNotPublished
	}
	hidden, err := s.categoryIsHidden(ctx, t.Catalog, t.Category)
	if err != nil {
		return model.AdStudioTemplatePublicView{}, err
	}
	if hidden {
		return model.AdStudioTemplatePublicView{}, ErrAdStudioNotPublished
	}
	return t.ToPublicView(), nil
}

func (s *AdStudioService) HiddenCategories(ctx context.Context, catalog string) ([]string, error) {
	settings, err := s.CategorySettings(ctx, catalog)
	if err != nil {
		return nil, err
	}
	return settings.HiddenCategories, nil
}

type AdStudioCategorySettings struct {
	HiddenCategories []string
	ShuffleTemplates bool
}

func (s *AdStudioService) CategorySettings(ctx context.Context, catalog string) (AdStudioCategorySettings, error) {
	catalog = model.NormalizeAdStudioCatalog(catalog)
	if s.settings == nil {
		return AdStudioCategorySettings{}, nil
	}
	hidden, err := s.settings.GetCatalogHiddenCategories(ctx, catalog)
	if err != nil {
		return AdStudioCategorySettings{}, err
	}
	shuffle, err := s.settings.GetCatalogShuffleTemplates(ctx, catalog)
	if err != nil {
		return AdStudioCategorySettings{}, err
	}
	return AdStudioCategorySettings{
		HiddenCategories: normalizeHiddenAdStudioCategories(catalog, hidden),
		ShuffleTemplates: shuffle,
	}, nil
}

func (s *AdStudioService) ShuffleTemplatesEnabled(ctx context.Context, catalog string) (bool, error) {
	settings, err := s.CategorySettings(ctx, catalog)
	if err != nil {
		return false, err
	}
	return settings.ShuffleTemplates, nil
}

func (s *AdStudioService) SetHiddenCategories(ctx context.Context, catalog string, hidden []string) ([]string, error) {
	current, err := s.CategorySettings(ctx, catalog)
	if err != nil {
		return nil, err
	}
	updated, err := s.SetCategorySettings(ctx, catalog, hidden, current.ShuffleTemplates)
	if err != nil {
		return nil, err
	}
	return updated.HiddenCategories, nil
}

func (s *AdStudioService) SetCategorySettings(ctx context.Context, catalog string, hidden []string, shuffle bool) (AdStudioCategorySettings, error) {
	catalog = model.NormalizeAdStudioCatalog(catalog)
	if s.settings == nil {
		return AdStudioCategorySettings{}, errors.New("ad studio settings unavailable")
	}
	normalized := normalizeHiddenAdStudioCategories(catalog, hidden)
	if err := s.settings.SetCatalogHiddenCategories(ctx, catalog, normalized); err != nil {
		return AdStudioCategorySettings{}, err
	}
	if err := s.settings.SetCatalogShuffleTemplates(ctx, catalog, shuffle); err != nil {
		return AdStudioCategorySettings{}, err
	}
	return AdStudioCategorySettings{
		HiddenCategories: normalized,
		ShuffleTemplates: shuffle,
	}, nil
}

func shuffleAdStudioPublicViews(items []model.AdStudioTemplatePublicView) {
	rand.Shuffle(len(items), func(i, j int) {
		items[i], items[j] = items[j], items[i]
	})
}

func (s *AdStudioService) ListAdmin(ctx context.Context, catalog, category string) ([]model.AdStudioTemplateAdminView, error) {
	catalog = model.NormalizeAdStudioCatalog(catalog)
	if err := validateAdStudioCategory(catalog, category, true); err != nil {
		return nil, err
	}
	items, err := s.repo.List(ctx, catalog, category, false)
	if err != nil {
		return nil, err
	}
	out := make([]model.AdStudioTemplateAdminView, 0, len(items))
	for _, t := range items {
		out = append(out, t.ToAdminView())
	}
	return out, nil
}

func (s *AdStudioService) CreateAdmin(ctx context.Context, req model.AdStudioTemplateWriteRequest) (model.AdStudioTemplateAdminView, error) {
	t, err := templateFromWrite(model.AdStudioTemplate{Catalog: model.NormalizeAdStudioCatalog(req.Catalog)}, req, true)
	if err != nil {
		return model.AdStudioTemplateAdminView{}, err
	}
	created, err := s.repo.Create(ctx, t)
	if err != nil {
		return model.AdStudioTemplateAdminView{}, err
	}
	return created.ToAdminView(), nil
}

func (s *AdStudioService) UpdateAdmin(ctx context.Context, id string, req model.AdStudioTemplateWriteRequest) (model.AdStudioTemplateAdminView, error) {
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return model.AdStudioTemplateAdminView{}, err
	}
	next, err := templateFromWrite(current, req, false)
	if err != nil {
		return model.AdStudioTemplateAdminView{}, err
	}
	updated, err := s.repo.Update(ctx, next)
	if err != nil {
		return model.AdStudioTemplateAdminView{}, err
	}
	return updated.ToAdminView(), nil
}

func (s *AdStudioService) DeleteAdmin(ctx context.Context, id string) error {
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	s.deletePreviewObjects(ctx, current)
	return nil
}

func (s *AdStudioService) UploadPreview(ctx context.Context, id string, file multipart.File, header *multipart.FileHeader) (model.AdStudioTemplateAdminView, error) {
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return model.AdStudioTemplateAdminView{}, err
	}
	if file == nil || header == nil {
		return model.AdStudioTemplateAdminView{}, ErrAdStudioPreviewInvalid
	}
	defer file.Close()

	const imageMaxSize = 15 << 20
	const videoReadLimit = (50 << 20) + 1
	data, err := io.ReadAll(io.LimitReader(file, videoReadLimit))
	if err != nil {
		return model.AdStudioTemplateAdminView{}, err
	}
	if len(data) == 0 {
		return model.AdStudioTemplateAdminView{}, ErrAdStudioPreviewInvalid
	}

	contentType := strings.TrimSpace(header.Header.Get("Content-Type"))
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}
	contentType = strings.Split(contentType, ";")[0]

	filename := ""
	if header != nil {
		filename = header.Filename
	}
	if isKieReferenceVideoContentType(contentType, filename) {
		if current.MediaKind != model.AdStudioMediaVideo {
			return model.AdStudioTemplateAdminView{}, ErrAdStudioPreviewInvalid
		}
		prepared, err := prepareKieReferenceVideo(data, contentType, filename, true)
		if err != nil {
			if errors.Is(err, ErrReferenceVideoDuration) {
				return model.AdStudioTemplateAdminView{}, err
			}
			if errors.Is(err, ErrKieReferenceVideoConvert) {
				return model.AdStudioTemplateAdminView{}, err
			}
			return model.AdStudioTemplateAdminView{}, ErrAdStudioPreviewInvalid
		}
		data = prepared.Data
		contentType = prepared.ContentType
		thumb, err := extractVideoPosterWebP(data)
		if err != nil || len(thumb) == 0 {
			return model.AdStudioTemplateAdminView{}, ErrAdStudioPreviewProcess
		}
		masterKey := fmt.Sprintf("postilka/ad-studio/previews/%s%s", uuid.NewString(), prepared.FilenameExt)
		thumbKey := fmt.Sprintf("postilka/ad-studio/previews/%s.webp", uuid.NewString())
		if err := s.objectStore.PutObjectWithCacheControl(ctx, masterKey, contentType, adStudioMasterObjectCacheControl, data); err != nil {
			return model.AdStudioTemplateAdminView{}, err
		}
		if err := s.objectStore.PutObjectWithCacheControl(ctx, thumbKey, "image/webp", adStudioThumbObjectCacheControl, thumb); err != nil {
			_ = s.objectStore.DeleteObject(ctx, masterKey)
			return model.AdStudioTemplateAdminView{}, err
		}
		updated, err := s.repo.UpdatePreview(ctx, current.ID, masterKey, contentType, thumbKey)
		if err != nil {
			_ = s.objectStore.DeleteObject(ctx, masterKey)
			_ = s.objectStore.DeleteObject(ctx, thumbKey)
			return model.AdStudioTemplateAdminView{}, err
		}
		s.deletePreviewObjects(ctx, current)
		return updated.ToAdminView(), nil
	}

	if !strings.HasPrefix(contentType, "image/") {
		return model.AdStudioTemplateAdminView{}, ErrAdStudioPreviewInvalid
	}
	if len(data) > imageMaxSize {
		return model.AdStudioTemplateAdminView{}, ErrAdStudioPreviewInvalid
	}

	master, err := encodeAdStudioMasterJPEG(data)
	if err != nil || len(master) == 0 {
		return model.AdStudioTemplateAdminView{}, ErrAdStudioPreviewProcess
	}
	thumb, err := encodeAdStudioDisplayWebP(data)
	if err != nil || len(thumb) == 0 {
		return model.AdStudioTemplateAdminView{}, ErrAdStudioPreviewProcess
	}

	masterKey := fmt.Sprintf("postilka/ad-studio/previews/%s.jpg", uuid.NewString())
	thumbKey := fmt.Sprintf("postilka/ad-studio/previews/%s.webp", uuid.NewString())
	if err := s.objectStore.PutObjectWithCacheControl(ctx, masterKey, "image/jpeg", adStudioMasterObjectCacheControl, master); err != nil {
		return model.AdStudioTemplateAdminView{}, err
	}
	if err := s.objectStore.PutObjectWithCacheControl(ctx, thumbKey, "image/webp", adStudioThumbObjectCacheControl, thumb); err != nil {
		_ = s.objectStore.DeleteObject(ctx, masterKey)
		return model.AdStudioTemplateAdminView{}, err
	}

	updated, err := s.repo.UpdatePreview(ctx, current.ID, masterKey, "image/jpeg", thumbKey)
	if err != nil {
		_ = s.objectStore.DeleteObject(ctx, masterKey)
		_ = s.objectStore.DeleteObject(ctx, thumbKey)
		return model.AdStudioTemplateAdminView{}, err
	}
	s.deletePreviewObjects(ctx, current)
	return updated.ToAdminView(), nil
}

type previewUploadFile struct {
	*bytes.Reader
}

func (previewUploadFile) Close() error { return nil }

func (s *AdStudioService) UploadPreviewFromBytes(ctx context.Context, id string, data []byte, filename, contentType string) (model.AdStudioTemplateAdminView, error) {
	if len(data) == 0 {
		return model.AdStudioTemplateAdminView{}, ErrAdStudioPreviewInvalid
	}
	if strings.TrimSpace(contentType) == "" {
		contentType = previewContentType(filename, data)
	}
	header := &multipart.FileHeader{
		Filename: filename,
		Size:     int64(len(data)),
		Header:   textproto.MIMEHeader{"Content-Type": []string{contentType}},
	}
	return s.UploadPreview(ctx, id, previewUploadFile{Reader: bytes.NewReader(data)}, header)
}

func previewContentType(filename string, data []byte) string {
	switch strings.ToLower(filepath.Ext(filename)) {
	case ".webp":
		return "image/webp"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	}
	if len(data) > 0 {
		return http.DetectContentType(data)
	}
	return "application/octet-stream"
}

const (
	adStudioThumbObjectCacheControl  = "public, max-age=31536000, immutable"
	adStudioMasterObjectCacheControl = "public, max-age=86400"
)

func (s *AdStudioService) previewAccess(ctx context.Context, id string, publishedOnly bool) (model.AdStudioTemplate, error) {
	t, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return model.AdStudioTemplate{}, err
	}
	if publishedOnly && !t.IsPublished {
		return model.AdStudioTemplate{}, ErrAdStudioNotPublished
	}
	if publishedOnly {
		hidden, err := s.categoryIsHidden(ctx, t.Catalog, t.Category)
		if err != nil {
			return model.AdStudioTemplate{}, err
		}
		if hidden {
			return model.AdStudioTemplate{}, ErrAdStudioNotPublished
		}
	}
	if strings.TrimSpace(t.PreviewS3Key) == "" {
		return model.AdStudioTemplate{}, repository.ErrNotFound
	}
	return t, nil
}

func (s *AdStudioService) resolvePreviewObjectKey(ctx context.Context, t model.AdStudioTemplate, source bool) (string, string, error) {
	if source {
		if !model.AdStudioPreviewIsVideo(t.PreviewContentType) {
			return "", "", repository.ErrNotFound
		}
		contentType := t.PreviewContentType
		if contentType == "" {
			contentType = "video/mp4"
		}
		return t.PreviewS3Key, contentType, nil
	}
	if thumbKey := strings.TrimSpace(t.PreviewThumbS3Key); thumbKey != "" {
		return thumbKey, "image/webp", nil
	}
	body, _, err := s.ensurePreviewThumb(ctx, t)
	if err == nil {
		_ = body.Close()
		refreshed, getErr := s.repo.GetByID(ctx, t.ID)
		if getErr == nil {
			if thumbKey := strings.TrimSpace(refreshed.PreviewThumbS3Key); thumbKey != "" {
				return thumbKey, "image/webp", nil
			}
		}
		return "", "", ErrAdStudioPreviewProcess
	}
	contentType := t.PreviewContentType
	if contentType == "" {
		contentType = "image/jpeg"
	}
	return t.PreviewS3Key, contentType, nil
}

func presignOptionsForAdStudioObject(contentType string, immutable bool) servicePresignOptions {
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	opts := servicePresignOptions{
		expires: time.Hour,
		inline:  true,
	}
	if immutable || strings.Contains(contentType, "webp") {
		opts.expires = 24 * time.Hour
		opts.cacheControl = adStudioThumbObjectCacheControl
		return opts
	}
	if strings.HasPrefix(contentType, "video/") {
		opts.cacheControl = adStudioMasterObjectCacheControl
		return opts
	}
	opts.expires = 24 * time.Hour
	opts.cacheControl = adStudioMasterObjectCacheControl + ", stale-while-revalidate=604800"
	return opts
}

type servicePresignOptions struct {
	expires      time.Duration
	inline       bool
	cacheControl string
}

func (s *AdStudioService) PreviewPresignedURL(ctx context.Context, id string, publishedOnly, source bool) (string, error) {
	t, err := s.previewAccess(ctx, id, publishedOnly)
	if err != nil {
		return "", err
	}
	key, contentType, err := s.resolvePreviewObjectKey(ctx, t, source)
	if err != nil {
		return "", err
	}
	opts := presignOptionsForAdStudioObject(contentType, strings.HasSuffix(strings.ToLower(key), ".webp"))
	return s.objectStore.PresignGetWithOptions(ctx, key, PresignGetOptions{
		Expires:      opts.expires,
		Inline:       opts.inline,
		CacheControl: opts.cacheControl,
	})
}

func (s *AdStudioService) BackfillMissingPreviewThumbs(ctx context.Context) (ready int, failed int, err error) {
	studioItems, err := s.repo.List(ctx, model.AdStudioCatalogStudio, "", false)
	if err != nil {
		return 0, 0, err
	}
	trendItems, err := s.repo.List(ctx, model.AdStudioCatalogTrends, "", false)
	if err != nil {
		return 0, 0, err
	}
	items := append(studioItems, trendItems...)
	for _, t := range items {
		if strings.TrimSpace(t.PreviewS3Key) == "" || strings.TrimSpace(t.PreviewThumbS3Key) != "" {
			continue
		}
		body, _, thumbErr := s.ensurePreviewThumb(ctx, t)
		if thumbErr != nil {
			failed++
			continue
		}
		_ = body.Close()
		ready++
	}
	return ready, failed, nil
}

func (s *AdStudioService) PreviewObject(ctx context.Context, id string, publishedOnly bool) (io.ReadCloser, string, error) {
	t, err := s.previewAccess(ctx, id, publishedOnly)
	if err != nil {
		return nil, "", err
	}
	if thumbKey := strings.TrimSpace(t.PreviewThumbS3Key); thumbKey != "" {
		body, contentType, err := s.objectStore.GetObject(ctx, thumbKey)
		if err == nil {
			if contentType == "" {
				contentType = "image/webp"
			}
			return body, contentType, nil
		}
	}
	if body, contentType, err := s.ensurePreviewThumb(ctx, t); err == nil {
		return body, contentType, nil
	}
	body, contentType, err := s.objectStore.GetObject(ctx, t.PreviewS3Key)
	if err != nil {
		return nil, "", err
	}
	if contentType == "" {
		contentType = t.PreviewContentType
	}
	return body, contentType, nil
}

func (s *AdStudioService) PreviewSourceObject(ctx context.Context, id string, publishedOnly bool) (io.ReadCloser, string, error) {
	t, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, "", err
	}
	if publishedOnly && !t.IsPublished {
		return nil, "", ErrAdStudioNotPublished
	}
	if publishedOnly {
		hidden, err := s.categoryIsHidden(ctx, t.Catalog, t.Category)
		if err != nil {
			return nil, "", err
		}
		if hidden {
			return nil, "", ErrAdStudioNotPublished
		}
	}
	if strings.TrimSpace(t.PreviewS3Key) == "" {
		return nil, "", repository.ErrNotFound
	}
	if !model.AdStudioPreviewIsVideo(t.PreviewContentType) {
		return nil, "", repository.ErrNotFound
	}
	body, contentType, err := s.objectStore.GetObject(ctx, t.PreviewS3Key)
	if err != nil {
		return nil, "", err
	}
	if contentType == "" {
		contentType = t.PreviewContentType
	}
	return body, contentType, nil
}

func (s *AdStudioService) ensurePreviewThumb(ctx context.Context, t model.AdStudioTemplate) (io.ReadCloser, string, error) {
	src, _, err := s.objectStore.GetObject(ctx, t.PreviewS3Key)
	if err != nil {
		return nil, "", err
	}
	defer src.Close()
	readLimit := int64(15<<20) + 1
	if model.AdStudioPreviewIsVideo(t.PreviewContentType) {
		readLimit = (50 << 20) + 1
	}
	data, err := io.ReadAll(io.LimitReader(src, readLimit))
	if err != nil {
		return nil, "", err
	}
	var thumb []byte
	if model.AdStudioPreviewIsVideo(t.PreviewContentType) {
		thumb, err = extractVideoPosterWebP(data)
	} else {
		thumb, err = encodeAdStudioDisplayWebP(data)
	}
	if err != nil || len(thumb) == 0 {
		return nil, "", ErrAdStudioPreviewProcess
	}
	thumbKey := fmt.Sprintf("postilka/ad-studio/previews/%s.webp", uuid.NewString())
	if err := s.objectStore.PutObjectWithCacheControl(ctx, thumbKey, "image/webp", adStudioThumbObjectCacheControl, thumb); err != nil {
		return nil, "", err
	}
	if _, err := s.repo.UpdatePreviewThumb(ctx, t.ID, thumbKey); err != nil {
		_ = s.objectStore.DeleteObject(ctx, thumbKey)
		return nil, "", err
	}
	return io.NopCloser(bytes.NewReader(thumb)), "image/webp", nil
}

func (s *AdStudioService) deletePreviewObjects(ctx context.Context, t model.AdStudioTemplate) {
	for _, key := range []string{t.PreviewS3Key, t.PreviewThumbS3Key} {
		if k := strings.TrimSpace(key); k != "" {
			_ = s.objectStore.DeleteObject(ctx, k)
		}
	}
}

func (s *AdStudioService) Generate(
	ctx context.Context,
	userID string,
	r *http.Request,
	id string,
	req model.AdStudioGenerateRequest,
) (StartGenerateResult, string, error) {
	t, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return StartGenerateResult{}, "", err
	}
	if !t.IsPublished {
		return StartGenerateResult{}, "", ErrAdStudioNotPublished
	}
	if hidden, err := s.categoryIsHidden(ctx, t.Catalog, t.Category); err != nil {
		return StartGenerateResult{}, "", err
	} else if hidden {
		return StartGenerateResult{}, "", ErrAdStudioNotPublished
	}

	mode := model.NormalizeAdStudioGenerationMode(t.GenerationMode)
	if mode == "" {
		if t.MediaKind == model.AdStudioMediaVideo {
			mode = model.AdStudioModeReferenceToVideo
		} else {
			mode = model.AdStudioModeCombine
		}
	}

	productID := strings.TrimSpace(req.ProductUploadID)
	avatarID := strings.TrimSpace(req.AvatarUploadID)
	// The combine mode is configurable: a template may require a product,
	// a model, both references, or neither. Other product-based modes keep
	// their intrinsic product requirement.
	needsProduct := t.RequiresProduct || (mode != model.AdStudioModeCombine && model.AdStudioModeNeedsProduct(mode))
	if needsProduct && productID == "" {
		return StartGenerateResult{}, "", ErrAdStudioProductRequired
	}
	if t.RequiresAvatar && avatarID == "" {
		return StartGenerateResult{}, "", ErrAdStudioAvatarRequired
	}

	usesTemplate := model.AdStudioModeUsesTemplateInput(mode)
	if usesTemplate && strings.TrimSpace(t.PreviewS3Key) == "" {
		return StartGenerateResult{}, "", ErrAdStudioPreviewRequired
	}

	var templateID string
	var templateVideoID string
	if usesTemplate {
		if model.AdStudioPreviewIsVideo(t.PreviewContentType) {
			templateUpload, err := s.generation.ImportVideoSourceFromObject(ctx, userID, r, t.PreviewS3Key, t.PreviewContentType)
			if err != nil {
				return StartGenerateResult{}, "", err
			}
			templateVideoID = templateUpload.ID
		} else {
			templateUpload, err := s.generation.ImportSourceFromObject(ctx, userID, r, t.PreviewS3Key, t.PreviewContentType)
			if err != nil {
				return StartGenerateResult{}, "", err
			}
			templateID = templateUpload.ID
		}
	}

	scenario := "default"
	if mode == model.AdStudioModeCombine {
		switch {
		case t.RequiresProduct && t.RequiresAvatar:
			scenario = "both"
		case t.RequiresProduct:
			scenario = "product_only"
		case t.RequiresAvatar:
			scenario = "avatar_only"
		default:
			scenario = "none"
		}
	}
	prompt := composeAdStudioPrompt(t, mode, req.Edit)
	if configured, promptErr := s.GetSystemPromptForGeneration(ctx, mode, scenario); promptErr != nil {
		return StartGenerateResult{}, "", promptErr
	} else if strings.TrimSpace(configured) != "" {
		prompt = composeAdStudioPromptWithBase(t, mode, req.Edit, configured)
	}
	kind := model.AdStudioMediaKindForMode(mode)

	switch mode {
	case model.AdStudioModeTextToVideo:
		result, err := s.generation.StartGenerateVideo(ctx, userID, r, GenerateVideoInput{
			Mode:        model.KieVideoModeTextToVideo,
			Prompt:      prompt,
			AspectRatio: t.AspectRatio,
			Duration:    t.Duration,
		})
		return result, kind, err
	case model.AdStudioModeImageToVideo:
		result, err := s.generation.StartGenerateVideo(ctx, userID, r, GenerateVideoInput{
			Mode:           model.KieVideoModeImageToVideo,
			Prompt:         prompt,
			AspectRatio:    t.AspectRatio,
			Duration:       t.Duration,
			SourceUploadID: productID,
		})
		return result, kind, err
	case model.AdStudioModeReferenceToVideo:
		refImages := make([]string, 0, 2)
		refVideos := make([]string, 0, 1)
		if templateVideoID != "" {
			refVideos = append(refVideos, templateVideoID)
		} else if templateID != "" {
			refImages = append(refImages, templateID)
		}
		if productID != "" {
			refImages = append(refImages, productID)
		}
		if avatarID != "" {
			refImages = append(refImages, avatarID)
		}
		result, err := s.generation.StartGenerateVideo(ctx, userID, r, GenerateVideoInput{
			Mode:                    model.KieVideoModeReferenceToVideo,
			Prompt:                  prompt,
			AspectRatio:             t.AspectRatio,
			Duration:                t.Duration,
			ReferenceUploadIDs:      refImages,
			ReferenceVideoUploadIDs: refVideos,
		})
		return result, kind, err
	case model.AdStudioModeTextToImage:
		result, err := s.generation.StartGenerate(ctx, userID, r, GenerateImageInput{
			Mode:        model.AdStudioModeTextToImage,
			Prompt:      prompt,
			AspectRatio: normalizeAdStudioImageRatio(t.AspectRatio),
		})
		return result, kind, err
	case model.AdStudioModeImageToImage:
		result, err := s.generation.StartGenerate(ctx, userID, r, GenerateImageInput{
			Mode:           model.AdStudioModeImageToImage,
			Prompt:         prompt,
			AspectRatio:    normalizeAdStudioImageRatio(t.AspectRatio),
			SourceUploadID: productID,
		})
		return result, kind, err

	default:
		refs := []string{templateID}
		if t.RequiresProduct && productID != "" {
			refs = append(refs, productID)
		}
		if t.RequiresAvatar && avatarID != "" {
			refs = append(refs, avatarID)
		}
		result, err := s.generation.StartGenerate(ctx, userID, r, GenerateImageInput{
			Mode:             model.AdStudioModeCombine,
			Prompt:           prompt,
			AspectRatio:      normalizeAdStudioImageRatio(t.AspectRatio),
			CombineUploadIDs: refs,
		})
		return result, kind, err
	}
}

func composeAdStudioPrompt(t model.AdStudioTemplate, mode, edit string) string {
	return composeAdStudioPromptWithBase(t, mode, edit, "")
}

func composeAdStudioPromptWithBase(t model.AdStudioTemplate, mode, edit, base string) string {
	var b strings.Builder
	switch mode {
	case model.AdStudioModeCombine:
		b.WriteString("TEMPLATE is image 1. Recreate its exact scene: background, setting, camera angle, lighting, composition, typography, and mood. ")
		switch {
		case t.RequiresProduct && t.RequiresAvatar:
			b.WriteString("PRODUCT is image 2, MODEL is image 3. Replace product and person in the template with these references. Preserve real shapes, materials, labels, colors, and model appearance. Keep all other elements unchanged.")
		case t.RequiresProduct:
			b.WriteString("PRODUCT is image 2. Replace only the product in the template with this reference. Preserve real shape, materials, labels, colors. Keep person and all other elements unchanged.")
		case t.RequiresAvatar:
			b.WriteString("MODEL is image 2. Replace only the person in the template with this model. Preserve recognizable appearance. Keep product, background, composition unchanged. Do not add or replace any product.")
		default:
			b.WriteString("No additional references. Recreate the template scene exactly. Do not invent products or models.")
		}
	case model.AdStudioModeReferenceToVideo:
		if model.AdStudioPreviewIsVideo(t.PreviewContentType) {
			b.WriteString("TEMPLATE video is reference 1. Recreate that exact scene: background, setting, camera angle, lighting, composition, motion, typography, and mood. ")
			b.WriteString("PRODUCT is image 2. Replace only the original product from the template with this product. Keep real shape, materials, labels, colors, proportions.")
		} else {
			b.WriteString("TEMPLATE is image 1. Recreate that exact scene: background, setting, camera angle, lighting, composition, typography, and mood. ")
			b.WriteString("PRODUCT is image 2. Replace only the original product from the template with this product. Keep real shape, materials, labels, colors, proportions.")
		}
	case model.AdStudioModeImageToImage, model.AdStudioModeImageToVideo:
		b.WriteString("Edit the uploaded product photo according to the template notes. Keep product identity, labels, and shape.")
	default:
		b.WriteString("Create advertising content from the template notes.")
	}
	if custom := strings.TrimSpace(base); custom != "" {
		b.Reset()
		b.WriteString(custom)
	}
	if extra := strings.TrimSpace(edit); extra != "" {
		b.WriteString("\nUser changes:\n")
		b.WriteString(extra)
		b.WriteString("\n")
	}
	out := strings.TrimSpace(b.String())
	maxChars := 1500
	switch mode {
	case model.AdStudioModeTextToVideo, model.AdStudioModeImageToVideo, model.AdStudioModeReferenceToVideo:
		maxChars = ai.KieVideoPromptMaxChars
	}
	length := utf8.RuneCountInString(out)
	slog.Debug("ad studio prompt composed", "mode", mode, "length", length, "max", maxChars)
	if length > maxChars {
		slog.Warn("ad studio prompt truncated", "mode", mode, "original_length", length, "max", maxChars)
		return string([]rune(out)[:maxChars])
	}
	return out
}

func templateFromWrite(base model.AdStudioTemplate, req model.AdStudioTemplateWriteRequest, creating bool) (model.AdStudioTemplate, error) {
	title := strings.TrimSpace(req.Title)
	if title == "" {
		return model.AdStudioTemplate{}, ErrAdStudioTitleRequired
	}
	title = truncateRunes(title, 200)
	prompt := truncateRunes(strings.TrimSpace(req.SystemPrompt), adStudioPromptMaxRunes)
	catalog := model.NormalizeAdStudioCatalog(req.Catalog)
	if !creating && strings.TrimSpace(base.Catalog) != "" {
		catalog = model.NormalizeAdStudioCatalog(base.Catalog)
	}
	category := strings.TrimSpace(req.Category)
	if err := validateAdStudioCategory(catalog, category, false); err != nil {
		return model.AdStudioTemplate{}, err
	}
	mode := model.NormalizeAdStudioGenerationMode(req.GenerationMode)
	if mode == "" {
		if creating {
			if category == model.AdStudioCategoryMotion || category == model.AdStudioCategoryUGC ||
				category == model.AdTrendsCategoryChallenges || category == model.AdTrendsCategoryViral {
				mode = model.AdStudioModeReferenceToVideo
			} else {
				mode = model.AdStudioModeCombine
			}
		} else if base.GenerationMode != "" {
			mode = model.NormalizeAdStudioGenerationMode(base.GenerationMode)
		}
	}
	if mode == "" {
		return model.AdStudioTemplate{}, ErrAdStudioInvalidMode
	}
	kind := model.AdStudioMediaKindForMode(mode)
	if reqKind := strings.TrimSpace(req.MediaKind); reqKind != "" && reqKind != kind {
		kind = model.AdStudioMediaKindForMode(mode)
	}
	ratio := strings.TrimSpace(req.AspectRatio)
	if ratio == "" {
		ratio = defaultAdStudioRatio(category, kind)
	}
	duration := req.Duration
	if duration <= 0 {
		duration = 5
	}
	if duration < 4 {
		duration = 4
	}
	if duration > 15 {
		duration = 15
	}

	t := base
	t.Title = title
	t.Description = strings.TrimSpace(req.Description)
	t.Catalog = catalog
	t.Category = category
	t.MediaKind = kind
	t.GenerationMode = mode
	t.AspectRatio = ratio
	t.Duration = duration
	t.SystemPrompt = prompt
	if req.RequiresProduct != nil {
		t.RequiresProduct = *req.RequiresProduct
	} else if creating {
		t.RequiresProduct = model.AdStudioModeNeedsProduct(mode)
	}
	if req.RequiresAvatar != nil {
		t.RequiresAvatar = *req.RequiresAvatar
	}
	if req.SortOrder != nil {
		t.SortOrder = *req.SortOrder
	}
	if req.IsPublished != nil {
		t.IsPublished = *req.IsPublished
	}
	return t, nil
}

func (s *AdStudioService) categoryIsHidden(ctx context.Context, catalog, category string) (bool, error) {
	hidden, err := s.HiddenCategories(ctx, catalog)
	if err != nil {
		return false, err
	}
	return hiddenSet(hidden)[strings.TrimSpace(category)], nil
}

func hiddenSet(hidden []string) map[string]bool {
	out := make(map[string]bool, len(hidden))
	for _, id := range hidden {
		out[id] = true
	}
	return out
}

func normalizeHiddenAdStudioCategories(catalog string, hidden []string) []string {
	out := make([]string, 0, len(hidden))
	seen := map[string]bool{}
	for _, id := range hidden {
		id = strings.TrimSpace(id)
		if id == "" || seen[id] || validateAdStudioCategory(catalog, id, false) != nil {
			continue
		}
		seen[id] = true
		out = append(out, id)
	}
	return out
}

func validateAdStudioCategory(catalog, category string, allowEmpty bool) error {
	cat := strings.TrimSpace(category)
	if cat == "" {
		if allowEmpty {
			return nil
		}
		return ErrAdStudioInvalidCategory
	}
	if model.NormalizeAdStudioCatalog(catalog) == model.AdStudioCatalogTrends {
		if model.IsAdTrendsCategory(cat) {
			return nil
		}
		return ErrAdStudioInvalidCategory
	}
	if model.IsAdStudioCategory(cat) {
		return nil
	}
	return ErrAdStudioInvalidCategory
}

func defaultAdStudioRatio(category, kind string) string {
	if kind == model.AdStudioMediaVideo {
		return "9:16"
	}
	switch category {
	case model.AdStudioCategoryPosters, model.AdStudioCategoryProductShot,
		model.AdTrendsCategoryMemes, model.AdTrendsCategoryFormats:
		return "4:5"
	default:
		return "1:1"
	}
}

const adStudioPromptMaxRunes = 16000

func (s *AdStudioService) ListSystemPromptsAdmin(ctx context.Context) ([]model.AdStudioSystemPrompt, error) {
	return s.promptsRepo.List(ctx)
}

func (s *AdStudioService) CreateSystemPromptAdmin(ctx context.Context, req model.AdStudioSystemPromptWriteRequest) (model.AdStudioSystemPrompt, error) {
	if strings.TrimSpace(req.Mode) == "" || strings.TrimSpace(req.Scenario) == "" || strings.TrimSpace(req.PromptText) == "" {
		return model.AdStudioSystemPrompt{}, errors.New("mode, scenario and prompt_text are required")
	}
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	return s.promptsRepo.Create(ctx, model.AdStudioSystemPrompt{Mode: req.Mode, Scenario: req.Scenario, PromptText: strings.TrimSpace(req.PromptText), IsActive: active})
}

func (s *AdStudioService) UpdateSystemPromptAdmin(ctx context.Context, id int, req model.AdStudioSystemPromptWriteRequest) (model.AdStudioSystemPrompt, error) {
	p, err := s.promptsRepo.GetByID(ctx, id)
	if err != nil {
		return p, err
	}
	if strings.TrimSpace(req.PromptText) != "" {
		p.PromptText = strings.TrimSpace(req.PromptText)
	}
	if req.IsActive != nil {
		p.IsActive = *req.IsActive
	}
	return s.promptsRepo.Update(ctx, p)
}

func (s *AdStudioService) DeleteSystemPromptAdmin(ctx context.Context, id int) error {
	return s.promptsRepo.Delete(ctx, id)
}

func (s *AdStudioService) GetSystemPromptForGeneration(ctx context.Context, mode, scenario string) (string, error) {
	if s.promptsRepo == nil {
		return "", nil
	}
	p, err := s.promptsRepo.GetByModeAndScenario(ctx, mode, scenario)
	if errors.Is(err, repository.ErrNotFound) {
		return "", nil
	}
	if err != nil || !p.IsActive {
		return "", err
	}
	return p.PromptText, nil
}

func normalizeAdStudioImageRatio(ratio string) string {

	switch strings.TrimSpace(ratio) {
	case "1:1", "4:5", "3:4", "2:3", "9:16", "16:9", "4:3", "3:2":
		return ratio
	default:
		return "1:1"
	}
}
