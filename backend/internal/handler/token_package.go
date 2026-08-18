package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type TokenPackageHandler struct {
	packages *service.TokenPackageService
	checkout *service.CheckoutService
}

func NewTokenPackageHandler(packages *service.TokenPackageService, checkout *service.CheckoutService) *TokenPackageHandler {
	return &TokenPackageHandler{packages: packages, checkout: checkout}
}

func (h *TokenPackageHandler) ListPublic(w http.ResponseWriter, r *http.Request) {
	items, err := h.packages.ListPublic(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить пакеты")
		return
	}
	if items == nil {
		items = []model.TokenPackage{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"packages": items})
}

func (h *TokenPackageHandler) PackageCheckout(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	packageID := chi.URLParam(r, "id")
	result, err := h.checkout.CreatePackageCheckout(r.Context(), userID, packageID)
	if err != nil {
		writeTokenPackageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *TokenPackageHandler) ListAdmin(w http.ResponseWriter, r *http.Request) {
	items, err := h.packages.ListAdmin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить пакеты")
		return
	}
	if items == nil {
		items = []model.TokenPackage{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"packages": items})
}

func (h *TokenPackageHandler) CreateAdmin(w http.ResponseWriter, r *http.Request) {
	var req model.TokenPackageUpsert
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	pkg, err := h.packages.Create(r.Context(), req)
	if err != nil {
		writeTokenPackageError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"package": pkg})
}

func (h *TokenPackageHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var req model.TokenPackageUpsert
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	pkg, err := h.packages.Update(r.Context(), chi.URLParam(r, "id"), req)
	if err != nil {
		writeTokenPackageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"package": pkg})
}

func (h *TokenPackageHandler) DeleteAdmin(w http.ResponseWriter, r *http.Request) {
	if err := h.packages.Delete(r.Context(), chi.URLParam(r, "id")); err != nil {
		writeTokenPackageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func writeTokenPackageError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrTokenPackageNotFound):
		writeError(w, http.StatusNotFound, "Пакет не найден")
	case errors.Is(err, service.ErrCheckoutUnavailable):
		writeError(w, http.StatusServiceUnavailable, "Оплата временно недоступна")
	case errors.Is(err, service.ErrInvalidInput):
		writeError(w, http.StatusBadRequest, "Проверьте параметры пакета")
	case errors.Is(err, service.ErrUserBlocked):
		writeError(w, http.StatusForbidden, "Аккаунт заблокирован")
	default:
		writeError(w, http.StatusInternalServerError, "Не удалось выполнить операцию")
	}
}
