package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type GenerationNavHandler struct {
	svc *service.GenerationNavService
}

func NewGenerationNavHandler(svc *service.GenerationNavService) *GenerationNavHandler {
	return &GenerationNavHandler{svc: svc}
}

func (h *GenerationNavHandler) GetCabinet(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.UserIDFromContext(r.Context()); !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	view, err := h.svc.PublicView(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить меню генерации")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *GenerationNavHandler) ServeIcon(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.UserIDFromContext(r.Context()); !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	body, contentType, err := h.svc.FetchIcon(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		if errors.Is(err, service.ErrGenerationNavNotFound) {
			writeError(w, http.StatusNotFound, "Иконка не найдена")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить иконку")
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "private, no-store")
	_, _ = w.Write(body)
}

func (h *GenerationNavHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	view, err := h.svc.AdminView(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить меню генерации")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *GenerationNavHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	var req model.GenerationNavSettingsWrite
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	settings, err := h.svc.UpdateSettings(r.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrGenerationNavInvalid) {
			writeError(w, http.StatusBadRequest, "Проверьте заголовок, ссылки и число плашек")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки")
		return
	}
	writeJSON(w, http.StatusOK, settings)
}

func (h *GenerationNavHandler) CreateItem(w http.ResponseWriter, r *http.Request) {
	var req model.GenerationNavItemWrite
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	item, err := h.svc.Create(r.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrGenerationNavInvalid) {
			writeError(w, http.StatusBadRequest, "Проверьте название, ссылку и иконку")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось создать плашку")
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (h *GenerationNavHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	var req model.GenerationNavItemWrite
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	item, err := h.svc.Update(r.Context(), chi.URLParam(r, "id"), req)
	if err != nil {
		if errors.Is(err, service.ErrGenerationNavNotFound) {
			writeError(w, http.StatusNotFound, "Плашка не найдена")
			return
		}
		if errors.Is(err, service.ErrGenerationNavInvalid) {
			writeError(w, http.StatusBadRequest, "Проверьте название, ссылку и иконку")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить плашку")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *GenerationNavHandler) DeleteItem(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.Delete(r.Context(), chi.URLParam(r, "id")); err != nil {
		if errors.Is(err, service.ErrGenerationNavNotFound) {
			writeError(w, http.StatusNotFound, "Плашка не найдена")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось удалить плашку")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *GenerationNavHandler) Reorder(w http.ResponseWriter, r *http.Request) {
	var req model.GenerationNavReorderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	if err := h.svc.Reorder(r.Context(), req.IDs); err != nil {
		if errors.Is(err, service.ErrGenerationNavInvalid) {
			writeError(w, http.StatusBadRequest, "Некорректный порядок плашек")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить порядок")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *GenerationNavHandler) UploadIcon(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(6 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "Не удалось прочитать файл")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Нужен файл PNG")
		return
	}
	item, err := h.svc.UploadIcon(r.Context(), chi.URLParam(r, "id"), file, header)
	if err != nil {
		if errors.Is(err, service.ErrGenerationNavNotFound) {
			writeError(w, http.StatusNotFound, "Плашка не найдена")
			return
		}
		if errors.Is(err, service.ErrGenerationNavInvalid) {
			writeError(w, http.StatusBadRequest, "Нужен квадратный PNG до 5 МБ")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить иконку")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *GenerationNavHandler) DeleteIcon(w http.ResponseWriter, r *http.Request) {
	item, err := h.svc.DeleteIcon(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		if errors.Is(err, service.ErrGenerationNavNotFound) {
			writeError(w, http.StatusNotFound, "Плашка не найдена")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось удалить иконку")
		return
	}
	writeJSON(w, http.StatusOK, item)
}
