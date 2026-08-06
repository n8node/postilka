package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type SMTPSettingsHandler struct {
	smtp  *service.SMTPSettingsService
	email *service.EmailService
}

func NewSMTPSettingsHandler(smtp *service.SMTPSettingsService, email *service.EmailService) *SMTPSettingsHandler {
	return &SMTPSettingsHandler{smtp: smtp, email: email}
}

func (h *SMTPSettingsHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	view, err := h.smtp.GetAdminView(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить email-настройки")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *SMTPSettingsHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var req model.SMTPAdminUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	view, err := h.smtp.Update(r.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidSMTPSettings) {
			writeError(w, http.StatusBadRequest, "Проверьте настройки SMTP")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить email-настройки")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *SMTPSettingsHandler) SendTest(w http.ResponseWriter, r *http.Request) {
	var req model.SMTPTestEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	if err := h.email.SendTest(r.Context(), req.To); err != nil {
		writeJSON(w, http.StatusOK, model.SMTPTestEmailResult{
			OK:      false,
			Message: service.MapEmailSendError(err),
		})
		return
	}
	writeJSON(w, http.StatusOK, model.SMTPTestEmailResult{
		OK:      true,
		Message: "Тестовое письмо отправлено",
	})
}
