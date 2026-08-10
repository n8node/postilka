package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

type VideoGenerationHandler struct {
	generation *service.GenerationService
}

func NewVideoGenerationHandler(generation *service.GenerationService) *VideoGenerationHandler {
	return &VideoGenerationHandler{generation: generation}
}

type generateVideoRequest struct {
	Mode                    string   `json:"mode"`
	Prompt                  string   `json:"prompt"`
	AspectRatio             string   `json:"aspect_ratio"`
	Duration                int      `json:"duration"`
	SourceUploadID          string   `json:"source_upload_id"`
	LastFrameUploadID       string   `json:"last_frame_upload_id"`
	ReferenceUploadIDs      []string `json:"reference_upload_ids"`
	ReferenceVideoUploadIDs []string `json:"reference_video_upload_ids"`
	ReferenceAudioUploadIDs []string `json:"reference_audio_upload_ids"`
}

func (h *VideoGenerationHandler) Generate(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}

	var req generateVideoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	result, err := h.generation.StartGenerateVideo(r.Context(), userID, r, service.GenerateVideoInput{
		Mode:                    req.Mode,
		Prompt:                  req.Prompt,
		AspectRatio:             req.AspectRatio,
		Duration:                req.Duration,
		SourceUploadID:          req.SourceUploadID,
		LastFrameUploadID:       req.LastFrameUploadID,
		ReferenceUploadIDs:      req.ReferenceUploadIDs,
		ReferenceVideoUploadIDs: req.ReferenceVideoUploadIDs,
		ReferenceAudioUploadIDs: req.ReferenceAudioUploadIDs,
	})
	if err != nil {
		h.mapError(w, err)
		return
	}

	writeJSON(w, http.StatusAccepted, map[string]any{"job": result.Job})
}

func (h *VideoGenerationHandler) GetJob(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}

	result, err := h.generation.GetVideoJob(r.Context(), userID, chi.URLParam(r, "id"))
	if err != nil {
		h.mapError(w, err)
		return
	}

	payload := map[string]any{"job": result.Job}
	if result.Credits != nil {
		payload["credits"] = result.Credits
		if result.Credits.Unlimited {
			payload["credits_remaining"] = nil
		} else {
			payload["credits_remaining"] = result.Credits.TotalAvailable
		}
	}
	writeJSON(w, http.StatusOK, payload)
}

func (h *VideoGenerationHandler) Pricing(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}

	pricing, err := h.generation.GetVideoPricing(r.Context(), userID, r)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"pricing": pricing})
}

func (h *VideoGenerationHandler) History(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	items, err := h.generation.ListVideoHistory(r.Context(), userID, r, limit)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

type deleteVideoGenerationsRequest struct {
	IDs []string `json:"ids"`
}

func (h *VideoGenerationHandler) DeleteHistory(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}

	var req deleteVideoGenerationsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	result, err := h.generation.DeleteGenerations(r.Context(), userID, r, req.IDs)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *VideoGenerationHandler) UploadSource(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	if err := r.ParseMultipartForm(52 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректный multipart запрос")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Файл не передан")
		return
	}
	upload, err := h.generation.UploadVideoGenerationSource(r.Context(), userID, r, file, header)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"upload": upload})
}

type uploadVideoSourceFromFileRequest struct {
	FileID string `json:"file_id"`
}

func (h *VideoGenerationHandler) UploadSourceFromFile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}

	var req uploadVideoSourceFromFileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	upload, err := h.generation.UploadGenerationSourceFromWorkspaceFile(r.Context(), userID, r, req.FileID, true)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"upload": upload})
}

func (h *VideoGenerationHandler) mapError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrInsufficientAICredits):
		writeErrorWithCode(w, http.StatusPaymentRequired, "insufficient_credits", "Недостаточно AI-кредитов или средств на кошельке")
	case errors.Is(err, service.ErrVideoGenerationNotConfigured):
		writeErrorWithCode(w, http.StatusServiceUnavailable, "video_generation_not_configured", "Сервис генерации видео временно недоступен")
	case errors.Is(err, service.ErrGenerationUploadInvalid):
		writeErrorWithCode(w, http.StatusBadRequest, "upload_invalid", "Неподдерживаемый или слишком большой файл")
	case errors.Is(err, service.ErrGenerationUploadNotFound):
		writeErrorWithCode(w, http.StatusBadRequest, "upload_not_found", "Файл не найден на диске проекта")
	case errors.Is(err, service.ErrVideoGenerationSourceRequired):
		writeErrorWithCode(w, http.StatusBadRequest, "source_required", "Загрузите исходное фото")
	case errors.Is(err, service.ErrNoPrimaryWS):
		writeErrorWithCode(w, http.StatusNotFound, "no_workspace", "Workspace не найден")
	case errors.Is(err, repository.ErrNotFound):
		writeErrorWithCode(w, http.StatusNotFound, "not_found", "Не найдено")
	case errors.Is(err, service.ErrGenerationFailed):
		writeErrorWithCode(w, http.StatusBadGateway, "generation_failed", service.UserVideoGenerationFailMessage(generationErrorMessage(err)))
	default:
		msg := err.Error()
		if strings.Contains(msg, "prompt is required") {
			writeErrorWithCode(w, http.StatusBadRequest, "invalid_prompt", "Укажите описание для генерации")
			return
		}
		if strings.Contains(msg, "prompt too long") {
			writeErrorWithCode(w, http.StatusBadRequest, "invalid_prompt", "Описание слишком длинное")
			return
		}
		if strings.Contains(strings.ToLower(msg), "kie") || strings.Contains(strings.ToLower(msg), "generation") {
			writeErrorWithCode(w, http.StatusBadGateway, "generation_failed", service.UserVideoGenerationFailMessage(msg))
			return
		}
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
	}
}
