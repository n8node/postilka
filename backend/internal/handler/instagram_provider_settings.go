package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type InstagramProviderSettingsHandler struct {
	settings *service.InstagramProviderSettingsService
}

func NewInstagramProviderSettingsHandler(settings *service.InstagramProviderSettingsService) *InstagramProviderSettingsHandler {
	return &InstagramProviderSettingsHandler{settings: settings}
}

func (h *InstagramProviderSettingsHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	view, err := h.settings.GetAdminView(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки proxy Instagram")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *InstagramProviderSettingsHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var cfg model.InstagramProviderSettings
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	view, err := h.settings.Update(r.Context(), cfg)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInstagramProviderSettings) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки proxy Instagram")
		return
	}
	writeJSON(w, http.StatusOK, view)
}
