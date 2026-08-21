package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/url"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

type ChannelConnectHandler struct {
	connect *service.ChannelConnectService
	cfg     interface{ PublicAppURLNormalized() string }
}

func NewChannelConnectHandler(connect *service.ChannelConnectService, cfg interface{ PublicAppURLNormalized() string }) *ChannelConnectHandler {
	return &ChannelConnectHandler{connect: connect, cfg: cfg}
}

func (h *ChannelConnectHandler) OAuthStart(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	provider, err := parseSocialProvider(chi.URLParam(r, "provider"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	var req model.ChannelOAuthStartRequest
	if r.Method == http.MethodPost && r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
			return
		}
	}
	result, err := h.connect.OAuthStart(r.Context(), userID, r, provider, req)
	if err != nil {
		writeChannelConnectError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *ChannelConnectHandler) OAuthCallback(w http.ResponseWriter, r *http.Request) {
	provider, err := parseSocialProvider(chi.URLParam(r, "provider"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	q := r.URL.Query()
	result, err := h.connect.OAuthCallback(r.Context(), provider, q.Get("state"), q.Get("code"), q.Get("error"))
	if err != nil {
		redirectFail(w, r, h.cfg.PublicAppURLNormalized(), string(provider), err.Error())
		return
	}
	redirectSuccess(w, r, h.cfg.PublicAppURLNormalized(), string(provider), result.SessionID)
}

func (h *ChannelConnectHandler) OAuthDiscover(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		writeError(w, http.StatusBadRequest, "session_id обязателен")
		return
	}
	result, err := h.connect.OAuthDiscover(r.Context(), userID, sessionID)
	if err != nil {
		writeChannelConnectError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *ChannelConnectHandler) OAuthConnect(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	provider, err := parseSocialProvider(chi.URLParam(r, "provider"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	var req model.ChannelConnectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	result, err := h.connect.OAuthConnect(r.Context(), userID, r, req)
	if err != nil {
		if errors.Is(err, service.ErrChannelAlreadyConnected) && result != nil {
			writeJSON(w, http.StatusConflict, result)
			return
		}
		writeChannelConnectError(w, err)
		return
	}
	_ = provider
	writeJSON(w, http.StatusOK, result)
}

func (h *ChannelConnectHandler) DiscoverMAX(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req model.MAXDiscoverRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	result, err := h.connect.DiscoverMAX(r.Context(), userID, r, req)
	if err != nil {
		writeChannelConnectError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *ChannelConnectHandler) ConnectMAX(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req model.MAXConnectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	channels := make([]model.ChannelConnectTargetInput, len(req.Channels))
	for i, ch := range req.Channels {
		channels[i] = model.ChannelConnectTargetInput{
			ExternalID: ch.ExternalID,
			Name:       ch.Name,
		}
	}
	result, err := h.connect.ConnectMAX(r.Context(), userID, r, model.MAXConnectRequest{
		BotToken: req.BotToken,
		Channels: channels,
		PostMode: req.PostMode,
	})
	if err != nil {
		if errors.Is(err, service.ErrChannelAlreadyConnected) && result != nil {
			writeJSON(w, http.StatusConflict, result)
			return
		}
		writeChannelConnectError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *ChannelConnectHandler) ConnectPhotochka(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req model.PhotochkaConnectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	result, err := h.connect.ConnectPhotochka(r.Context(), userID, r, req)
	if err != nil {
		if errors.Is(err, service.ErrChannelAlreadyConnected) && result != nil {
			writeJSON(w, http.StatusConflict, result)
			return
		}
		writeChannelConnectError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func writeChannelConnectError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrSocialProviderDisabled):
		writeError(w, http.StatusForbidden, "Подключение этой соцсети временно отключено администратором")
	case errors.Is(err, service.ErrSocialProviderNotReady):
		writeError(w, http.StatusServiceUnavailable, "Провайдер не настроен администратором")
	case errors.Is(err, service.ErrInvalidBotToken):
		writeError(w, http.StatusBadRequest, "Некорректный токен")
	case errors.Is(err, service.ErrInvalidPhotochkaAPIKey):
		writeError(w, http.StatusBadRequest, "Неверный API-ключ Photochka")
	case errors.Is(err, service.ErrWorkspaceNotFound):
		writeError(w, http.StatusBadRequest, "Сначала создайте или выберите workspace")
	case errors.Is(err, repository.ErrNotFound):
		writeError(w, http.StatusBadRequest, "Не найден тариф workspace — обратитесь в поддержку")
	case errors.Is(err, service.ErrQuotaExceeded):
		writeError(w, http.StatusPaymentRequired, "Достигнут лимит каналов по тарифу")
	case errors.Is(err, service.ErrForbidden):
		writeError(w, http.StatusForbidden, "Недостаточно прав")
	case errors.Is(err, service.ErrChannelOAuthStateInvalid):
		writeError(w, http.StatusBadRequest, "Недействительная OAuth-сессия")
	case errors.Is(err, service.ErrChannelOAuthSessionExpired):
		writeError(w, http.StatusBadRequest, "OAuth-сессия истекла, начните подключение заново")
	default:
		msg := err.Error()
		if msg == "" {
			msg = "Не удалось выполнить операцию"
		}
		writeError(w, http.StatusBadRequest, msg)
	}
}

func redirectSuccess(w http.ResponseWriter, r *http.Request, baseURL, provider, sessionID string) {
	target := baseURL + "/channels/connect/" + provider + "/callback?session_id=" + url.QueryEscape(sessionID)
	http.Redirect(w, r, target, http.StatusFound)
}

func redirectFail(w http.ResponseWriter, r *http.Request, baseURL, provider, message string) {
	target := baseURL + "/channels/connect/" + provider + "/callback?error=" + url.QueryEscape(message)
	http.Redirect(w, r, target, http.StatusFound)
}
