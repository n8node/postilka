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

type SupportTicketHandler struct {
	svc *service.SupportTicketService
}

func NewSupportTicketHandler(svc *service.SupportTicketService) *SupportTicketHandler {
	return &SupportTicketHandler{svc: svc}
}

func (h *SupportTicketHandler) ListThemes(w http.ResponseWriter, r *http.Request) {
	themes, err := h.svc.ListThemes(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить темы")
		return
	}
	if themes == nil {
		themes = []model.SupportTicketTheme{}
	}
	writeJSON(w, http.StatusOK, themes)
}

func (h *SupportTicketHandler) ListTickets(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	tickets, err := h.svc.ListUserTickets(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить тикеты")
		return
	}
	if tickets == nil {
		tickets = []model.SupportTicket{}
	}
	writeJSON(w, http.StatusOK, tickets)
}

func (h *SupportTicketHandler) CountTickets(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	count, err := h.svc.CountAwaitingUser(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось посчитать тикеты")
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"awaiting_user_count": count})
}

func (h *SupportTicketHandler) CreateTicket(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req model.SupportTicketCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	ticket, err := h.svc.CreateTicket(r.Context(), userID, req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "Тема не найдена")
			return
		}
		if errors.Is(err, service.ErrInvalidSupportInput) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось создать тикет")
		return
	}
	writeJSON(w, http.StatusOK, ticket)
}

func (h *SupportTicketHandler) GetTicket(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	ticketID := chi.URLParam(r, "id")
	ticket, err := h.svc.GetUserTicket(r.Context(), ticketID, userID)
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

func (h *SupportTicketHandler) AddMessage(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	ticketID := chi.URLParam(r, "id")
	var req model.SupportTicketMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	ticket, err := h.svc.AddUserMessage(r.Context(), ticketID, userID, req.Body)
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
		writeError(w, http.StatusInternalServerError, "Не удалось отправить сообщение")
		return
	}
	writeJSON(w, http.StatusOK, ticket)
}
