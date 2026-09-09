package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type AuthScreenHandler struct {
	svc *service.AuthScreenService
}

func NewAuthScreenHandler(svc *service.AuthScreenService) *AuthScreenHandler {
	return &AuthScreenHandler{svc: svc}
}

func (h *AuthScreenHandler) GetPublic(w http.ResponseWriter, r *http.Request) {
	view, err := h.svc.PublicView(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить экран авторизации")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *AuthScreenHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	view, err := h.svc.AdminView(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки экрана авторизации")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *AuthScreenHandler) UpdateSlide(w http.ResponseWriter, r *http.Request) {
	slot, ok := parseAuthScreenSlot(w, chi.URLParam(r, "slot"))
	if !ok {
		return
	}
	var input model.AuthScreenSlideUpdate
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	slide, err := h.svc.UpdateSlide(r.Context(), slot, input)
	if err != nil {
		h.writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, slide)
}

func (h *AuthScreenHandler) UploadLogo(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(6 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректная загрузка логотипа")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Файл не найден")
		return
	}
	view, err := h.svc.UploadLogo(r.Context(), file, header)
	if err != nil {
		h.writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *AuthScreenHandler) DeleteLogo(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.DeleteLogo(r.Context()); err != nil {
		h.writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *AuthScreenHandler) UploadSlideMedia(w http.ResponseWriter, r *http.Request) {
	slot, ok := parseAuthScreenSlot(w, chi.URLParam(r, "slot"))
	if !ok {
		return
	}
	if err := r.ParseMultipartForm(52 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректная загрузка медиа")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Файл не найден")
		return
	}
	view, err := h.svc.UploadSlideMedia(r.Context(), slot, file, header)
	if err != nil {
		h.writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *AuthScreenHandler) DeleteSlideMedia(w http.ResponseWriter, r *http.Request) {
	slot, ok := parseAuthScreenSlot(w, chi.URLParam(r, "slot"))
	if !ok {
		return
	}
	if err := h.svc.DeleteSlideMedia(r.Context(), slot); err != nil {
		h.writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *AuthScreenHandler) ServeLogo(w http.ResponseWriter, r *http.Request) {
	url, err := h.svc.LogoPresignedURL(r.Context())
	if err != nil {
		h.writeError(w, err)
		return
	}
	redirectPresignedObject(w, r, url)
}

func (h *AuthScreenHandler) ServeSlideMedia(w http.ResponseWriter, r *http.Request) {
	slot, ok := parseAuthScreenSlot(w, chi.URLParam(r, "slot"))
	if !ok {
		return
	}
	url, err := h.svc.SlideMediaPresignedURL(r.Context(), slot)
	if err != nil {
		h.writeError(w, err)
		return
	}
	redirectPresignedObject(w, r, url)
}

func parseAuthScreenSlot(w http.ResponseWriter, raw string) (int, bool) {
	slot, err := strconv.Atoi(raw)
	if err != nil || slot < 1 || slot > model.AuthScreenMaxSlides {
		writeError(w, http.StatusBadRequest, "Номер слайда должен быть от 1 до 4")
		return 0, false
	}
	return slot, true
}

func (h *AuthScreenHandler) writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrAuthScreenInvalid):
		writeError(w, http.StatusBadRequest, "Проверьте данные и формат файла")
	case errors.Is(err, service.ErrAuthScreenNotFound):
		writeError(w, http.StatusNotFound, "Медиафайл не найден")
	case errors.Is(err, service.ErrStorageNotConfigured):
		writeError(w, http.StatusServiceUnavailable, "Хранилище файлов не настроено")
	default:
		writeError(w, http.StatusInternalServerError, "Не удалось обработать экран авторизации")
	}
}
