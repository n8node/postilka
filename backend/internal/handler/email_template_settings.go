package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type EmailTemplateSettingsHandler struct {
	templates *service.EmailTemplateSettingsService
	email     *service.EmailService
}

func NewEmailTemplateSettingsHandler(templates *service.EmailTemplateSettingsService, email *service.EmailService) *EmailTemplateSettingsHandler {
	return &EmailTemplateSettingsHandler{templates: templates, email: email}
}

func (h *EmailTemplateSettingsHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	view, err := h.templates.GetAdminView(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить шаблоны писем")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *EmailTemplateSettingsHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var req model.EmailTemplateAdminUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	view, err := h.templates.Update(r.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidEmailTemplateSettings) {
			writeError(w, http.StatusBadRequest, "Проверьте настройки шаблона письма")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить шаблоны писем")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *EmailTemplateSettingsHandler) Preview(w http.ResponseWriter, r *http.Request) {
	html, err := h.email.Render(r.Context(), service.DefaultTestEmailBody())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось сформировать превью")
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=UTF-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(html))
}

func (h *EmailTemplateSettingsHandler) SendTest(w http.ResponseWriter, r *http.Request) {
	var req model.EmailTemplateTestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	if err := h.email.SendTest(r.Context(), req.To); err != nil {
		writeJSON(w, http.StatusOK, model.EmailTemplateTestResult{
			OK:      false,
			Message: service.MapEmailSendError(err),
		})
		return
	}
	writeJSON(w, http.StatusOK, model.EmailTemplateTestResult{
		OK:      true,
		Message: "Тестовое письмо отправлено",
	})
}
