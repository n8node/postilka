package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/service"
)

type ShortsHandler struct{ shorts *service.ShortsService }

func NewShortsHandler(shorts *service.ShortsService) *ShortsHandler {
	return &ShortsHandler{shorts: shorts}
}

func (h *ShortsHandler) CreateProject(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req service.CreateShortsProjectInput
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	project, job, err := h.shorts.CreateProject(r.Context(), userID, r, req)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{"project": project, "job": job})
}

func (h *ShortsHandler) GetProject(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	project, clips, err := h.shorts.GetProject(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"project": project, "clips": clips})
}

func (h *ShortsHandler) GetJob(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	job, err := h.shorts.GetJob(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"job": job})
}

func (h *ShortsHandler) mapError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrShortsSourceRequired):
		writeErrorWithCode(w, http.StatusBadRequest, "shorts_source_required", "Загрузите исходное видео")
	case errors.Is(err, service.ErrShortsDurationRequired), errors.Is(err, service.ErrInvalidShortsRange), errors.Is(err, service.ErrShortsRangeOutsideVideo):
		writeErrorWithCode(w, http.StatusBadRequest, "shorts_invalid_range", "Укажите корректный диапазон обработки видео")
	case errors.Is(err, service.ErrShortsProjectNotFound):
		writeErrorWithCode(w, http.StatusNotFound, "shorts_project_not_found", "Проект Shorts не найден")
	case errors.Is(err, service.ErrWorkspaceNotFound), errors.Is(err, service.ErrNotWorkspaceMember):
		writeError(w, http.StatusForbidden, "Пространство не найдено или недоступно")
	case errors.Is(err, service.ErrForbidden):
		writeError(w, http.StatusForbidden, "Недостаточно прав")
	default:
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
	}
}
