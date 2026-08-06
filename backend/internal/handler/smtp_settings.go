package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type SMTPSettingsHandler struct {
	smtp *service.SMTPSettingsService
	mail *service.MailService
}

func NewSMTPSettingsHandler(smtp *service.SMTPSettingsService, mail *service.MailService) *SMTPSettingsHandler {
	return &SMTPSettingsHandler{smtp: smtp, mail: mail}
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

	subject := "Postilka — тест SMTP"
	body := `<p>Это тестовое письмо из админки Postilka. Если вы его получили — SMTP настроен верно.</p>`
	if err := h.mail.Send(r.Context(), req.To, subject, body); err != nil {
		msg := err.Error()
		if errors.Is(err, service.ErrEmailDisabled) {
			writeJSON(w, http.StatusOK, model.SMTPTestEmailResult{
				OK:      false,
				Message: "Включите отправку email в настройках",
			})
			return
		}
		if errors.Is(err, service.ErrSMTPNotConfigured) {
			writeJSON(w, http.StatusOK, model.SMTPTestEmailResult{
				OK:      false,
				Message: "Заполните host, порт и учётные данные SMTP",
			})
			return
		}
		writeJSON(w, http.StatusOK, model.SMTPTestEmailResult{OK: false, Message: msg})
		return
	}
	writeJSON(w, http.StatusOK, model.SMTPTestEmailResult{
		OK:      true,
		Message: "Тестовое письмо отправлено",
	})
}
