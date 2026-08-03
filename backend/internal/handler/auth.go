package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type AuthHandler struct {
	auth *service.AuthService
	mw   *middleware.Auth
	cfg  *config.Config
}

func NewAuthHandler(auth *service.AuthService, mw *middleware.Auth, cfg *config.Config) *AuthHandler {
	return &AuthHandler{auth: auth, mw: mw, cfg: cfg}
}

type credentialsRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type meResponse struct {
	User      *model.User      `json:"user"`
	Workspace *model.Workspace `json:"workspace"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req credentialsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	result, err := h.auth.Register(r.Context(), req.Email, req.Password, req.Name)
	if err != nil {
		h.writeAuthError(w, err)
		return
	}

	h.mw.SetTokenCookie(w, result.Token, h.cfg.IsProduction())
	writeJSON(w, http.StatusCreated, meResponse{User: result.User, Workspace: result.Workspace})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req credentialsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	result, err := h.auth.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		h.writeAuthError(w, err)
		return
	}

	h.mw.SetTokenCookie(w, result.Token, h.cfg.IsProduction())
	writeJSON(w, http.StatusOK, meResponse{User: result.User, Workspace: result.Workspace})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, _ *http.Request) {
	h.mw.ClearTokenCookie(w)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	user, ws, err := h.auth.Me(r.Context(), userID)
	if err != nil {
		h.writeAuthError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, meResponse{User: user, Workspace: ws})
}

func (h *AuthHandler) writeAuthError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrEmailTaken):
		writeError(w, http.StatusConflict, "Email уже зарегистрирован")
	case errors.Is(err, service.ErrInvalidCredentials):
		writeError(w, http.StatusUnauthorized, "Неверный email или пароль")
	case errors.Is(err, service.ErrUserBlocked):
		writeError(w, http.StatusForbidden, "Аккаунт заблокирован")
	case errors.Is(err, service.ErrInvalidInput):
		writeError(w, http.StatusBadRequest, "Проверьте email и пароль (мин. 8 символов, заглавные, цифры, спецсимвол)")
	default:
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
	}
}
