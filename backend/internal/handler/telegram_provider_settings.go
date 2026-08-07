package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type TelegramProviderSettingsHandler struct {
	settings *service.TelegramProviderSettingsService
}

func NewTelegramProviderSettingsHandler(settings *service.TelegramProviderSettingsService) *TelegramProviderSettingsHandler {
	return &TelegramProviderSettingsHandler{settings: settings}
}

func (h *TelegramProviderSettingsHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	view, err := h.settings.GetAdminView(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки Telegram-провайдера")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *TelegramProviderSettingsHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var cfg model.TelegramProviderSettings
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	view, err := h.settings.Update(r.Context(), cfg)
	if err != nil {
		if errors.Is(err, service.ErrInvalidTelegramProviderSettings) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки Telegram-провайдера")
		return
	}
	writeJSON(w, http.StatusOK, view)
}
