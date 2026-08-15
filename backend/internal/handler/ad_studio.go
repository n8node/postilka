package handler

import (
	"encoding/json"
	"errors"
	"io"
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

func (h *AdStudioHandler) List(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.UserIDFromContext(r.Context()); !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	items, hidden, err := h.svc.ListPublic(r.Context(), r.URL.Query().Get("category"))
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "hidden_categories": hidden})
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
	body, contentType, err := h.svc.PreviewObject(r.Context(), chi.URLParam(r, "id"), true)
	if err != nil {
		h.mapError(w, err)
		return
	}
	defer body.Close()
	if contentType == "" {
		contentType = "image/jpeg"
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "private, max-age=3600")
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, body)
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
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{"job": result.Job, "media_kind": mediaKind})
}

func (h *AdStudioHandler) AdminGetCategories(w http.ResponseWriter, r *http.Request) {
	hidden, err := h.svc.HiddenCategories(r.Context())
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"hidden_categories": hidden})
}

func (h *AdStudioHandler) AdminUpdateCategories(w http.ResponseWriter, r *http.Request) {
	var req struct {
		HiddenCategories []string `json:"hidden_categories"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	hidden, err := h.svc.SetHiddenCategories(r.Context(), req.HiddenCategories)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"hidden_categories": hidden})
}

func (h *AdStudioHandler) AdminList(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListAdmin(r.Context(), r.URL.Query().Get("category"))
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
	body, contentType, err := h.svc.PreviewObject(r.Context(), chi.URLParam(r, "id"), false)
	if err != nil {
		h.mapError(w, err)
		return
	}
	defer body.Close()
	if contentType == "" {
		contentType = "image/jpeg"
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "private, max-age=60")
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, body)
}

func (h *AdStudioHandler) AdminUploadPreview(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(16 << 20); err != nil {
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
		writeErrorWithCode(w, http.StatusBadRequest, "preview_invalid", "Загрузите изображение превью")
	case errors.Is(err, service.ErrAdStudioPreviewProcess):
		writeErrorWithCode(w, http.StatusBadRequest, "preview_process_failed", "Не удалось обработать превью. Загрузите обычное фото.")
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
