package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type AntiFraudTelegramSettingsHandler struct {
	settings *service.AntiFraudTelegramSettingsService
}

func NewAntiFraudTelegramSettingsHandler(settings *service.AntiFraudTelegramSettingsService) *AntiFraudTelegramSettingsHandler {
	return &AntiFraudTelegramSettingsHandler{settings: settings}
}

func (h *AntiFraudTelegramSettingsHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	view, err := h.settings.GetAdminView(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки антифрод-бота")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *AntiFraudTelegramSettingsHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var req model.AntiFraudTelegramUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	view, err := h.settings.Update(r.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidAntiFraudTelegramSettings) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки антифрод-бота")
		return
	}
	writeJSON(w, http.StatusOK, view)
}
