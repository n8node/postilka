package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"path"
	"strings"
	"unicode/utf8"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

const maxSupportMultipart = 32 << 20

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
	req, files, err := parseSupportCreateRequest(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	ticket, err := h.svc.CreateTicket(r.Context(), userID, req, files)
	if err != nil {
		writeSupportTicketError(w, err, "Не удалось создать тикет")
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
		writeSupportTicketError(w, err, "Не удалось загрузить тикет")
		return
	}
	writeJSON(w, http.StatusOK, ticket)
}

func (h *SupportTicketHandler) UpdateTicket(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	ticketID := chi.URLParam(r, "id")
	var req model.SupportTicketStatusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	ticket, err := h.svc.UpdateUserStatus(r.Context(), ticketID, userID, req.Status)
	if err != nil {
		writeSupportTicketError(w, err, "Не удалось обновить статус")
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
	body, files, err := parseSupportMessageRequest(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	ticket, err := h.svc.AddUserMessage(r.Context(), ticketID, userID, body, files)
	if err != nil {
		writeSupportTicketError(w, err, "Не удалось отправить сообщение")
		return
	}
	writeJSON(w, http.StatusOK, ticket)
}

func (h *SupportTicketHandler) DownloadAttachment(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	ticketID := chi.URLParam(r, "id")
	attachmentID := chi.URLParam(r, "attachmentID")
	att, body, contentType, err := h.svc.GetUserAttachment(r.Context(), ticketID, attachmentID, userID)
	if err != nil {
		writeSupportTicketError(w, err, "Не удалось загрузить файл")
		return
	}
	writeSupportAttachment(w, att, body, contentType)
}

func writeSupportTicketError(w http.ResponseWriter, err error, fallback string) {
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Не найдено")
		return
	}
	if errors.Is(err, service.ErrSupportTicketClosed) {
		writeError(w, http.StatusBadRequest, "Тикет закрыт")
		return
	}
	if errors.Is(err, service.ErrInvalidSupportInput) {
		writeError(w, http.StatusBadRequest, userFacingSupportError(err))
		return
	}
	writeError(w, http.StatusInternalServerError, fallback)
}

func userFacingSupportError(err error) string {
	msg := err.Error()
	if i := strings.LastIndex(msg, ": "); i >= 0 && i+2 < len(msg) {
		return strings.TrimSpace(msg[i+2:])
	}
	return "Некорректные данные"
}

func parseSupportCreateRequest(r *http.Request) (model.SupportTicketCreateRequest, []service.SupportUpload, error) {
	if isMultipartRequest(r) {
		if err := r.ParseMultipartForm(maxSupportMultipart); err != nil {
			return model.SupportTicketCreateRequest{}, nil, err
		}
		req := model.SupportTicketCreateRequest{
			ThemeID:  r.FormValue("theme_id"),
			Priority: model.TicketPriority(r.FormValue("priority")),
			Body:     r.FormValue("body"),
		}
		if subj := strings.TrimSpace(r.FormValue("subject")); subj != "" {
			req.Subject = &subj
		}
		return req, readSupportUploads(r), nil
	}
	var req model.SupportTicketCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return model.SupportTicketCreateRequest{}, nil, err
	}
	return req, nil, nil
}

func parseSupportMessageRequest(r *http.Request) (string, []service.SupportUpload, error) {
	if isMultipartRequest(r) {
		if err := r.ParseMultipartForm(maxSupportMultipart); err != nil {
			return "", nil, err
		}
		return r.FormValue("body"), readSupportUploads(r), nil
	}
	var req model.SupportTicketMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return "", nil, err
	}
	return req.Body, nil, nil
}

func isMultipartRequest(r *http.Request) bool {
	return strings.Contains(strings.ToLower(r.Header.Get("Content-Type")), "multipart/form-data")
}

func readSupportUploads(r *http.Request) []service.SupportUpload {
	if r.MultipartForm == nil {
		return nil
	}
	headers := r.MultipartForm.File["files"]
	if len(headers) == 0 {
		headers = r.MultipartForm.File["file"]
	}
	out := make([]service.SupportUpload, 0, len(headers))
	for _, header := range headers {
		if header == nil {
			continue
		}
		f, err := header.Open()
		if err != nil {
			continue
		}
		data, err := io.ReadAll(io.LimitReader(f, maxSupportAttachmentBytes+1))
		_ = f.Close()
		if err != nil {
			continue
		}
		out = append(out, service.SupportUpload{
			Filename: header.Filename,
			MimeType: header.Header.Get("Content-Type"),
			Data:     data,
		})
	}
	return out
}

const maxSupportAttachmentBytes = 10 << 20

func writeSupportAttachment(w http.ResponseWriter, att *model.SupportTicketAttachment, body io.ReadCloser, contentType string) {
	defer body.Close()
	if contentType == "" {
		contentType = att.MimeType
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "private, max-age=300")
	disp := "attachment"
	if strings.HasPrefix(strings.ToLower(att.MimeType), "image/") {
		disp = "inline"
	}
	filename := path.Base(att.Filename)
	if filename == "" || filename == "." {
		filename = "file"
	}
	if utf8.RuneCountInString(filename) > 180 {
		filename = string([]rune(filename)[:180])
	}
	w.Header().Set("Content-Disposition", fmt.Sprintf(`%s; filename="%s"`, disp, strings.ReplaceAll(filename, `"`, "")))
	_, _ = io.Copy(w, body)
}
