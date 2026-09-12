package handler

import (
	"encoding/json"
	"net/http"

	"github.com/postilka/postilka/internal/service"
)

type HelpSettingsHandler struct {
	settings *service.HelpSettingsService
}

func NewHelpSettingsHandler(settings *service.HelpSettingsService) *HelpSettingsHandler {
	return &HelpSettingsHandler{settings: settings}
}

func (h *HelpSettingsHandler) Get(w http.ResponseWriter, r *http.Request) {
	settings, err := h.settings.Get(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки справки")
		return
	}
	writeJSON(w, http.StatusOK, settings)
}

func (h *HelpSettingsHandler) Update(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Enabled bool `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	settings, err := h.settings.Update(r.Context(), body.Enabled)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки справки")
		return
	}
	writeJSON(w, http.StatusOK, settings)
}
