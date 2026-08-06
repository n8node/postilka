package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type PaymentSettingsHandler struct {
	payments *service.PaymentSettingsService
}

func NewPaymentSettingsHandler(payments *service.PaymentSettingsService) *PaymentSettingsHandler {
	return &PaymentSettingsHandler{payments: payments}
}

func (h *PaymentSettingsHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	view, err := h.payments.GetAdminView(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки платежей")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *PaymentSettingsHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var req model.PaymentAdminUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	view, err := h.payments.Update(r.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidPaymentSettings) {
			writeError(w, http.StatusBadRequest, "Проверьте настройки Robokassa")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки платежей")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *PaymentSettingsHandler) TestConnection(w http.ResponseWriter, r *http.Request) {
	result, err := h.payments.TestRobokassa(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось проверить подключение")
		return
	}
	writeJSON(w, http.StatusOK, result)
}
