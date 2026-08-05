package handler

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/service"
)

type OAuthLoginHandler struct {
	oauth      *service.OAuthLoginService
	workspaces *service.WorkspaceService
	mw         *middleware.Auth
	cfg        *config.Config
	logger     *slog.Logger
}

func NewOAuthLoginHandler(
	oauth *service.OAuthLoginService,
	workspaces *service.WorkspaceService,
	mw *middleware.Auth,
	cfg *config.Config,
	logger *slog.Logger,
) *OAuthLoginHandler {
	return &OAuthLoginHandler{oauth: oauth, workspaces: workspaces, mw: mw, cfg: cfg, logger: logger}
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
		if h.logger != nil {
			h.logger.Error("oauth start failed", "provider", provider, "mode", mode, "err", err)
		}
		h.writeOAuthError(w, err)
		return
	}

	if result.RedirectURL != "" {
		http.Redirect(w, r, result.RedirectURL, http.StatusFound)
		return
	}
	if mode == "login" && result.WaitURL != "" {
		http.Redirect(w, r, result.WaitURL, http.StatusFound)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *OAuthLoginHandler) VKCallback(w http.ResponseWriter, r *http.Request) {
	if errMsg := r.URL.Query().Get("error"); errMsg != "" {
		h.redirectOAuthError(w, r, errMsg, r.URL.Query().Get("state"), "")
		return
	}

	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	deviceID := r.URL.Query().Get("device_id")
	if code == "" || state == "" || deviceID == "" {
		if c, s, d, ok := oauthclient.CallbackParams(r); ok {
			code, state, deviceID = c, s, d
		}
	}
	if code == "" || state == "" || deviceID == "" {
		h.redirectOAuthError(w, r, "invalid_callback", state, "")
		return
	}

	result, redirectPath, err := h.oauth.CompleteVK(r.Context(), code, deviceID, state)
	if err != nil {
		code, detail := h.vkCallbackError(err)
		if h.logger != nil {
			h.logger.Error("vk oauth callback failed", "state", state, "code", code, "detail", detail, "err", err)
		}
		h.redirectOAuthError(w, r, code, state, detail)
		return
	}

	h.finishOAuthLogin(w, r, result, redirectPath)
}

func (h *OAuthLoginHandler) MAXWebhook(w http.ResponseWriter, r *http.Request) {
	secret, err := h.oauth.GetMAXWebhookSecret(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}
	if secret != "" {
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

	target := strings.TrimSuffix(h.cfg.PublicAppURL, "/") + sanitizeAppRedirect(redirectPath)
	if strings.Contains(redirectPath, "?") {
		if u, err := url.Parse(redirectPath); err == nil && strings.HasPrefix(u.Path, "/") {
			target = strings.TrimSuffix(h.cfg.PublicAppURL, "/") + u.Path
			if u.RawQuery != "" {
				target += "?" + u.RawQuery
			}
		}
	}
	http.Redirect(w, r, target, http.StatusFound)
}

func (h *OAuthLoginHandler) vkCallbackError(err error) (string, string) {
	var vkErr *oauthclient.VKAPIError
	if errors.As(err, &vkErr) {
		return vkErr.Reason, vkErr.Details
	}
	switch {
	case errors.Is(err, service.ErrOAuthSessionExpired):
		return "session_expired", ""
	case errors.Is(err, service.ErrOAuthStateInvalid):
		return "invalid_state", ""
	case errors.Is(err, service.ErrOAuthLinkConflict):
		return "link_conflict", ""
	case errors.Is(err, service.ErrOAuthInvalidMode):
		return "invalid_session", "link session has no user id"
	case errors.Is(err, service.ErrOAuthAlreadyLinked):
		return "already_linked", ""
	case oauthclient.IsNetworkError(err):
		return "network_error", "сервер не достучался до id.vk.ru"
	default:
		return "oauth_failed", oauthclient.SanitizeOAuthDetail(err.Error())
	}
}

func (h *OAuthLoginHandler) redirectOAuthError(w http.ResponseWriter, r *http.Request, code, state, detail string) {
	target := strings.TrimSuffix(h.cfg.PublicAppURL, "/") + h.oauth.OAuthErrorRedirect(r.Context(), state, code, detail)
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
		if h.logger != nil {
			h.logger.Error("oauth login failed", "err", err)
		}
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
	}
}
