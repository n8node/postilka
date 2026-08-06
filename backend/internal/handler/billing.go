package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type BillingHandler struct {
	billing  *service.BillingService
	checkout *service.CheckoutService
	wsSvc    *service.WorkspaceService
}

func NewBillingHandler(
	billing *service.BillingService,
	checkout *service.CheckoutService,
	wsSvc *service.WorkspaceService,
) *BillingHandler {
	return &BillingHandler{billing: billing, checkout: checkout, wsSvc: wsSvc}
}

func billingUserID(r *http.Request) (string, bool) {
	return middleware.UserIDFromContext(r.Context())
}

func (h *BillingHandler) Overview(w http.ResponseWriter, r *http.Request) {
	userID, ok := billingUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	overview, err := h.billing.Overview(r.Context(), userID, r)
	if err != nil {
		if errors.Is(err, service.ErrNoPrimaryWS) {
			writeError(w, http.StatusNotFound, "Workspace не найден")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить биллинг")
		return
	}
	writeJSON(w, http.StatusOK, overview)
}

func (h *BillingHandler) ListPlans(w http.ResponseWriter, r *http.Request) {
	plans, err := h.billing.ListPublicPlans(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить тарифы")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"plans": plans})
}

func (h *BillingHandler) PublicListPlans(w http.ResponseWriter, r *http.Request) {
	h.ListPlans(w, r)
}

type subscribeCheckoutRequest struct {
	PlanID        string              `json:"plan_id"`
	BillingPeriod model.BillingPeriod `json:"billing_period"`
	WorkspaceID   string              `json:"workspace_id"`
}

func (h *BillingHandler) SubscribeCheckout(w http.ResponseWriter, r *http.Request) {
	userID, ok := billingUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req subscribeCheckoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	if req.BillingPeriod == "" {
		req.BillingPeriod = model.BillingPeriodMonthly
	}

	workspaceID := req.WorkspaceID
	if workspaceID == "" {
		ws, _, err := h.wsSvc.ResolveActive(r.Context(), userID, r)
		if err != nil || ws == nil {
			writeError(w, http.StatusBadRequest, "Укажите workspace")
			return
		}
		workspaceID = ws.ID
	}

	result, err := h.checkout.CreateSubscribe(r.Context(), userID, workspaceID, req.PlanID, req.BillingPeriod)
	if err != nil {
		writeBillingCheckoutError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

type walletTopupRequest struct {
	AmountCents int `json:"amount_cents"`
}

func (h *BillingHandler) WalletTopup(w http.ResponseWriter, r *http.Request) {
	userID, ok := billingUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req walletTopupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	result, err := h.checkout.CreateWalletTopup(r.Context(), userID, req.AmountCents)
	if err != nil {
		writeBillingCheckoutError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

type switchFreeRequest struct {
	WorkspaceID string `json:"workspace_id"`
}

func (h *BillingHandler) SwitchFree(w http.ResponseWriter, r *http.Request) {
	userID, ok := billingUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req switchFreeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	workspaceID := req.WorkspaceID
	if workspaceID == "" {
		ws, _, err := h.wsSvc.ResolveActive(r.Context(), userID, r)
		if err != nil || ws == nil {
			writeError(w, http.StatusBadRequest, "Укажите workspace")
			return
		}
		workspaceID = ws.ID
	}
	if err := h.billing.SwitchToFree(r.Context(), userID, workspaceID); err != nil {
		if errors.Is(err, service.ErrForbidden) || errors.Is(err, service.ErrNotWorkspaceMember) {
			writeError(w, http.StatusForbidden, "Недостаточно прав")
			return
		}
		writeError(w, http.StatusBadRequest, "Не удалось переключить тариф")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *BillingHandler) PaymentHistory(w http.ResponseWriter, r *http.Request) {
	userID, ok := billingUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	items, err := h.billing.PaymentHistory(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить историю")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *BillingHandler) WalletLedger(w http.ResponseWriter, r *http.Request) {
	userID, ok := billingUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	items, err := h.billing.WalletLedger(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить историю кошелька")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func writeBillingCheckoutError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrCheckoutUnavailable):
		writeError(w, http.StatusServiceUnavailable, "Оплата временно недоступна. Настройте Robokassa в админке.")
	case errors.Is(err, service.ErrPlanNotFound):
		writeError(w, http.StatusNotFound, "Тариф не найден")
	case errors.Is(err, service.ErrForbidden), errors.Is(err, service.ErrNotWorkspaceMember):
		writeError(w, http.StatusForbidden, "Недостаточно прав для смены тарифа workspace")
	case errors.Is(err, service.ErrUserBlocked):
		writeError(w, http.StatusForbidden, "Аккаунт заблокирован")
	case errors.Is(err, service.ErrInvalidInput):
		writeError(w, http.StatusBadRequest, "Проверьте сумму или параметры тарифа")
	default:
		writeError(w, http.StatusInternalServerError, "Не удалось создать оплату")
	}
}
