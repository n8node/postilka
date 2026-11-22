package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
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
		slog.Error("shorts project creation failed", "request_id", chimw.GetReqID(r.Context()), "user_id", userID, "source_file_id", req.SourceFileID, "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "shorts_project_creation_failed", "message": err.Error(), "request_id": chimw.GetReqID(r.Context())})
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
	clip, err := h.shorts.UpdateClip(r.Context(), userID, r, r.URL.Query().Get("edit_project_id"), chi.URLParam(r, "id"), input)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"clip": clip})
}

func (h *ShortsHandler) DeleteClip(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	if err := h.shorts.DeleteClip(r.Context(), userID, r, r.URL.Query().Get("edit_project_id"), chi.URLParam(r, "id")); err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *ShortsHandler) CreateEditProject(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var input struct {
		SourceID string `json:"source_id"`
		Name     string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректные данные монтажного проекта")
		return
	}
	project, err := h.shorts.CreateEditProject(r.Context(), userID, r, input.SourceID, input.Name)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"project": project})
}

func (h *ShortsHandler) GetAnalysisForFile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	source, found, err := h.shorts.GetAnalysisForFile(r.Context(), userID, r, r.URL.Query().Get("file_id"))
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"source": source, "found": found})
}

func (h *ShortsHandler) ListSources(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	sources, err := h.shorts.ListSources(r.Context(), userID, r)
	if err != nil {
		h.mapError(w, err)
		return
	}
	projects, _, err := h.shorts.ListProjects(r.Context(), userID, r, 100, 0)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"sources": sources, "projects": projects})
}

func (h *ShortsHandler) GetSource(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	source, clips, err := h.shorts.GetSource(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		h.mapError(w, err)
		return
	}
	editProjects, err := h.shorts.ListEditProjectsForSource(r.Context(), userID, r, source.ID)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"project": source, "clips": clips, "edit_projects": editProjects})
}

func (h *ShortsHandler) AddClipToEditProject(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var input struct {
		ClipID string `json:"clip_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректные данные фрагмента")
		return
	}
	if err := h.shorts.AddClipToEditProject(r.Context(), userID, r, chi.URLParam(r, "id"), input.ClipID); err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *ShortsHandler) CancelJob(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	job, err := h.shorts.CancelJob(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"job": job})
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

func (h *ShortsHandler) DownloadTranscriptResult(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	result, err := h.shorts.TranscriptResult(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		h.mapError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="shorts-transcript-result.json"`)
	_, _ = w.Write(result)
}

func (h *ShortsHandler) DownloadDraft(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	url, expiresIn, err := h.shorts.DraftDownloadURLForEdit(r.Context(), userID, r, r.URL.Query().Get("edit_project_id"), chi.URLParam(r, "id"))
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

func (h *ShortsHandler) ExportProject(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	job, err := h.shorts.ExportProject(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{"job": job})
}

func (h *ShortsHandler) DownloadFinal(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	url, expiresIn, err := h.shorts.FinalDownloadURL(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"url": url, "expires_in": expiresIn})
}

func (h *ShortsHandler) mapError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrShortsSourceRequired):
		writeErrorWithCode(w, http.StatusBadRequest, "shorts_source_required", "Загрузите исходное видео")
	case errors.Is(err, service.ErrShortsProjectNameRequired):
		writeErrorWithCode(w, http.StatusBadRequest, "shorts_project_name_required", "Введите название проекта")
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
		slog.Error("shorts request failed", "error", err)
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
	}
}
