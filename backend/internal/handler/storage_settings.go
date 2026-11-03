package handler

import (
	"encoding/json"
	"errors"
	"github.com/go-chi/chi/v5"
	"net/http"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type StorageSettingsHandler struct {
	storage *service.StorageSettingsService
}

func (h *StorageSettingsHandler) ListProviders(w http.ResponseWriter, r *http.Request) {
	v, err := h.storage.ListProviders(r.Context())
	if err != nil {
		writeError(w, 500, "Не удалось загрузить провайдеров S3")
		return
	}
	writeJSON(w, 200, v)
}
func (h *StorageSettingsHandler) SaveProvider(w http.ResponseWriter, r *http.Request) {
	var req model.StorageProviderUpdateRequest
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		writeError(w, 400, "Некорректное тело запроса")
		return
	}
	v, err := h.storage.SaveProvider(r.Context(), chi.URLParam(r, "id"), req)
	if err != nil {
		writeError(w, 400, "Проверьте настройки S3")
		return
	}
	writeJSON(w, 200, v)
}
func (h *StorageSettingsHandler) DeleteProvider(w http.ResponseWriter, r *http.Request) {
	if err := h.storage.DeleteProvider(r.Context(), chi.URLParam(r, "id")); err != nil {
		writeError(w, 500, "Не удалось удалить провайдера")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
func (h *StorageSettingsHandler) TestProvider(w http.ResponseWriter, r *http.Request) {
	v, err := h.storage.TestProvider(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, 500, "Не удалось проверить подключение")
		return
	}
	writeJSON(w, 200, v)
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
