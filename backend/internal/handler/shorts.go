package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
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

func (h *ShortsHandler) ListProjects(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))
	projects, total, err := h.shorts.ListProjects(r.Context(), userID, r, limit, offset)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"projects": projects, "total": total})
}

func (h *ShortsHandler) DeleteProject(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	if err := h.shorts.DeleteProject(r.Context(), userID, r, chi.URLParam(r, "id")); err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *ShortsHandler) AnalyzeProject(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	job, err := h.shorts.AnalyzeProject(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{"job": job})
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

func (h *ShortsHandler) UpdateClip(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var input model.ShortsClipUpdate
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректные данные клипа")
		return
	}
	clip, err := h.shorts.UpdateClip(r.Context(), userID, r, chi.URLParam(r, "id"), input)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"clip": clip})
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

func (h *ShortsHandler) DownloadAudio(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	url, expiresIn, err := h.shorts.AudioDownloadURL(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"url": url, "expires_in": expiresIn})
}

func (h *ShortsHandler) DownloadDraft(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	url, expiresIn, err := h.shorts.DraftDownloadURL(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"url": url, "expires_in": expiresIn})
}

func (h *ShortsHandler) UpdateSubtitleSettings(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var config service.ShortsSubtitleConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректные настройки субтитров")
		return
	}
	if err := h.shorts.UpdateSubtitleSettings(r.Context(), userID, r, chi.URLParam(r, "id"), config); err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *ShortsHandler) UpdateClipOrder(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var input struct {
		ClipIDs []string `json:"clip_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректный порядок клипов")
		return
	}
	if err := h.shorts.SetClipOrder(r.Context(), userID, r, chi.URLParam(r, "id"), input.ClipIDs); err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *ShortsHandler) RerenderProject(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	job, err := h.shorts.RerenderProject(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{"job": job})
}

func (h *ShortsHandler) mapError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrShortsSourceRequired):
		writeErrorWithCode(w, http.StatusBadRequest, "shorts_source_required", "Загрузите исходное видео")
	case errors.Is(err, service.ErrShortsDurationRequired), errors.Is(err, service.ErrInvalidShortsRange), errors.Is(err, service.ErrShortsRangeOutsideVideo):
		writeErrorWithCode(w, http.StatusBadRequest, "shorts_invalid_range", "Укажите корректный диапазон обработки видео")
	case errors.Is(err, service.ErrInvalidShortsClip):
		writeErrorWithCode(w, http.StatusBadRequest, "shorts_invalid_clip", "Проверьте диапазон, текст и статус клипа")
	case errors.Is(err, service.ErrShortsProjectNotFound):
		writeErrorWithCode(w, http.StatusNotFound, "shorts_project_not_found", "Проект Shorts не найден")
	case errors.Is(err, repository.ErrNotFound):
		writeErrorWithCode(w, http.StatusNotFound, "shorts_audio_not_found", "Аудиодорожка уже удалена или ещё не готова")
	case errors.Is(err, service.ErrWorkspaceNotFound), errors.Is(err, service.ErrNotWorkspaceMember):
		writeError(w, http.StatusForbidden, "Пространство не найдено или недоступно")
	case errors.Is(err, service.ErrForbidden):
		writeError(w, http.StatusForbidden, "Недостаточно прав")
	default:
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
	}
}
