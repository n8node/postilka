package handler

import (
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/postilka/postilka/internal/service"
)

type PaymentWebhookHandler struct {
	payments *service.PaymentSettingsService
	checkout *service.CheckoutService
	logger   *slog.Logger
}

func NewPaymentWebhookHandler(
	payments *service.PaymentSettingsService,
	checkout *service.CheckoutService,
	logger *slog.Logger,
) *PaymentWebhookHandler {
	return &PaymentWebhookHandler{payments: payments, checkout: checkout, logger: logger}
}

func (h *PaymentWebhookHandler) RobokassaResult(w http.ResponseWriter, r *http.Request) {
	cfg, err := h.payments.GetEffective(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "settings unavailable")
		return
	}

	rk := cfg.Robokassa
	if !service.RobokassaConfigured(rk) {
		writeError(w, http.StatusServiceUnavailable, "robokassa not configured")
		return
	}

	q := r.URL.Query()
	if r.Method == http.MethodPost {
		if err := r.ParseForm(); err == nil && len(r.PostForm) > 0 {
			q = r.PostForm
		}
	}

	outSum := firstWebhookParam(q, "OutSum")
	invID := firstWebhookParam(q, "InvId")
	signature := strings.ToUpper(firstWebhookParam(q, "SignatureValue"))

	if outSum == "" || invID == "" || signature == "" {
		writeError(w, http.StatusBadRequest, "missing parameters")
		return
	}

	if !service.VerifyRobokassaResultSignature(outSum, invID, signature, rk.Password2) {
		h.logger.Warn("robokassa invalid signature", "inv_id", invID)
		writeError(w, http.StatusForbidden, "invalid signature")
		return
	}

	h.logger.Info("robokassa payment confirmed", "inv_id", invID, "amount", outSum, "test_mode", rk.TestMode)

	if err := h.checkout.HandleRobokassaResult(r.Context(), invID, outSum); err != nil {
		h.logger.Warn("robokassa fulfill failed", "error", err, "inv_id", invID)
		writeError(w, http.StatusInternalServerError, "fulfillment failed")
		return
	}

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = w.Write([]byte("OK" + invID))
}

func (h *PaymentWebhookHandler) RobokassaResult2(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	cfg, err := h.payments.GetEffective(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "settings unavailable")
		return
	}

	rk := cfg.Robokassa
	if !service.RobokassaConfigured(rk) {
		writeError(w, http.StatusServiceUnavailable, "robokassa not configured")
		return
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	token := strings.TrimSpace(string(body))
	if token == "" {
		if err := r.ParseForm(); err == nil {
			token = strings.TrimSpace(firstWebhookParam(r.PostForm, "token"))
		}
	}
	if token == "" {
		writeError(w, http.StatusBadRequest, "missing jws token")
		return
	}

	if err := service.VerifyRobokassaResult2Token(token); err != nil {
		h.logger.Warn("robokassa result2 jws verify failed", "error", err)
		writeError(w, http.StatusForbidden, "invalid jws signature")
		return
	}

	notification, err := service.ParseRobokassaResult2Token(token)
	if err != nil {
		h.logger.Warn("robokassa result2 parse failed", "error", err)
		writeError(w, http.StatusBadRequest, "invalid notification")
		return
	}

	if shop := strings.TrimSpace(rk.MerchantLogin); shop != "" && !strings.EqualFold(notification.Shop, shop) {
		h.logger.Warn("robokassa result2 shop mismatch", "expected", shop, "got", notification.Shop)
		writeError(w, http.StatusForbidden, "shop mismatch")
		return
	}

	if err := h.checkout.HandleRobokassaResult(r.Context(), notification.InvID, notification.IncSum); err != nil {
		h.logger.Warn("robokassa result2 fulfill failed", "error", err, "inv_id", notification.InvID)
		writeError(w, http.StatusInternalServerError, "fulfillment failed")
		return
	}

	w.WriteHeader(http.StatusOK)
}

func firstWebhookParam(q interface {
	Get(string) string
}, key string) string {
	return strings.TrimSpace(q.Get(key))
}
