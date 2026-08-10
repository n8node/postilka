package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

type GenerationHandler struct {
	generation *service.GenerationService
}

func NewGenerationHandler(generation *service.GenerationService) *GenerationHandler {
	return &GenerationHandler{generation: generation}
}

type generateImageRequest struct {
	Mode             string   `json:"mode"`
	Prompt           string   `json:"prompt"`
	AspectRatio      string   `json:"aspect_ratio"`
	SourceUploadID   string   `json:"source_upload_id"`
	CombineUploadIDs []string `json:"combine_upload_ids"`
}

func (h *GenerationHandler) Generate(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}

	var req generateImageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	result, err := h.generation.StartGenerate(r.Context(), userID, r, service.GenerateImageInput{
		Mode:             req.Mode,
		Prompt:           req.Prompt,
		AspectRatio:      req.AspectRatio,
		SourceUploadID:   req.SourceUploadID,
		CombineUploadIDs: req.CombineUploadIDs,
	})
	if err != nil {
		h.mapError(w, err)
		return
	}

	writeJSON(w, http.StatusAccepted, map[string]any{"job": result.Job})
}

func (h *GenerationHandler) GetJob(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}

	result, err := h.generation.GetJob(r.Context(), userID, chi.URLParam(r, "id"))
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

func (h *GenerationHandler) Pricing(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}

	pricing, err := h.generation.GetPricing(r.Context(), userID, r)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"pricing": pricing})
}

type deleteGenerationsRequest struct {
	IDs []string `json:"ids"`
}

func (h *GenerationHandler) DeleteHistory(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}

	var req deleteGenerationsRequest
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

func (h *GenerationHandler) History(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	items, err := h.generation.ListHistory(r.Context(), userID, r, limit)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *GenerationHandler) UsageHistory(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	items, err := h.generation.ListUsageHistory(r.Context(), userID, r, limit)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *GenerationHandler) UploadSource(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}

	if err := r.ParseMultipartForm(16 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректная загрузка файла")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Файл не найден")
		return
	}

	upload, err := h.generation.UploadSource(r.Context(), userID, r, file, header)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"upload": upload})
}

type improvePromptRequest struct {
	Prompt string `json:"prompt"`
	Mode   string `json:"mode"`
}

type composePostTextRequest struct {
	Task string `json:"task"`
	Text string `json:"text"`
	Tone string `json:"tone"`
}

func (h *GenerationHandler) ComposePostText(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}

	var req composePostTextRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	text, err := h.generation.ComposePostText(r.Context(), userID, r, service.ComposePostTextInput{
		Task: req.Task,
		Text: req.Text,
		Tone: req.Tone,
	})
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"text": text})
}

func (h *GenerationHandler) ImprovePrompt(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}

	var req improvePromptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	improved, err := h.generation.ImprovePrompt(r.Context(), userID, service.ImprovePromptInput{
		Prompt: req.Prompt,
		Mode:   req.Mode,
	})
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"prompt": improved})
}

func (h *GenerationHandler) ResultMedia(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}

	body, contentType, err := h.generation.ResultMediaObject(r.Context(), chi.URLParam(r, "id"), userID)
	if err != nil {
		h.mapError(w, err)
		return
	}
	defer body.Close()

	if contentType == "" {
		contentType = "application/octet-stream"
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "private, max-age=300")
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, body)
}

func (h *GenerationHandler) ResultPreviewMedia(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}

	body, contentType, err := h.generation.ResultPreviewMediaObject(r.Context(), chi.URLParam(r, "id"), userID)
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

func (h *GenerationHandler) mapError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrInsufficientAICredits):
		writeErrorWithCode(w, http.StatusPaymentRequired, "insufficient_credits", "Недостаточно AI-кредитов или средств на кошельке")
	case errors.Is(err, service.ErrKieNotConfigured):
		writeErrorWithCode(w, http.StatusServiceUnavailable, "generation_not_configured", "Сервис генерации временно недоступен")
	case errors.Is(err, service.ErrGenerationUploadNotFound):
		writeErrorWithCode(w, http.StatusBadRequest, "upload_not_found", "Исходное фото не найдено")
	case errors.Is(err, service.ErrGenerationSourceRequired):
		writeErrorWithCode(w, http.StatusBadRequest, "source_required", "Загрузите исходное фото")
	case errors.Is(err, service.ErrGenerationCombineMin):
		writeErrorWithCode(w, http.StatusBadRequest, "combine_min_photos", "Для комбинации нужно минимум 2 фото")
	case errors.Is(err, service.ErrGenerationUploadInvalid):
		writeErrorWithCode(w, http.StatusBadRequest, "upload_invalid", "Некорректный файл изображения")
	case errors.Is(err, service.ErrNoPrimaryWS):
		writeErrorWithCode(w, http.StatusNotFound, "no_workspace", "Workspace не найден")
	case errors.Is(err, service.ErrYandexGptNotConfigured):
		writeErrorWithCode(w, http.StatusServiceUnavailable, "yandex_gpt_not_configured", "Yandex GPT не настроен")
	case errors.Is(err, repository.ErrNotFound):
		writeErrorWithCode(w, http.StatusNotFound, "not_found", "Не найдено")
	case errors.Is(err, service.ErrGenerationFailed):
		writeErrorWithCode(w, http.StatusBadGateway, "generation_failed", service.UserGenerationFailMessage(generationErrorMessage(err)))
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
			writeErrorWithCode(w, http.StatusBadGateway, "generation_failed", service.UserGenerationFailMessage(msg))
			return
		}
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
	}
}

func generationErrorMessage(err error) string {
	msg := err.Error()
	const prefix = "generation failed: "
	if strings.HasPrefix(msg, prefix) {
		return strings.TrimSpace(strings.TrimPrefix(msg, prefix))
	}
	return msg
}
