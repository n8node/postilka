package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

type TelegramSettingsHandler struct {
	settings *service.TelegramSettingsService
	telegram *service.TelegramService
}

func NewTelegramSettingsHandler(settings *service.TelegramSettingsService, telegram *service.TelegramService) *TelegramSettingsHandler {
	return &TelegramSettingsHandler{settings: settings, telegram: telegram}
}

func (h *TelegramSettingsHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	view, err := h.settings.GetAdminView(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки Telegram")
		return
	}
	view.Runtime = h.telegram.GetRuntimeStatus()
	writeJSON(w, http.StatusOK, view)
}

func (h *TelegramSettingsHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, h.telegram.GetRuntimeStatus())
}

func (h *TelegramSettingsHandler) Restart(w http.ResponseWriter, r *http.Request) {
	st := h.telegram.Restart(r.Context())
	writeJSON(w, http.StatusOK, st)
}

func (h *TelegramSettingsHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var req model.TelegramAdminUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	view, err := h.settings.Update(r.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidTelegramSettings) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки Telegram")
		return
	}
	view.Runtime = h.telegram.Restart(r.Context())
	writeJSON(w, http.StatusOK, view)
}

func (h *TelegramSettingsHandler) SendTest(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()

	ok, msg := h.telegram.SendTest(ctx)
	result := model.TelegramTestResult{OK: ok, Message: msg}
	st := h.telegram.GetRuntimeStatus()
	result.Runtime = &st
	writeJSON(w, http.StatusOK, result)
}

func (h *TelegramSettingsHandler) ListQueue(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	status := model.TelegramNotificationStatus(r.URL.Query().Get("status"))

	result, err := h.telegram.ListNotifications(r.Context(), status, limit, offset)
	if err != nil {
		if errors.Is(err, service.ErrTelegramQueueUnavailable) {
			writeError(w, http.StatusServiceUnavailable, "Очередь Telegram недоступна")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить очередь Telegram")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *TelegramSettingsHandler) RetryQueueItem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id required")
		return
	}
	if err := h.telegram.RetryNotificationNow(r.Context(), id); err != nil {
		switch {
		case errors.Is(err, service.ErrTelegramQueueUnavailable):
			writeError(w, http.StatusServiceUnavailable, "Очередь Telegram недоступна")
		case errors.Is(err, repository.ErrNotFound):
			writeError(w, http.StatusNotFound, "Уведомление не найдено")
		default:
			writeError(w, http.StatusInternalServerError, "Не удалось повторить отправку")
		}
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "queued"})
}
