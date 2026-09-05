package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

type AdStudioHandler struct {
	svc *service.AdStudioService
}

func NewAdStudioHandler(svc *service.AdStudioService) *AdStudioHandler {
	return &AdStudioHandler{svc: svc}
}

func catalogFromRequest(r *http.Request) string {
	return model.NormalizeAdStudioCatalog(r.URL.Query().Get("catalog"))
}

func (h *AdStudioHandler) List(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.UserIDFromContext(r.Context()); !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	items, hidden, err := h.svc.ListPublic(r.Context(), catalogFromRequest(r), r.URL.Query().Get("category"))
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "hidden_categories": hidden})
}

func (h *AdStudioHandler) ListCatalog(w http.ResponseWriter, r *http.Request) {
	limit := parseIntDefault(r.URL.Query().Get("limit"), 18)
	offset := parseIntDefault(r.URL.Query().Get("offset"), 0)
	if limit < 1 {
		limit = 18
	}
	if limit > 48 {
		limit = 48
	}
	if offset < 0 {
		offset = 0
	}
	category := strings.TrimSpace(r.URL.Query().Get("category"))
	if category == "all" {
		category = ""
	}
	catalog := catalogFromRequest(r)
	items, hidden, total, err := h.svc.ListCatalog(r.Context(), catalog, category, limit, offset)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items":             items,
		"categories":        model.VisibleCategoriesForCatalog(catalog, hidden),
		"hidden_categories": hidden,
		"total":             total,
		"limit":             limit,
		"offset":            offset,
		"has_more":          offset+len(items) < total,
	})
}

func (h *AdStudioHandler) PublicPreview(w http.ResponseWriter, r *http.Request) {
	url, err := h.svc.PreviewPresignedURL(r.Context(), chi.URLParam(r, "id"), true, false)
	if err != nil {
		h.mapError(w, err)
		return
	}
	redirectPresignedObject(w, r, url)
}

func (h *AdStudioHandler) PublicPreviewSource(w http.ResponseWriter, r *http.Request) {
	url, err := h.svc.PreviewPresignedURL(r.Context(), chi.URLParam(r, "id"), true, true)
	if err != nil {
		h.mapError(w, err)
		return
	}
	redirectPresignedObject(w, r, url)
}

func (h *AdStudioHandler) Get(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.UserIDFromContext(r.Context()); !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	item, err := h.svc.GetPublic(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}

func (h *AdStudioHandler) Preview(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.UserIDFromContext(r.Context()); !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	url, err := h.svc.PreviewPresignedURL(r.Context(), chi.URLParam(r, "id"), true, false)
	if err != nil {
		h.mapError(w, err)
		return
	}
	redirectPresignedObject(w, r, url)
}

func (h *AdStudioHandler) PreviewSource(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.UserIDFromContext(r.Context()); !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	url, err := h.svc.PreviewPresignedURL(r.Context(), chi.URLParam(r, "id"), true, true)
	if err != nil {
		h.mapError(w, err)
		return
	}
	redirectPresignedObject(w, r, url)
}

func (h *AdStudioHandler) Generate(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req model.AdStudioGenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	result, mediaKind, err := h.svc.Generate(r.Context(), userID, r, chi.URLParam(r, "id"), req)
	if err != nil {
		slog.Error("ad studio generation request failed", "template_id", chi.URLParam(r, "id"), "user_id", userID, "error", err)
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{"job": result.Job, "media_kind": mediaKind})
}

func (h *AdStudioHandler) AdminGetCategories(w http.ResponseWriter, r *http.Request) {
	settings, err := h.svc.CategorySettings(r.Context(), catalogFromRequest(r))
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"hidden_categories": settings.HiddenCategories,
		"shuffle_templates": settings.ShuffleTemplates,
	})
}

func (h *AdStudioHandler) AdminUpdateCategories(w http.ResponseWriter, r *http.Request) {
	var req struct {
		HiddenCategories []string `json:"hidden_categories"`
		ShuffleTemplates bool     `json:"shuffle_templates"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	settings, err := h.svc.SetCategorySettings(r.Context(), catalogFromRequest(r), req.HiddenCategories, req.ShuffleTemplates)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"hidden_categories": settings.HiddenCategories,
		"shuffle_templates": settings.ShuffleTemplates,
	})
}

func (h *AdStudioHandler) AdminList(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListAdmin(r.Context(), catalogFromRequest(r), r.URL.Query().Get("category"))
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *AdStudioHandler) AdminCreate(w http.ResponseWriter, r *http.Request) {
	var req model.AdStudioTemplateWriteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	if strings.TrimSpace(req.Catalog) == "" {
		req.Catalog = catalogFromRequest(r)
	}
	item, err := h.svc.CreateAdmin(r.Context(), req)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"item": item})
}

func (h *AdStudioHandler) AdminUpdate(w http.ResponseWriter, r *http.Request) {
	var req model.AdStudioTemplateWriteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	item, err := h.svc.UpdateAdmin(r.Context(), chi.URLParam(r, "id"), req)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}

func (h *AdStudioHandler) AdminDelete(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.DeleteAdmin(r.Context(), chi.URLParam(r, "id")); err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *AdStudioHandler) AdminPreview(w http.ResponseWriter, r *http.Request) {
	url, err := h.svc.PreviewPresignedURL(r.Context(), chi.URLParam(r, "id"), false, false)
	if err != nil {
		h.mapError(w, err)
		return
	}
	redirectPresignedObject(w, r, url)
}

func (h *AdStudioHandler) AdminPreviewSource(w http.ResponseWriter, r *http.Request) {
	url, err := h.svc.PreviewPresignedURL(r.Context(), chi.URLParam(r, "id"), false, true)
	if err != nil {
		h.mapError(w, err)
		return
	}
	redirectPresignedObject(w, r, url)
}

func (h *AdStudioHandler) AdminUploadPreview(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(52 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректная загрузка файла")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Файл не найден")
		return
	}
	item, err := h.svc.UploadPreview(r.Context(), chi.URLParam(r, "id"), file, header)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}

func (h *AdStudioHandler) AdminBackfillPreviews(w http.ResponseWriter, r *http.Request) {
	ready, failed, err := h.svc.BackfillMissingPreviewThumbs(r.Context())
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":     true,
		"ready":  ready,
		"failed": failed,
	})
}

// Admin System Prompts handlers

func (h *AdStudioHandler) AdminListSystemPrompts(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListSystemPromptsAdmin(r.Context())
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *AdStudioHandler) AdminCreateSystemPrompt(w http.ResponseWriter, r *http.Request) {
	var req model.AdStudioSystemPromptWriteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	item, err := h.svc.CreateSystemPromptAdmin(r.Context(), req)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"item": item})
}

func (h *AdStudioHandler) AdminUpdateSystemPrompt(w http.ResponseWriter, r *http.Request) {
	id := parseIntDefault(chi.URLParam(r, "id"), 0)
	if id <= 0 {
		writeError(w, http.StatusBadRequest, "Некорректный ID")
		return
	}
	var req model.AdStudioSystemPromptWriteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	item, err := h.svc.UpdateSystemPromptAdmin(r.Context(), id, req)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}

func (h *AdStudioHandler) AdminDeleteSystemPrompt(w http.ResponseWriter, r *http.Request) {
	id := parseIntDefault(chi.URLParam(r, "id"), 0)
	if id <= 0 {
		writeError(w, http.StatusBadRequest, "Некорректный ID")
		return
	}
	if err := h.svc.DeleteSystemPromptAdmin(r.Context(), id); err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *AdStudioHandler) mapError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrAdStudioProductRequired):
		writeErrorWithCode(w, http.StatusBadRequest, "product_required", "Загрузите фото товара")
	case errors.Is(err, service.ErrAdStudioAvatarRequired):
		writeErrorWithCode(w, http.StatusBadRequest, "avatar_required", "Загрузите фото модели")
	case errors.Is(err, service.ErrAdStudioNotPublished):
		writeErrorWithCode(w, http.StatusNotFound, "not_found", "Шаблон не найден")
	case errors.Is(err, service.ErrAdStudioInvalidCategory):
		writeErrorWithCode(w, http.StatusBadRequest, "invalid_category", "Некорректный режим шаблона")
	case errors.Is(err, service.ErrAdStudioInvalidKind):
		writeErrorWithCode(w, http.StatusBadRequest, "invalid_media_kind", "Укажите фото или видео")
	case errors.Is(err, service.ErrAdStudioInvalidMode):
		writeErrorWithCode(w, http.StatusBadRequest, "invalid_generation_mode", "Укажите режим генерации")
	case errors.Is(err, service.ErrAdStudioTitleRequired):
		writeErrorWithCode(w, http.StatusBadRequest, "invalid_title", "Укажите название шаблона")
	case errors.Is(err, service.ErrAdStudioPromptRequired):
		writeErrorWithCode(w, http.StatusBadRequest, "invalid_prompt", "Укажите системный промпт")
	case errors.Is(err, service.ErrAdStudioPreviewInvalid):
		writeErrorWithCode(w, http.StatusBadRequest, "preview_invalid", "Загрузите фото или видео превью (MP4/MOV/WebM, 2–15 сек, до 50 МБ для видео). WebM и другие форматы конвертируем в MP4.")
	case errors.Is(err, service.ErrKieReferenceVideoConvert):
		writeErrorWithCode(w, http.StatusBadRequest, "preview_convert_failed", "Не удалось подготовить видео-превью. Загрузите ролик 2–15 сек — мы конвертируем его в MP4.")
	case errors.Is(err, service.ErrReferenceVideoDuration):
		writeErrorWithCode(w, http.StatusBadRequest, "reference_video_duration", service.ReferenceVideoDurationHTTPMessage(err))
	case errors.Is(err, service.ErrAdStudioPreviewProcess):
		writeErrorWithCode(w, http.StatusBadRequest, "preview_process_failed", "Не удалось обработать превью. Загрузите обычное фото или короткое видео.")
	case errors.Is(err, service.ErrAdStudioPreviewRequired):
		writeErrorWithCode(w, http.StatusBadRequest, "preview_required", "У шаблона нет превью. Загрузите его в админке.")
	case errors.Is(err, service.ErrInsufficientAICredits):
		writeErrorWithCode(w, http.StatusPaymentRequired, "insufficient_credits", "Недостаточно AI-кредитов или средств на кошельке")
	case errors.Is(err, service.ErrKieNotConfigured), errors.Is(err, service.ErrVideoGenerationNotConfigured):
		writeErrorWithCode(w, http.StatusServiceUnavailable, "generation_not_configured", "Сервис генерации временно недоступен")
	case errors.Is(err, service.ErrGenerationUploadNotFound):
		writeErrorWithCode(w, http.StatusBadRequest, "upload_not_found", "Исходное фото не найдено")
	case errors.Is(err, service.ErrGenerationSourceRequired), errors.Is(err, service.ErrVideoGenerationSourceRequired):
		writeErrorWithCode(w, http.StatusBadRequest, "source_required", "Загрузите фото товара")
	case errors.Is(err, service.ErrNoPrimaryWS):
		writeErrorWithCode(w, http.StatusNotFound, "no_workspace", "Workspace не найден")
	case errors.Is(err, repository.ErrNotFound):
		writeErrorWithCode(w, http.StatusNotFound, "not_found", "Не найдено")
	default:
		msg := err.Error()
		if strings.Contains(strings.ToLower(msg), "kie") || strings.Contains(strings.ToLower(msg), "generation") {
			writeErrorWithCode(w, http.StatusBadGateway, "generation_failed", service.UserGenerationFailMessage(msg))
			return
		}
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
	}
}
