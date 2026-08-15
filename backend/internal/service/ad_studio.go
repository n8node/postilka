package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path"
	"strings"

	"github.com/google/uuid"
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
)

type AdStudioService struct {
	repo        *repository.AdStudioRepository
	generation  *GenerationService
	objectStore *ObjectStorage
}

func NewAdStudioService(
	repo *repository.AdStudioRepository,
	generation *GenerationService,
	objectStore *ObjectStorage,
) *AdStudioService {
	return &AdStudioService{repo: repo, generation: generation, objectStore: objectStore}
}

func (s *AdStudioService) ListPublic(ctx context.Context, category string) ([]model.AdStudioTemplatePublicView, error) {
	if err := validateAdStudioCategory(category, true); err != nil {
		return nil, err
	}
	items, err := s.repo.List(ctx, category, true)
	if err != nil {
		return nil, err
	}
	out := make([]model.AdStudioTemplatePublicView, 0, len(items))
	for _, t := range items {
		out = append(out, t.ToPublicView())
	}
	return out, nil
}

func (s *AdStudioService) GetPublic(ctx context.Context, id string) (model.AdStudioTemplatePublicView, error) {
	t, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return model.AdStudioTemplatePublicView{}, err
	}
	if !t.IsPublished {
		return model.AdStudioTemplatePublicView{}, ErrAdStudioNotPublished
	}
	return t.ToPublicView(), nil
}

func (s *AdStudioService) ListAdmin(ctx context.Context, category string) ([]model.AdStudioTemplateAdminView, error) {
	if err := validateAdStudioCategory(category, true); err != nil {
		return nil, err
	}
	items, err := s.repo.List(ctx, category, false)
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
	t, err := templateFromWrite(model.AdStudioTemplate{}, req, true)
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
	if key := strings.TrimSpace(current.PreviewS3Key); key != "" {
		_ = s.objectStore.DeleteObject(ctx, key)
	}
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

	const maxSize = 15 << 20
	data, err := io.ReadAll(io.LimitReader(file, maxSize+1))
	if err != nil {
		return model.AdStudioTemplateAdminView{}, err
	}
	if len(data) == 0 || len(data) > maxSize {
		return model.AdStudioTemplateAdminView{}, ErrAdStudioPreviewInvalid
	}

	contentType := strings.TrimSpace(header.Header.Get("Content-Type"))
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}
	contentType = strings.Split(contentType, ";")[0]
	if !strings.HasPrefix(contentType, "image/") {
		return model.AdStudioTemplateAdminView{}, ErrAdStudioPreviewInvalid
	}

	ext := path.Ext(header.Filename)
	if ext == "" {
		switch contentType {
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		default:
			ext = ".jpg"
		}
	}
	key := fmt.Sprintf("postilka/ad-studio/previews/%s%s", uuid.NewString(), ext)
	if err := s.objectStore.PutObject(ctx, key, contentType, data); err != nil {
		return model.AdStudioTemplateAdminView{}, err
	}

	updated, err := s.repo.UpdatePreview(ctx, current.ID, key, contentType)
	if err != nil {
		_ = s.objectStore.DeleteObject(ctx, key)
		return model.AdStudioTemplateAdminView{}, err
	}
	if old := strings.TrimSpace(current.PreviewS3Key); old != "" && old != key {
		_ = s.objectStore.DeleteObject(ctx, old)
	}
	return updated.ToAdminView(), nil
}

func (s *AdStudioService) PreviewObject(ctx context.Context, id string, publishedOnly bool) (io.ReadCloser, string, error) {
	t, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, "", err
	}
	if publishedOnly && !t.IsPublished {
		return nil, "", ErrAdStudioNotPublished
	}
	if strings.TrimSpace(t.PreviewS3Key) == "" {
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

	productID := strings.TrimSpace(req.ProductUploadID)
	avatarID := strings.TrimSpace(req.AvatarUploadID)
	if t.RequiresProduct && productID == "" {
		return StartGenerateResult{}, "", ErrAdStudioProductRequired
	}
	if t.RequiresAvatar && avatarID == "" {
		return StartGenerateResult{}, "", ErrAdStudioAvatarRequired
	}
	if strings.TrimSpace(t.PreviewS3Key) == "" {
		return StartGenerateResult{}, "", ErrAdStudioPreviewRequired
	}

	templateUpload, err := s.generation.ImportSourceFromObject(ctx, userID, r, t.PreviewS3Key, t.PreviewContentType)
	if err != nil {
		return StartGenerateResult{}, "", err
	}
	templateID := templateUpload.ID

	prompt := composeAdStudioPrompt(t, req.Edit)
	refs := []string{templateID}
	if productID != "" {
		refs = append(refs, productID)
	}
	if avatarID != "" {
		refs = append(refs, avatarID)
	}

	if t.MediaKind == model.AdStudioMediaVideo {
		in := GenerateVideoInput{
			Prompt:      prompt,
			AspectRatio: t.AspectRatio,
			Duration:    t.Duration,
		}
		if len(refs) >= 2 {
			in.Mode = model.KieVideoModeReferenceToVideo
			in.ReferenceUploadIDs = refs
		} else {
			in.Mode = model.KieVideoModeImageToVideo
			in.SourceUploadID = templateID
		}
		result, err := s.generation.StartGenerateVideo(ctx, userID, r, in)
		return result, t.MediaKind, err
	}

	in := GenerateImageInput{
		Prompt:      prompt,
		AspectRatio: normalizeAdStudioImageRatio(t.AspectRatio),
	}
	if len(refs) >= 2 {
		in.Mode = "combine"
		in.CombineUploadIDs = refs
	} else {
		in.Mode = "image-to-image"
		in.SourceUploadID = templateID
	}
	result, err := s.generation.StartGenerate(ctx, userID, r, in)
	return result, t.MediaKind, err
}

func composeAdStudioPrompt(t model.AdStudioTemplate, edit string) string {
	var b strings.Builder
	b.WriteString("You are given reference images in this exact order.\n")
	b.WriteString("Image 1 is the advertising TEMPLATE. Recreate that exact scene: background, setting, camera angle, lighting, composition, typography placement, graphic shapes, and mood.\n")
	b.WriteString("Image 2 is the NEW PRODUCT photo. Replace only the original product from image 1 with this product. Keep the new product's real shape, materials, labels, colors, and proportions.\n")
	b.WriteString("Do not keep the original product from the template. Do not return image 2 unchanged. Do not invent a marketplace card or a new layout. The result must look like image 1 after a product swap.\n")
	if strings.TrimSpace(t.SystemPrompt) != "" {
		b.WriteString("\nTemplate notes:\n")
		b.WriteString(strings.TrimSpace(t.SystemPrompt))
		b.WriteString("\n")
	}
	if extra := strings.TrimSpace(edit); extra != "" {
		b.WriteString("\nUser changes:\n")
		b.WriteString(extra)
		b.WriteString("\n")
	}
	out := strings.TrimSpace(b.String())
	if len(out) > 4000 {
		return out[:4000]
	}
	return out
}

func templateFromWrite(base model.AdStudioTemplate, req model.AdStudioTemplateWriteRequest, creating bool) (model.AdStudioTemplate, error) {
	title := strings.TrimSpace(req.Title)
	if title == "" {
		return model.AdStudioTemplate{}, ErrAdStudioTitleRequired
	}
	if len(title) > 200 {
		title = title[:200]
	}
	prompt := strings.TrimSpace(req.SystemPrompt)
	if prompt == "" {
		return model.AdStudioTemplate{}, ErrAdStudioPromptRequired
	}
	if len(prompt) > 8000 {
		prompt = prompt[:8000]
	}
	category := strings.TrimSpace(req.Category)
	if err := validateAdStudioCategory(category, false); err != nil {
		return model.AdStudioTemplate{}, err
	}
	kind := strings.TrimSpace(req.MediaKind)
	if kind == "" {
		if category == model.AdStudioCategoryMotion || category == model.AdStudioCategoryUGC {
			kind = model.AdStudioMediaVideo
		} else {
			kind = model.AdStudioMediaImage
		}
	}
	if kind != model.AdStudioMediaImage && kind != model.AdStudioMediaVideo {
		return model.AdStudioTemplate{}, ErrAdStudioInvalidKind
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
	t.Category = category
	t.MediaKind = kind
	t.AspectRatio = ratio
	t.Duration = duration
	t.SystemPrompt = prompt
	if req.RequiresProduct != nil {
		t.RequiresProduct = *req.RequiresProduct
	} else if creating {
		t.RequiresProduct = true
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

func validateAdStudioCategory(category string, allowEmpty bool) error {
	cat := strings.TrimSpace(category)
	if cat == "" {
		if allowEmpty {
			return nil
		}
		return ErrAdStudioInvalidCategory
	}
	switch cat {
	case model.AdStudioCategoryProductShot,
		model.AdStudioCategoryMotion,
		model.AdStudioCategoryUGC,
		model.AdStudioCategoryAds,
		model.AdStudioCategoryPosters,
		model.AdStudioCategoryMarketplace:
		return nil
	default:
		return ErrAdStudioInvalidCategory
	}
}

func defaultAdStudioRatio(category, kind string) string {
	if kind == model.AdStudioMediaVideo {
		return "9:16"
	}
	switch category {
	case model.AdStudioCategoryPosters, model.AdStudioCategoryProductShot:
		return "4:5"
	default:
		return "1:1"
	}
}

func normalizeAdStudioImageRatio(ratio string) string {
	switch strings.TrimSpace(ratio) {
	case "1:1", "4:5", "9:16", "16:9":
		return ratio
	default:
		return "1:1"
	}
}
