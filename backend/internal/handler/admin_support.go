package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

type AdminSupportHandler struct {
	tickets  *service.SupportTicketService
	settings *service.SupportSettingsService
}

func NewAdminSupportHandler(tickets *service.SupportTicketService, settings *service.SupportSettingsService) *AdminSupportHandler {
	return &AdminSupportHandler{tickets: tickets, settings: settings}
}

func (h *AdminSupportHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	view, err := h.settings.GetAdminView(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *AdminSupportHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	var req model.SupportSettingsAdminUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	view, err := h.settings.Update(r.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidSupportSettings) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *AdminSupportHandler) TestTelegram(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	ok, msg := h.tickets.SendTestTelegram(ctx)
	writeJSON(w, http.StatusOK, model.SupportNotifyTestResult{OK: ok, Message: msg})
}

func (h *AdminSupportHandler) TestMax(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	ok, msg := h.tickets.SendTestMax(ctx)
	writeJSON(w, http.StatusOK, model.SupportNotifyTestResult{OK: ok, Message: msg})
}

func (h *AdminSupportHandler) TestEmail(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	ok, msg := h.tickets.SendTestAdminEmail(ctx)
	writeJSON(w, http.StatusOK, model.SupportNotifyTestResult{OK: ok, Message: msg})
}

func (h *AdminSupportHandler) ListThemes(w http.ResponseWriter, r *http.Request) {
	themes, err := h.tickets.ListAllThemes(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить темы")
		return
	}
	if themes == nil {
		themes = []model.SupportTicketTheme{}
	}
	writeJSON(w, http.StatusOK, themes)
}

func (h *AdminSupportHandler) CreateTheme(w http.ResponseWriter, r *http.Request) {
	var req model.SupportTicketThemeCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	theme, err := h.tickets.CreateTheme(r.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidSupportInput) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось создать тему")
		return
	}
	writeJSON(w, http.StatusOK, theme)
}

func (h *AdminSupportHandler) UpdateTheme(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req model.SupportTicketThemeUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	theme, err := h.tickets.UpdateTheme(r.Context(), id, req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "Тема не найдена")
			return
		}
		if errors.Is(err, service.ErrInvalidSupportInput) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось обновить тему")
		return
	}
	writeJSON(w, http.StatusOK, theme)
}

func (h *AdminSupportHandler) DeleteTheme(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.tickets.DeleteTheme(r.Context(), id); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "Тема не найдена")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось удалить тему")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *AdminSupportHandler) ListTickets(w http.ResponseWriter, r *http.Request) {
	tickets, err := h.tickets.ListAdminTickets(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить тикеты")
		return
	}
	if tickets == nil {
		tickets = []model.SupportTicket{}
	}
	writeJSON(w, http.StatusOK, tickets)
}

func (h *AdminSupportHandler) CountTickets(w http.ResponseWriter, r *http.Request) {
	count, err := h.tickets.CountAwaitingAdmin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось посчитать тикеты")
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"awaiting_admin_count": count})
}

func (h *AdminSupportHandler) GetTicket(w http.ResponseWriter, r *http.Request) {
	ticketID := chi.URLParam(r, "id")
	ticket, err := h.tickets.GetAdminTicket(r.Context(), ticketID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "Тикет не найден")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить тикет")
		return
	}
	writeJSON(w, http.StatusOK, ticket)
}

func (h *AdminSupportHandler) UpdateTicket(w http.ResponseWriter, r *http.Request) {
	ticketID := chi.URLParam(r, "id")
	var req model.SupportTicketStatusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	ticket, err := h.tickets.UpdateStatus(r.Context(), ticketID, req.Status)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "Тикет не найден")
			return
		}
		if errors.Is(err, service.ErrInvalidSupportInput) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось обновить статус")
		return
	}
	writeJSON(w, http.StatusOK, ticket)
}

func (h *AdminSupportHandler) ReplyTicket(w http.ResponseWriter, r *http.Request) {
	adminUserID, ok := middlewareUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	ticketID := chi.URLParam(r, "id")
	var req model.SupportTicketAdminReplyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	ticket, err := h.tickets.AdminReply(r.Context(), ticketID, adminUserID, req.Body)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "Тикет не найден")
			return
		}
		if errors.Is(err, service.ErrSupportTicketClosed) {
			writeError(w, http.StatusBadRequest, "Тикет закрыт")
			return
		}
		if errors.Is(err, service.ErrInvalidSupportInput) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось отправить ответ")
		return
	}
	writeJSON(w, http.StatusOK, ticket)
}

func middlewareUserID(r *http.Request) (string, bool) {
	return middleware.UserIDFromContext(r.Context())
}
