package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type YouTubeProviderSettingsHandler struct {
	settings *service.YouTubeProviderSettingsService
}

func NewYouTubeProviderSettingsHandler(settings *service.YouTubeProviderSettingsService) *YouTubeProviderSettingsHandler {
	return &YouTubeProviderSettingsHandler{settings: settings}
}

func (h *YouTubeProviderSettingsHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	view, err := h.settings.GetAdminView(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки YouTube")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *YouTubeProviderSettingsHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var cfg model.YouTubeProviderSettings
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	view, err := h.settings.Update(r.Context(), cfg)
	if err != nil {
		if errors.Is(err, service.ErrInvalidYouTubeProviderSettings) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки YouTube")
		return
	}
	writeJSON(w, http.StatusOK, view)
}
