package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
	"github.com/postilka/postilka/internal/timezone"
)

type UserHandler struct {
	auth *service.AuthService
}

func NewUserHandler(auth *service.AuthService) *UserHandler {
	return &UserHandler{auth: auth}
}

type changeEmailRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *UserHandler) ChangeEmail(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	var req changeEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	user, err := h.auth.ChangeEmail(r.Context(), userID, req.Email, req.Password)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrEmailTaken):
			writeError(w, http.StatusConflict, "Email уже зарегистрирован")
		case errors.Is(err, service.ErrInvalidCredentials):
			writeError(w, http.StatusUnauthorized, "Неверный пароль")
		case errors.Is(err, service.ErrInvalidInput):
			writeError(w, http.StatusBadRequest, "Укажите корректный email")
		case errors.Is(err, service.ErrUserBlocked):
			writeError(w, http.StatusForbidden, "Аккаунт заблокирован")
		default:
			writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		}
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"user":    user,
		"message": "Email обновлён. Подтвердите новый адрес по ссылке из письма.",
	})
}

type changeTimezoneRequest struct {
	Timezone string `json:"timezone"`
}

func (h *UserHandler) ChangeTimezone(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	var req changeTimezoneRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	user, err := h.auth.UpdateTimezone(r.Context(), userID, req.Timezone)
	if errors.Is(err, service.ErrInvalidInput) {
		writeError(w, http.StatusBadRequest, "Выберите таймзону из списка")
		return
	}
	if errors.Is(err, service.ErrUserBlocked) {
		writeError(w, http.StatusForbidden, "Аккаунт заблокирован")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"user":    user,
		"message": "Таймзона сохранена",
	})
}

func (h *UserHandler) ListTimezones(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"timezones": timezone.RussiaZones,
	})
}

type WorkspaceInviteHandler struct {
	invites    *service.WorkspaceInviteService
	workspaces *service.WorkspaceService
}

func NewWorkspaceInviteHandler(invites *service.WorkspaceInviteService, workspaces *service.WorkspaceService) *WorkspaceInviteHandler {
	return &WorkspaceInviteHandler{invites: invites, workspaces: workspaces}
}

type createWorkspaceInviteRequest struct {
	Email string             `json:"email"`
	Role  model.WorkspaceRole `json:"role"`
}

func (h *WorkspaceInviteHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	workspaceID := r.URL.Query().Get("workspace_id")
	if workspaceID == "" {
		active, _, err := h.workspaces.ResolveActive(r.Context(), userID, r)
		if err != nil || active == nil {
			writeError(w, http.StatusBadRequest, "Workspace не найден")
			return
		}
		workspaceID = active.ID
	}

	var req createWorkspaceInviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	inv, err := h.invites.Create(r.Context(), userID, workspaceID, req.Email, req.Role)
	if err != nil {
		h.writeInviteError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"invite": inv})
}

func (h *WorkspaceInviteHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	workspaceID := r.URL.Query().Get("workspace_id")
	if workspaceID == "" {
		active, _, err := h.workspaces.ResolveActive(r.Context(), userID, r)
		if err != nil || active == nil {
			writeError(w, http.StatusBadRequest, "Workspace не найден")
			return
		}
		workspaceID = active.ID
	}

	invites, err := h.invites.List(r.Context(), userID, workspaceID)
	if err != nil {
		h.writeInviteError(w, err)
		return
	}
	if invites == nil {
		invites = []model.WorkspaceInvite{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"invites": invites})
}

type acceptWorkspaceInviteRequest struct {
	Token string `json:"token"`
}

func (h *WorkspaceInviteHandler) Accept(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	var req acceptWorkspaceInviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	ws, err := h.invites.Accept(r.Context(), userID, req.Token)
	if err != nil {
		h.writeInviteError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"workspace": ws,
		"message":   "Вы присоединились к workspace",
	})
}

func (h *WorkspaceInviteHandler) Preview(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	info, err := h.invites.Preview(r.Context(), token)
	if err != nil {
		h.writeInviteError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, info)
}

func (h *WorkspaceInviteHandler) writeInviteError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrForbidden), errors.Is(err, service.ErrNotWorkspaceMember):
		writeError(w, http.StatusForbidden, "Нет доступа")
	case errors.Is(err, service.ErrInvalidInput):
		writeError(w, http.StatusBadRequest, "Проверьте email и роль")
	case errors.Is(err, service.ErrWorkspaceInviteInvalid):
		writeError(w, http.StatusBadRequest, "Приглашение недействительно или истекло")
	case errors.Is(err, service.ErrWorkspaceInviteEmail):
		writeErrorWithCode(w, http.StatusForbidden, "invite_email_mismatch", "Войдите под email, указанным в приглашении")
	default:
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
	}
}
