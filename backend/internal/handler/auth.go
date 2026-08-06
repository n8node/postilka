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
	auth       *service.AuthService
	workspaces *service.WorkspaceService
	mw         *middleware.Auth
	cfg        *config.Config
}

func NewAuthHandler(
	auth *service.AuthService,
	workspaces *service.WorkspaceService,
	mw *middleware.Auth,
	cfg *config.Config,
) *AuthHandler {
	return &AuthHandler{auth: auth, workspaces: workspaces, mw: mw, cfg: cfg}
}

type credentialsRequest struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	Name       string `json:"name"`
	InviteCode string `json:"invite_code"`
}

type meResponse struct {
	User            *model.User       `json:"user"`
	Workspace       *model.Workspace  `json:"workspace"`
	ActiveWorkspace *model.Workspace  `json:"active_workspace"`
	Workspaces      []model.Workspace `json:"workspaces"`
}

func (h *AuthHandler) writeMe(w http.ResponseWriter, status int, user *model.User, active *model.Workspace, list []model.Workspace) {
	if list == nil {
		list = []model.Workspace{}
	}
	writeJSON(w, status, meResponse{
		User:            user,
		Workspace:       active,
		ActiveWorkspace: active,
		Workspaces:      list,
	})
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req credentialsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	result, err := h.auth.Register(r.Context(), req.Email, req.Password, req.Name, req.InviteCode)
	if err != nil {
		h.writeAuthError(w, err)
		return
	}

	h.mw.SetTokenCookie(w, result.Token, h.cfg.IsProduction())
	if result.Workspace != nil {
		service.SetActiveWorkspaceCookie(w, result.Workspace.ID, h.cfg.IsProduction())
	}
	h.writeMe(w, http.StatusCreated, result.User, result.Workspace, result.Workspaces)
}

type verifyEmailRequest struct {
	Token string `json:"token"`
}

func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var req verifyEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	result, err := h.auth.VerifyEmail(r.Context(), req.Token)
	if err != nil {
		h.writeAuthError(w, err)
		return
	}

	h.mw.SetTokenCookie(w, result.Token, h.cfg.IsProduction())
	if result.Workspace != nil {
		service.SetActiveWorkspaceCookie(w, result.Workspace.ID, h.cfg.IsProduction())
	}
	h.writeMe(w, http.StatusOK, result.User, result.Workspace, result.Workspaces)
}

type forgotPasswordRequest struct {
	Email string `json:"email"`
}

func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req forgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	h.auth.ForgotPassword(r.Context(), req.Email)
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"message": "Если аккаунт с таким email существует, мы отправили письмо со ссылкой для восстановления пароля",
	})
}

type resetPasswordRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req resetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	result, err := h.auth.ResetPassword(r.Context(), req.Token, req.Password)
	if err != nil {
		h.writeAuthError(w, err)
		return
	}

	h.mw.SetTokenCookie(w, result.Token, h.cfg.IsProduction())
	if result.Workspace != nil {
		service.SetActiveWorkspaceCookie(w, result.Workspace.ID, h.cfg.IsProduction())
	}
	h.writeMe(w, http.StatusOK, result.User, result.Workspace, result.Workspaces)
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

	active, list, err := h.workspaces.ResolveActive(r.Context(), result.User.ID, r)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}
	if active == nil {
		active = result.Workspace
		list = result.Workspaces
	}
	if active != nil {
		service.SetActiveWorkspaceCookie(w, active.ID, h.cfg.IsProduction())
	}
	h.writeMe(w, http.StatusOK, result.User, active, list)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, _ *http.Request) {
	h.mw.ClearTokenCookie(w)
	service.ClearActiveWorkspaceCookie(w)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	user, active, list, err := h.auth.Me(r.Context(), userID, r)
	if err != nil {
		h.writeAuthError(w, err)
		return
	}

	h.writeMe(w, http.StatusOK, user, active, list)
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
	case errors.Is(err, service.ErrInviteRequired):
		writeError(w, http.StatusBadRequest, "Требуется инвайт-ключ для регистрации")
	case errors.Is(err, service.ErrInvalidInviteCode):
		writeError(w, http.StatusBadRequest, "Некорректный формат инвайт-ключа")
	case errors.Is(err, service.ErrInviteNotActive):
		writeError(w, http.StatusBadRequest, "Инвайт-ключ недействителен или уже использован")
	case errors.Is(err, service.ErrInviteAlreadyUsed):
		writeError(w, http.StatusConflict, "Инвайт-ключ уже использован")
	case errors.Is(err, service.ErrEmailVerificationInvalid):
		writeError(w, http.StatusBadRequest, "Ссылка недействительна или истекла")
	case errors.Is(err, service.ErrPasswordResetInvalid):
		writeError(w, http.StatusBadRequest, "Ссылка для восстановления пароля недействительна или истекла")
	default:
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
	}
}
