package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

type ChannelHandler struct {
	channels *service.ChannelService
}

func NewChannelHandler(channels *service.ChannelService) *ChannelHandler {
	return &ChannelHandler{channels: channels}
}

func channelUserID(r *http.Request) (string, bool) {
	return middleware.UserIDFromContext(r.Context())
}

func (h *ChannelHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := channelUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	items, err := h.channels.List(r.Context(), userID, r)
	if err != nil {
		writeChannelError(w, err)
		return
	}
	if items == nil {
		items = []model.ChannelListItem{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *ChannelHandler) ProviderInfo(w http.ResponseWriter, r *http.Request) {
	userID, ok := channelUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	_ = userID
	help, enabled, err := h.channels.ProviderHelp(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки провайдера")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"telegram_enabled": enabled,
		"connect_help_text": help,
	})
}

func (h *ChannelHandler) DiscoverTelegram(w http.ResponseWriter, r *http.Request) {
	userID, ok := channelUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req model.TelegramDiscoverRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	result, err := h.channels.DiscoverTelegram(r.Context(), userID, r, req.BotToken)
	if err != nil {
		writeChannelError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *ChannelHandler) ConnectTelegram(w http.ResponseWriter, r *http.Request) {
	userID, ok := channelUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req model.TelegramConnectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	result, err := h.channels.ConnectTelegram(r.Context(), userID, r, req)
	if err != nil {
		if errors.Is(err, service.ErrChannelAlreadyConnected) && result != nil {
			writeJSON(w, http.StatusConflict, result)
			return
		}
		writeChannelError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *ChannelHandler) Verify(w http.ResponseWriter, r *http.Request) {
	userID, ok := channelUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	id := chi.URLParam(r, "id")
	item, err := h.channels.Verify(r.Context(), userID, r, id)
	if err != nil {
		writeChannelError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *ChannelHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := channelUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	id := chi.URLParam(r, "id")
	if err := h.channels.Delete(r.Context(), userID, r, id); err != nil {
		writeChannelError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

type updateTelegramTokenRequest struct {
	BotToken string `json:"bot_token"`
}

func (h *ChannelHandler) UpdateTelegramToken(w http.ResponseWriter, r *http.Request) {
	userID, ok := channelUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	id := chi.URLParam(r, "id")
	var req updateTelegramTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	item, err := h.channels.UpdateTelegramToken(r.Context(), userID, r, id, req.BotToken)
	if err != nil {
		writeChannelError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func writeChannelError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrTelegramProviderDisabled):
		writeError(w, http.StatusForbidden, "Подключение Telegram временно отключено администратором")
	case errors.Is(err, service.ErrInvalidBotToken):
		writeError(w, http.StatusBadRequest, "Некорректный токен бота")
	case errors.Is(err, service.ErrQuotaExceeded):
		writeError(w, http.StatusPaymentRequired, "Достигнут лимит каналов по тарифу")
	case errors.Is(err, service.ErrForbidden):
		writeError(w, http.StatusForbidden, "Недостаточно прав")
	case errors.Is(err, service.ErrNoPrimaryWS):
		writeError(w, http.StatusNotFound, "Workspace не найден")
	case errors.Is(err, repository.ErrNotFound):
		writeError(w, http.StatusNotFound, "Канал не найден")
	case errors.Is(err, service.ErrCryptoUnavailable):
		writeError(w, http.StatusInternalServerError, "Шифрование недоступно")
	default:
		msg := err.Error()
		if msg == "" {
			msg = "Не удалось выполнить операцию с каналом"
		}
		writeError(w, http.StatusBadRequest, msg)
	}
}
