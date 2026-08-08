package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type UploadFileSettingsHandler struct {
	upload *service.UploadFileSettingsService
}

func NewUploadFileSettingsHandler(upload *service.UploadFileSettingsService) *UploadFileSettingsHandler {
	return &UploadFileSettingsHandler{upload: upload}
}

func (h *UploadFileSettingsHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	view, err := h.upload.GetAdminView(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки загрузки файлов")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *UploadFileSettingsHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var req model.UploadFileSettings
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	view, err := h.upload.Update(r.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidUploadSettings) {
			writeError(w, http.StatusBadRequest, "Проверьте форматы и лимиты размера файлов")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки загрузки файлов")
		return
	}
	writeJSON(w, http.StatusOK, view)
}
