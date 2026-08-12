package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type TelegramBusinessHandler struct {
	business *service.TelegramBusinessService
}

func NewTelegramBusinessHandler(business *service.TelegramBusinessService) *TelegramBusinessHandler {
	return &TelegramBusinessHandler{business: business}
}

func (h *TelegramBusinessHandler) Connect(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req model.TelegramBusinessConnectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	result, err := h.business.Connect(r.Context(), userID, r, req.BotToken)
	if err != nil {
		writeTelegramBusinessError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *TelegramBusinessHandler) Sync(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req model.TelegramBusinessSyncRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	result, err := h.business.Sync(r.Context(), userID, r, req.RegistrationID)
	if err != nil {
		writeTelegramBusinessError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *TelegramBusinessHandler) Webhook(w http.ResponseWriter, r *http.Request) {
	registrationID := chi.URLParam(r, "registrationID")
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Не удалось прочитать webhook")
		return
	}
	secret := r.Header.Get("X-Telegram-Bot-Api-Secret-Token")
	if err := h.business.HandleWebhook(r.Context(), registrationID, secret, body); err != nil {
		if err.Error() == "invalid webhook secret" {
			writeError(w, http.StatusUnauthorized, "Неверный секрет webhook")
			return
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func writeTelegramBusinessError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrTelegramProviderDisabled):
		writeError(w, http.StatusForbidden, "Провайдер Telegram отключён администратором")
	case errors.Is(err, service.ErrTelegramBusinessDisabled):
		writeError(w, http.StatusForbidden, "Telegram Business Stories отключены администратором")
	case errors.Is(err, service.ErrInvalidBotToken):
		writeError(w, http.StatusBadRequest, err.Error())
	default:
		writeChannelError(w, err)
	}
}
