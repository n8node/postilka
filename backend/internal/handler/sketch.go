package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

type SketchHandler struct {
	svc *service.SketchService
}

func NewSketchHandler(svc *service.SketchService) *SketchHandler {
	return &SketchHandler{svc: svc}
}

func (h *SketchHandler) ListStyles(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.UserIDFromContext(r.Context()); !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	items, err := h.svc.ListPublic(r.Context())
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *SketchHandler) GetStyle(w http.ResponseWriter, r *http.Request) {
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

func (h *SketchHandler) PreviewStyle(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.UserIDFromContext(r.Context()); !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	url, err := h.svc.PreviewPresignedURL(r.Context(), chi.URLParam(r, "id"), true)
	if err != nil {
		h.mapError(w, err)
		return
	}
	redirectPresignedObject(w, r, url)
}

func (h *SketchHandler) Generate(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req model.SketchGenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	result, mediaKind, err := h.svc.Generate(r.Context(), userID, r, req)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{"job": result.Job, "media_kind": mediaKind})
}

func (h *SketchHandler) AdminList(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListAdmin(r.Context())
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *SketchHandler) AdminCreate(w http.ResponseWriter, r *http.Request) {
	var req model.SketchStyleWriteRequest
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

func (h *SketchHandler) AdminUpdate(w http.ResponseWriter, r *http.Request) {
	var req model.SketchStyleWriteRequest
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

func (h *SketchHandler) AdminDelete(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.DeleteAdmin(r.Context(), chi.URLParam(r, "id")); err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *SketchHandler) AdminPreview(w http.ResponseWriter, r *http.Request) {
	url, err := h.svc.PreviewPresignedURL(r.Context(), chi.URLParam(r, "id"), false)
	if err != nil {
		h.mapError(w, err)
		return
	}
	redirectPresignedObject(w, r, url)
}

func (h *SketchHandler) AdminUploadPreview(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(12 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректная загрузка")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Файл не найден")
		return
	}
	if err := h.svc.UploadPreviewAdmin(r.Context(), chi.URLParam(r, "id"), file, header); err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *SketchHandler) mapError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, repository.ErrNotFound),
		errors.Is(err, service.ErrSketchStyleNotFound):
		writeError(w, http.StatusNotFound, "Стиль не найден")
	case errors.Is(err, service.ErrSketchStyleNotPublished):
		writeError(w, http.StatusNotFound, "Стиль недоступен")
	case errors.Is(err, service.ErrSketchSourceRequired):
		writeError(w, http.StatusBadRequest, "Загрузите набросок на холст")
	case errors.Is(err, service.ErrSketchTitleRequired):
		writeError(w, http.StatusBadRequest, "Укажите название стиля")
	case errors.Is(err, service.ErrSketchPromptRequired):
		writeError(w, http.StatusBadRequest, "Укажите промпт стиля")
	case errors.Is(err, service.ErrSketchPreviewInvalid):
		writeError(w, http.StatusBadRequest, "Некорректное изображение превью")
	case errors.Is(err, service.ErrGenerationSourceRequired):
		writeError(w, http.StatusBadRequest, "Загрузите набросок на холст")
	case errors.Is(err, service.ErrInsufficientAICredits):
		writeError(w, http.StatusPaymentRequired, "Недостаточно кредитов")
	default:
		if msg := strings.TrimSpace(err.Error()); msg != "" {
			writeError(w, http.StatusBadRequest, msg)
			return
		}
		writeError(w, http.StatusInternalServerError, "Ошибка наброска")
	}
}
