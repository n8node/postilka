package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type SocialProviderSettingsHandler struct {
	settings *service.SocialProviderSettingsService
}

func NewSocialProviderSettingsHandler(settings *service.SocialProviderSettingsService) *SocialProviderSettingsHandler {
	return &SocialProviderSettingsHandler{settings: settings}
}

func (h *SocialProviderSettingsHandler) ListAdmin(w http.ResponseWriter, r *http.Request) {
	view, err := h.settings.ListAdmin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки провайдеров")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *SocialProviderSettingsHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	provider, err := parseSocialProvider(chi.URLParam(r, "provider"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	view, err := h.settings.GetAdmin(r.Context(), provider)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки провайдера")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *SocialProviderSettingsHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	provider, err := parseSocialProvider(chi.URLParam(r, "provider"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	var cfg model.SocialProviderSettings
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	view, err := h.settings.UpdateAdmin(r.Context(), provider, cfg)
	if err != nil {
		if errors.Is(err, service.ErrInvalidSocialProviderSettings) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки провайдера")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func parseSocialProvider(raw string) (model.SocialProvider, error) {
	switch model.SocialProvider(raw) {
	case model.SocialProviderVK, model.SocialProviderOK, model.SocialProviderMAX,
		model.SocialProviderRutube, model.SocialProviderDzen:
		return model.SocialProvider(raw), nil
	default:
		return "", errors.New("неизвестный провайдер")
	}
}
