package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
	oauthclient "github.com/postilka/postilka/internal/oauth"
)

type MAXPlatformBotHandler struct {
	settings *service.SocialProviderSettingsService
	cipher   *service.SecretCipher
}

func NewMAXPlatformBotHandler(
	settings *service.SocialProviderSettingsService,
	cipher *service.SecretCipher,
) *MAXPlatformBotHandler {
	return &MAXPlatformBotHandler{settings: settings, cipher: cipher}
}

func (h *MAXPlatformBotHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	view, err := h.settings.GetMAXPlatformBotAdmin(r.Context(), h.cipher)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки бота Postilka для MAX")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *MAXPlatformBotHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var req model.MAXPlatformBotAdminUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	view, err := h.settings.UpdateMAXPlatformBotAdmin(
		r.Context(),
		req,
		h.cipher,
		oauthclient.NewMAXBotClient(),
	)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidSocialProviderSettings),
			errors.Is(err, service.ErrInvalidBotToken),
			errors.Is(err, service.ErrCryptoUnavailable):
			writeError(w, http.StatusBadRequest, err.Error())
		default:
			writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки бота Postilka для MAX")
		}
		return
	}
	writeJSON(w, http.StatusOK, view)
}
