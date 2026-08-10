package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"mime/multipart"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

type KieVideoConfigHandler struct {
	config   *service.KieVideoConfigService
	examples *service.KieVideoExampleService
}

func NewKieVideoConfigHandler(
	config *service.KieVideoConfigService,
	examples *service.KieVideoExampleService,
) *KieVideoConfigHandler {
	return &KieVideoConfigHandler{config: config, examples: examples}
}

func (h *KieVideoConfigHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	settings, err := h.config.Get(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки KIE Video")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"settings": settings})
}

func (h *KieVideoConfigHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var req model.KieVideoUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	settings, err := h.config.Update(r.Context(), req)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "invalid") {
			writeError(w, http.StatusBadRequest, msg)
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки KIE Video")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"settings": settings})
}

func (h *KieVideoConfigHandler) TestConnection(w http.ResponseWriter, r *http.Request) {
	var req model.KieVideoTestRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	result, err := h.config.TestConnection(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось проверить соединение")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *KieVideoConfigHandler) ListExamplesAdmin(w http.ResponseWriter, r *http.Request) {
	items, err := h.examples.ListAdmin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить примеры")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"examples": items})
}

func (h *KieVideoConfigHandler) CreateExampleAdmin(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректные данные формы")
		return
	}

	req := model.KieVideoExampleCreateRequest{
		Mode:        r.FormValue("mode"),
		Prompt:      r.FormValue("prompt"),
		AspectRatio: r.FormValue("aspect_ratio"),
	}
	if d := strings.TrimSpace(r.FormValue("duration")); d != "" {
		var duration int
		if _, err := fmt.Sscanf(d, "%d", &duration); err == nil {
			req.Duration = duration
		}
	}
	if raw := strings.TrimSpace(r.FormValue("image_urls")); raw != "" {
		_ = json.Unmarshal([]byte(raw), &req.ImageURLs)
	}

	var files []*multipart.FileHeader
	if r.MultipartForm != nil && r.MultipartForm.File != nil {
		files = r.MultipartForm.File["images"]
	}

	example, err := h.examples.Create(r.Context(), req, files)
	if err != nil {
		h.mapExampleError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{"example": example})
}

func (h *KieVideoConfigHandler) DeleteExampleAdmin(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.examples.Delete(r.Context(), id); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "Пример не найден")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось удалить пример")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *KieVideoConfigHandler) ListExamplesPublic(w http.ResponseWriter, r *http.Request) {
	items, err := h.examples.ListPublic(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить примеры")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"examples": items})
}

func (h *KieVideoConfigHandler) mapExampleError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrKieVideoExampleLimit):
		writeError(w, http.StatusConflict, "Достигнут лимит: максимум 4 примера для пользователей. Удалите один, чтобы добавить новый.")
	case errors.Is(err, service.ErrKieVideoExampleSourceReq):
		writeError(w, http.StatusBadRequest, "Для этого режима нужно загрузить исходное изображение")
	case errors.Is(err, service.ErrKieVideoNotConfigured):
		writeError(w, http.StatusServiceUnavailable, "KIE Video не настроен")
	default:
		msg := err.Error()
		if strings.Contains(msg, "prompt") || strings.Contains(msg, "invalid") {
			writeError(w, http.StatusBadRequest, msg)
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось создать пример")
	}
}
