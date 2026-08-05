package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type OAuthLoginHandler struct {
	oauth      *service.OAuthLoginService
	workspaces *service.WorkspaceService
	mw         *middleware.Auth
	cfg        *config.Config
}

func NewOAuthLoginHandler(
	oauth *service.OAuthLoginService,
	workspaces *service.WorkspaceService,
	mw *middleware.Auth,
	cfg *config.Config,
) *OAuthLoginHandler {
	return &OAuthLoginHandler{oauth: oauth, workspaces: workspaces, mw: mw, cfg: cfg}
}

func (h *OAuthLoginHandler) StartVKPublic(w http.ResponseWriter, r *http.Request) {
	h.startProvider(w, r, model.LoginProviderVK, "login")
}

func (h *OAuthLoginHandler) StartVKLink(w http.ResponseWriter, r *http.Request) {
	h.startProvider(w, r, model.LoginProviderVK, "link")
}

func (h *OAuthLoginHandler) StartMAXPublic(w http.ResponseWriter, r *http.Request) {
	h.startProvider(w, r, model.LoginProviderMAX, "login")
}

func (h *OAuthLoginHandler) StartMAXLink(w http.ResponseWriter, r *http.Request) {
	h.startProvider(w, r, model.LoginProviderMAX, "link")
}

func (h *OAuthLoginHandler) startProvider(w http.ResponseWriter, r *http.Request, provider model.LoginOAuthProvider, mode string) {
	redirectPath := r.URL.Query().Get("next")

	var userID string
	if mode == "link" {
		id, ok := middleware.UserIDFromContext(r.Context())
		if !ok {
			writeError(w, http.StatusUnauthorized, "Не авторизован")
			return
		}
		userID = id
	}

	var (
		result *service.OAuthStartResult
		err    error
	)
	switch provider {
	case model.LoginProviderVK:
		result, err = h.oauth.StartVK(r.Context(), mode, userID, redirectPath)
	case model.LoginProviderMAX:
		result, err = h.oauth.StartMAX(r.Context(), mode, userID, redirectPath)
	default:
		writeError(w, http.StatusBadRequest, "Неизвестный провайдер")
		return
	}
	if err != nil {
		h.writeOAuthError(w, err)
		return
	}

	if mode == "login" {
		if result.RedirectURL != "" {
			http.Redirect(w, r, result.RedirectURL, http.StatusFound)
			return
		}
		if result.WaitURL != "" {
			http.Redirect(w, r, result.WaitURL, http.StatusFound)
			return
		}
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *OAuthLoginHandler) VKCallback(w http.ResponseWriter, r *http.Request) {
	if errMsg := r.URL.Query().Get("error"); errMsg != "" {
		h.redirectOAuthError(w, r, errMsg)
		return
	}

	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	deviceID := r.URL.Query().Get("device_id")
	if code == "" || state == "" || deviceID == "" {
		h.redirectOAuthError(w, r, "invalid_callback")
		return
	}

	result, redirectPath, err := h.oauth.CompleteVK(r.Context(), code, deviceID, state)
	if err != nil {
		h.redirectOAuthError(w, r, "oauth_failed")
		return
	}

	h.finishOAuthLogin(w, r, result, redirectPath)
}

func (h *OAuthLoginHandler) MAXWebhook(w http.ResponseWriter, r *http.Request) {
	if secret := h.cfg.MAXWebhookSecret; secret != "" {
		if r.Header.Get("X-Max-Bot-Api-Secret") != secret {
			writeError(w, http.StatusUnauthorized, "Неверный секрет webhook")
			return
		}
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	var update map[string]any
	if err := json.Unmarshal(body, &update); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректный JSON")
		return
	}

	if err := h.oauth.HandleMAXWebhook(r.Context(), update); err != nil {
		if errors.Is(err, service.ErrOAuthStateInvalid) || errors.Is(err, service.ErrOAuthSessionExpired) {
			writeJSON(w, http.StatusOK, map[string]string{"status": "ignored"})
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось обработать webhook")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *OAuthLoginHandler) MAXStatus(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if token == "" {
		writeError(w, http.StatusBadRequest, "Укажите token")
		return
	}

	status, err := h.oauth.PollMAXStatus(r.Context(), token)
	if err != nil {
		h.writeOAuthError(w, err)
		return
	}

	if status.Status == "completed" {
		result, err := h.oauth.IssueTokenForCompletedSession(r.Context(), token)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Не удалось выдать сессию")
			return
		}
		h.mw.SetTokenCookie(w, result.Token, h.cfg.IsProduction())
		active, list, err := h.workspaces.ResolveActive(r.Context(), result.User.ID, r)
		if err == nil && active != nil {
			service.SetActiveWorkspaceCookie(w, active.ID, h.cfg.IsProduction())
		} else if result.Workspace != nil {
			service.SetActiveWorkspaceCookie(w, result.Workspace.ID, h.cfg.IsProduction())
			active = result.Workspace
			list = result.Workspaces
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"status":           status.Status,
			"redirect_url":     status.RedirectURL,
			"user":             result.User,
			"workspace":        active,
			"active_workspace": active,
			"workspaces":       list,
		})
		return
	}

	writeJSON(w, http.StatusOK, status)
}

func (h *OAuthLoginHandler) ListIdentities(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	identities, err := h.oauth.ListIdentities(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить привязки")
		return
	}
	if identities == nil {
		identities = []model.UserLoginIdentity{}
	}

	methods, err := h.oauth.AuthMethods(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"identities": identities,
		"methods":    methods,
	})
}

func (h *OAuthLoginHandler) Unlink(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	provider := model.LoginOAuthProvider(chi.URLParam(r, "provider"))
	if provider != model.LoginProviderVK && provider != model.LoginProviderMAX {
		writeError(w, http.StatusBadRequest, "Неизвестный провайдер")
		return
	}

	if err := h.oauth.Unlink(r.Context(), userID, provider); err != nil {
		h.writeOAuthError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *OAuthLoginHandler) finishOAuthLogin(w http.ResponseWriter, r *http.Request, result *service.AuthResult, redirectPath string) {
	h.mw.SetTokenCookie(w, result.Token, h.cfg.IsProduction())

	active, _, err := h.workspaces.ResolveActive(r.Context(), result.User.ID, r)
	if err != nil || active == nil {
		active = result.Workspace
	}
	if active != nil {
		service.SetActiveWorkspaceCookie(w, active.ID, h.cfg.IsProduction())
	}

	target := h.cfg.PublicAppURL + sanitizeAppRedirect(redirectPath)
	http.Redirect(w, r, target, http.StatusFound)
}

func (h *OAuthLoginHandler) redirectOAuthError(w http.ResponseWriter, r *http.Request, code string) {
	target := h.cfg.PublicAppURL + "/auth/login?oauth_error=" + code
	http.Redirect(w, r, target, http.StatusFound)
}

func sanitizeAppRedirect(path string) string {
	path = strings.TrimSpace(path)
	if path == "" || !strings.HasPrefix(path, "/") || strings.HasPrefix(path, "//") {
		return "/dashboard"
	}
	return path
}

func (h *OAuthLoginHandler) writeOAuthError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrOAuthProviderDisabled):
		writeError(w, http.StatusForbidden, "Вход через этот провайдер отключён")
	case errors.Is(err, service.ErrOAuthProviderNotReady):
		writeError(w, http.StatusServiceUnavailable, "Провайдер не настроен")
	case errors.Is(err, service.ErrOAuthStateInvalid):
		writeError(w, http.StatusBadRequest, "Некорректная или устаревшая сессия OAuth")
	case errors.Is(err, service.ErrOAuthSessionExpired):
		writeError(w, http.StatusBadRequest, "Сессия OAuth истекла")
	case errors.Is(err, service.ErrOAuthAlreadyLinked):
		writeError(w, http.StatusConflict, "Этот способ входа уже привязан")
	case errors.Is(err, service.ErrOAuthLinkConflict):
		writeError(w, http.StatusConflict, "Аккаунт уже привязан к другому пользователю")
	case errors.Is(err, service.ErrOAuthCannotUnlink):
		writeError(w, http.StatusBadRequest, "Нельзя отвязать последний способ входа")
	case errors.Is(err, service.ErrUserBlocked):
		writeError(w, http.StatusForbidden, "Аккаунт заблокирован")
	default:
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
	}
}
