package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type StorageSettingsHandler struct {
	storage *service.StorageSettingsService
}

func NewStorageSettingsHandler(storage *service.StorageSettingsService) *StorageSettingsHandler {
	return &StorageSettingsHandler{storage: storage}
}

func (h *StorageSettingsHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	view, err := h.storage.GetAdminView(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки S3")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *StorageSettingsHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var req model.StorageAdminUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	view, err := h.storage.Update(r.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidStorageSettings) {
			writeError(w, http.StatusBadRequest, "Проверьте настройки S3")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки S3")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *StorageSettingsHandler) TestConnection(w http.ResponseWriter, r *http.Request) {
	result, err := h.storage.TestConnection(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось проверить подключение")
		return
	}
	writeJSON(w, http.StatusOK, result)
}
