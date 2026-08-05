package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/repository"
)

const oauthSessionTTL = 15 * time.Minute
const maxStartPrefix = "p_"

var (
	ErrOAuthProviderDisabled = errors.New("oauth provider disabled")
	ErrOAuthProviderNotReady = errors.New("oauth provider not configured")
	ErrOAuthStateInvalid     = errors.New("oauth state invalid")
	ErrOAuthSessionExpired   = errors.New("oauth session expired")
	ErrOAuthAlreadyLinked    = errors.New("oauth identity already linked")
	ErrOAuthLinkConflict     = errors.New("oauth identity linked to another account")
	ErrOAuthCannotUnlink     = errors.New("cannot unlink last login method")
	ErrOAuthInvalidMode      = errors.New("invalid oauth mode")
)

type OAuthLoginService struct {
	users        *repository.UserRepository
	identities   *repository.UserLoginIdentityRepository
	sessions     *repository.OAuthLoginSessionRepository
	oauthSettings *repository.OAuthSettingsRepository
	workspaces   *repository.WorkspaceRepository
	plans        *repository.PlanRepository
	settings     *repository.SettingsRepository
	pool         pgxPoolBeginner
	auth         *middleware.Auth
	cfg          *config.Config
}

func NewOAuthLoginService(
	users *repository.UserRepository,
	identities *repository.UserLoginIdentityRepository,
	sessions *repository.OAuthLoginSessionRepository,
	oauthSettings *repository.OAuthSettingsRepository,
	workspaces *repository.WorkspaceRepository,
	plans *repository.PlanRepository,
	settings *repository.SettingsRepository,
	pool pgxPoolBeginner,
	auth *middleware.Auth,
	cfg *config.Config,
) *OAuthLoginService {
	return &OAuthLoginService{
		users: users, identities: identities, sessions: sessions,
		oauthSettings: oauthSettings,
		workspaces: workspaces, plans: plans, settings: settings,
		pool: pool, auth: auth, cfg: cfg,
	}
}

type OAuthStartResult struct {
	RedirectURL string `json:"redirect_url,omitempty"`
	StateToken  string `json:"state_token,omitempty"`
	DeepLink    string `json:"deep_link,omitempty"`
	WaitURL     string `json:"wait_url,omitempty"`
}

type OAuthStatusResult struct {
	Status      string `json:"status"`
	RedirectURL string `json:"redirect_url,omitempty"`
	DeepLink    string `json:"deep_link,omitempty"`
	Error       string `json:"error,omitempty"`
}

type OAuthIdentityProfile struct {
	Provider       model.LoginOAuthProvider
	ProviderUserID string
	DisplayName    string
	AvatarURL      string
	Email          string
}

func (s *OAuthLoginService) ListIdentities(ctx context.Context, userID string) ([]model.UserLoginIdentity, error) {
	return s.identities.ListByUserID(ctx, userID)
}

func (s *OAuthLoginService) AuthMethods(ctx context.Context) (map[string]bool, error) {
	vkEnabled, err := s.isProviderEnabled(ctx, model.LoginProviderVK)
	if err != nil {
		return nil, err
	}
	maxEnabled, err := s.isProviderEnabled(ctx, model.LoginProviderMAX)
	if err != nil {
		return nil, err
	}
	return map[string]bool{
		"vk_login_enabled":  vkEnabled,
		"max_login_enabled": maxEnabled,
	}, nil
}

func (s *OAuthLoginService) SetProviderEnabled(ctx context.Context, provider model.LoginOAuthProvider, enabled bool) error {
	key := settingKeyForProvider(provider)
	v := "false"
	if enabled {
		v = "true"
	}
	return s.settings.Set(ctx, key, v)
}

func (s *OAuthLoginService) GetAdminSettings(ctx context.Context) (*model.AdminAuthSettingsResponse, error) {
	inviteEnabled, err := s.settings.IsInviteRegistrationEnabled(ctx)
	if err != nil {
		return nil, err
	}
	oauthAdmin, err := s.buildAdminOAuthSettings(ctx)
	if err != nil {
		return nil, err
	}
	vkEnabled, err := s.isProviderEnabled(ctx, model.LoginProviderVK)
	if err != nil {
		return nil, err
	}
	maxEnabled, err := s.isProviderEnabled(ctx, model.LoginProviderMAX)
	if err != nil {
		return nil, err
	}
	return &model.AdminAuthSettingsResponse{
		InviteRegistrationEnabled: inviteEnabled,
		VKLoginEnabled:            vkEnabled,
		MAXLoginEnabled:           maxEnabled,
		OAuth:                     oauthAdmin,
	}, nil
}

func (s *OAuthLoginService) SaveAdminSettings(ctx context.Context, input model.AdminAuthSettingsInput) (string, error) {
	if err := s.settings.SetInviteRegistrationEnabled(ctx, input.InviteRegistrationEnabled); err != nil {
		return "", err
	}
	if err := s.SetProviderEnabled(ctx, model.LoginProviderVK, input.VKLoginEnabled); err != nil {
		return "", err
	}
	if err := s.SetProviderEnabled(ctx, model.LoginProviderMAX, input.MAXLoginEnabled); err != nil {
		return "", err
	}
	if input.VK != nil {
		if err := s.oauthSettings.SaveVK(ctx, input.VK.ClientID, input.VK.ClientSecret, input.VK.ClientSecret == ""); err != nil {
			return "", err
		}
	}
	var webhookErr string
	if input.MAX != nil {
		botUsername := oauthclient.NormalizeMAXBotUsername(input.MAX.BotUsername)
		if err := s.oauthSettings.SaveMAX(
			ctx,
			botUsername,
			input.MAX.BotToken,
			input.MAX.WebhookSecret,
			input.MAX.BotToken == "",
			input.MAX.WebhookSecret == "",
		); err != nil {
			return "", err
		}
		if err := s.registerMAXWebhook(ctx); err != nil {
			webhookErr = oauthclient.SanitizeOAuthDetail(err.Error())
		}
	}
	return webhookErr, nil
}

func (s *OAuthLoginService) registerMAXWebhook(ctx context.Context) error {
	cfg, err := s.oauthSettings.GetMAX(ctx)
	if err != nil {
		return err
	}
	if !cfg.Configured() {
		return nil
	}
	client := oauthclient.NewMAXBotClient()
	return client.ReplaceWebhook(ctx, cfg.BotToken, s.cfg.MAXOAuthWebhookURL(), cfg.WebhookSecret)
}

func (s *OAuthLoginService) GetMAXWebhookSecret(ctx context.Context) (string, error) {
	cfg, err := s.oauthSettings.GetMAX(ctx)
	if err != nil {
		return "", err
	}
	return cfg.WebhookSecret, nil
}

func (s *OAuthLoginService) buildAdminOAuthSettings(ctx context.Context) (model.AdminOAuthLoginSettings, error) {
	vk, err := s.oauthSettings.GetVK(ctx)
	if err != nil {
		return model.AdminOAuthLoginSettings{}, err
	}
	maxCfg, err := s.oauthSettings.GetMAX(ctx)
	if err != nil {
		return model.AdminOAuthLoginSettings{}, err
	}
	return model.AdminOAuthLoginSettings{
		VK: model.AdminVKLoginConfig{
			ClientID:        vk.ClientID,
			ClientSecretSet: vk.ClientSecret != "",
			RedirectURI:     s.cfg.VKOAuthRedirectURI(),
			Configured:      vk.Configured(),
		},
		MAX: model.AdminMAXLoginConfig{
			BotUsername:      maxCfg.BotUsername,
			BotTokenSet:      maxCfg.BotToken != "",
			WebhookSecretSet: maxCfg.WebhookSecret != "",
			WebhookURL:       s.cfg.MAXOAuthWebhookURL(),
			Configured:       maxCfg.Configured(),
		},
	}, nil
}

func (s *OAuthLoginService) vkClient(ctx context.Context) (*oauthclient.VKClient, error) {
	vk, err := s.oauthSettings.GetVK(ctx)
	if err != nil {
		return nil, err
	}
	if !vk.Configured() {
		return nil, ErrOAuthProviderNotReady
	}
	return &oauthclient.VKClient{
		ClientID:     vk.ClientID,
		ClientSecret: vk.ClientSecret,
		RedirectURI:  s.cfg.VKOAuthRedirectURI(),
	}, nil
}

func (s *OAuthLoginService) OAuthErrorRedirect(ctx context.Context, state, code, detail string) string {
	path := "/auth/login"
	if state != "" {
		session, err := s.sessions.GetByStateToken(ctx, state)
		if err == nil && session.Mode == "link" {
			path = sanitizeRedirectPath(session.RedirectPath)
			if path == "/dashboard" {
				path = "/settings"
			}
		}
	}
	return appendOAuthQuery(path, code, detail)
}

func appendOAuthQuery(path, code, detail string) string {
	q := url.Values{}
	q.Set("oauth_error", code)
	if detail != "" {
		q.Set("oauth_detail", detail)
	}
	sep := "?"
	if strings.Contains(path, "?") {
		sep = "&"
	}
	return path + sep + q.Encode()
}

func (s *OAuthLoginService) StartVK(ctx context.Context, mode, userID, redirectPath string) (*OAuthStartResult, error) {
	if err := s.ensureStartAllowed(ctx, model.LoginProviderVK, mode, userID); err != nil {
		return nil, err
	}

	state, err := oauthclient.StateToken()
	if err != nil {
		return nil, err
	}
	verifier, err := oauthclient.CodeVerifier()
	if err != nil {
		return nil, err
	}
	challenge := oauthclient.CodeChallenge(verifier)

	if err := s.sessions.Create(ctx, model.LoginProviderVK, state, mode, userID, sanitizeRedirectPath(redirectPath), verifier, oauthSessionTTL); err != nil {
		return nil, fmt.Errorf("create vk oauth session: %w", err)
	}

	vk, err := s.vkClient(ctx)
	if err != nil {
		return nil, err
	}

	return &OAuthStartResult{
		RedirectURL: vk.AuthorizeURL(state, challenge, s.cfg.VKOAuthRedirectURI()),
		StateToken:  state,
	}, nil
}

func (s *OAuthLoginService) StartMAX(ctx context.Context, mode, userID, redirectPath string) (*OAuthStartResult, error) {
	if err := s.ensureStartAllowed(ctx, model.LoginProviderMAX, mode, userID); err != nil {
		return nil, err
	}
	maxCfg, err := s.oauthSettings.GetMAX(ctx)
	if err != nil {
		return nil, err
	}
	if maxCfg.BotUsername == "" {
		return nil, ErrOAuthProviderNotReady
	}
	if maxCfg.BotToken == "" {
		return nil, ErrOAuthProviderNotReady
	}

	state, err := oauthclient.StateToken()
	if err != nil {
		return nil, err
	}
	if err := s.sessions.Create(ctx, model.LoginProviderMAX, state, mode, userID, sanitizeRedirectPath(redirectPath), "", oauthSessionTTL); err != nil {
		return nil, fmt.Errorf("create max oauth session: %w", err)
	}

	payload := maxStartPrefix + state
	deepLink := fmt.Sprintf("https://max.ru/%s?start=%s", maxCfg.BotUsername, payload)
	waitURL := s.cfg.PublicAppURL + "/auth/oauth/max/wait?token=" + state

	return &OAuthStartResult{
		StateToken: state,
		DeepLink:   deepLink,
		WaitURL:    waitURL,
	}, nil
}

func (s *OAuthLoginService) CompleteVK(
	ctx context.Context,
	code, deviceID, state string,
) (*AuthResult, string, error) {
	session, err := s.validateSession(ctx, model.LoginProviderVK, state)
	if err != nil {
		return nil, "", err
	}

	vk, err := s.vkClient(ctx)
	if err != nil {
		return nil, "", err
	}

	token, err := vk.ExchangeCode(ctx, code, session.CodeVerifier, deviceID, state, s.cfg.VKOAuthRedirectURI())
	if err != nil {
		if oauthclient.IsNetworkError(err) {
			return nil, "", fmt.Errorf("vk token exchange network: %w", err)
		}
		return nil, "", fmt.Errorf("vk token exchange: %w", err)
	}

	profile, err := vk.FetchUserInfo(ctx, token.AccessToken)
	if err != nil {
		profile = oauthclient.ProfileFromToken(token)
	}
	if profile != nil && profile.Email == "" && strings.TrimSpace(token.Email) != "" {
		profile.Email = strings.TrimSpace(token.Email)
	}
	if profile == nil || profile.UserID == "" || profile.UserID == "0" {
		return nil, "", fmt.Errorf("vk profile: empty user id after token exchange")
	}

	return s.completeOAuth(ctx, session, OAuthIdentityProfile{
		Provider:       model.LoginProviderVK,
		ProviderUserID: profile.UserID,
		DisplayName:    profile.DisplayName,
		AvatarURL:      profile.AvatarURL,
		Email:          profile.Email,
	})
}

func (s *OAuthLoginService) HandleMAXWebhook(ctx context.Context, update map[string]any) error {
	updateType, _ := update["update_type"].(string)
	if updateType != "bot_started" {
		return nil
	}

	startPayload := maxStartPayload(update)
	if startPayload == "" || !strings.HasPrefix(startPayload, maxStartPrefix) {
		return nil
	}
	state := strings.TrimPrefix(startPayload, maxStartPrefix)

	session, err := s.validateSession(ctx, model.LoginProviderMAX, state)
	if err != nil {
		return err
	}

	userObj, _ := update["user"].(map[string]any)
	if userObj == nil {
		return ErrOAuthStateInvalid
	}

	providerUserID := maxUserIDString(userObj)
	if providerUserID == "" {
		return ErrOAuthStateInvalid
	}

	displayName := maxDisplayName(userObj)
	if displayName == "" {
		displayName = fmt.Sprintf("MAX %s", providerUserID)
	}
	avatarURL, _ := userObj["photo_url"].(string)

	_, _, err = s.completeOAuth(ctx, session, OAuthIdentityProfile{
		Provider:       model.LoginProviderMAX,
		ProviderUserID: providerUserID,
		DisplayName:    displayName,
		AvatarURL:      avatarURL,
	})
	return err
}

func (s *OAuthLoginService) PollMAXStatus(ctx context.Context, stateToken string) (*OAuthStatusResult, error) {
	session, err := s.sessions.GetByStateToken(ctx, stateToken)
	if err != nil {
		return nil, err
	}
	if session.Provider != model.LoginProviderMAX {
		return nil, ErrOAuthStateInvalid
	}
	if session.CompletedAt == nil {
		if time.Now().After(session.ExpiresAt) {
			return &OAuthStatusResult{Status: "expired", Error: "Сессия истекла. Попробуйте снова."}, nil
		}
		deepLink := ""
		maxCfg, err := s.oauthSettings.GetMAX(ctx)
		if err == nil && maxCfg.BotUsername != "" {
			deepLink = fmt.Sprintf("https://max.ru/%s?start=%s%s", maxCfg.BotUsername, maxStartPrefix, stateToken)
		}
		return &OAuthStatusResult{Status: "pending", DeepLink: deepLink}, nil
	}
	if session.CompletedUserID == "" {
		return &OAuthStatusResult{Status: "error", Error: "Не удалось завершить вход"}, nil
	}
	redirectPath := session.RedirectPath
	if session.Mode == "link" {
		redirectPath = sanitizeRedirectPath(session.RedirectPath)
		if redirectPath == "/dashboard" {
			redirectPath = "/settings"
		}
		redirectPath += "?oauth_linked=" + url.QueryEscape(string(session.Provider))
	}
	return &OAuthStatusResult{
		Status:      "completed",
		RedirectURL: s.cfg.PublicAppURL + redirectPath,
	}, nil
}

func (s *OAuthLoginService) IssueTokenForCompletedSession(ctx context.Context, stateToken string) (*AuthResult, error) {
	session, err := s.sessions.GetByStateToken(ctx, stateToken)
	if err != nil {
		return nil, err
	}
	if session.CompletedAt == nil || session.CompletedUserID == "" {
		return nil, ErrOAuthStateInvalid
	}
	return s.authResultForUser(ctx, session.CompletedUserID)
}

func (s *OAuthLoginService) Unlink(ctx context.Context, userID string, provider model.LoginOAuthProvider) error {
	hasPassword, err := s.users.HasPassword(ctx, userID)
	if err != nil {
		return err
	}
	count, err := s.identities.CountByUserID(ctx, userID)
	if err != nil {
		return err
	}
	if !hasPassword && count <= 1 {
		return ErrOAuthCannotUnlink
	}
	return s.identities.DeleteByUserProvider(ctx, userID, provider)
}

func (s *OAuthLoginService) completeOAuth(
	ctx context.Context,
	session *model.OAuthLoginSession,
	profile OAuthIdentityProfile,
) (*AuthResult, string, error) {
	if profile.ProviderUserID == "" {
		return nil, "", ErrOAuthStateInvalid
	}

	existing, err := s.identities.GetByProviderUser(ctx, profile.Provider, profile.ProviderUserID)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return nil, "", err
	}

	var targetUserID string
	switch session.Mode {
	case "link":
		if session.UserID == "" {
			return nil, "", ErrOAuthInvalidMode
		}
		if existing != nil && existing.UserID != session.UserID {
			return nil, "", ErrOAuthLinkConflict
		}
		targetUserID = session.UserID
	case "login":
		if existing != nil {
			targetUserID = existing.UserID
		} else {
			user, err := s.createOAuthUser(ctx, profile)
			if err != nil {
				return nil, "", err
			}
			targetUserID = user.ID
		}
	default:
		return nil, "", ErrOAuthInvalidMode
	}

	user, err := s.users.GetByID(ctx, targetUserID)
	if err != nil {
		return nil, "", err
	}
	if user.IsBlocked {
		return nil, "", ErrUserBlocked
	}

	if _, err := s.identities.Upsert(ctx, targetUserID, profile.Provider, profile.ProviderUserID, profile.DisplayName, profile.AvatarURL); err != nil {
		return nil, "", fmt.Errorf("identity upsert: %w", err)
	}
	if err := s.sessions.Complete(ctx, session.StateToken, targetUserID, profile.ProviderUserID); err != nil {
		return nil, "", fmt.Errorf("session complete: %w", err)
	}

	_ = s.users.TouchActive(ctx, targetUserID)

	result, err := s.authResultForUser(ctx, targetUserID)
	if err != nil {
		return nil, "", err
	}
	redirectOut := session.RedirectPath
	if session.Mode == "link" {
		redirectOut = sanitizeRedirectPath(session.RedirectPath)
		if redirectOut == "/dashboard" {
			redirectOut = "/settings"
		}
		redirectOut += "?oauth_linked=" + url.QueryEscape(string(profile.Provider))
	}
	return result, redirectOut, nil
}

func (s *OAuthLoginService) createOAuthUser(ctx context.Context, profile OAuthIdentityProfile) (*model.User, error) {
	email := profile.Email
	if email == "" {
		email = fmt.Sprintf("%s_%s@login.postilka.local", profile.Provider, profile.ProviderUserID)
	}
	name := profile.DisplayName
	if name == "" {
		name = string(profile.Provider) + " user"
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	user, err := s.users.CreateOAuthTx(ctx, tx, email, name)
	if err != nil {
		return nil, err
	}

	slug, err := s.uniqueSlug(ctx, slugFromEmail(email))
	if err != nil {
		return nil, err
	}

	wsName := fmt.Sprintf("Workspace %s", name)
	planID := ""
	if s.plans != nil {
		if free, err := s.plans.GetDefaultFree(ctx); err == nil && free != nil {
			planID = free.ID
		}
	}
	if _, err := s.workspaces.CreateWithOwnerTx(ctx, tx, wsName, slug, user.ID, planID); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *OAuthLoginService) authResultForUser(ctx context.Context, userID string) (*AuthResult, error) {
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	list, err := s.workspaces.ListForUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	var ws *model.Workspace
	if len(list) > 0 {
		ws = &list[0]
	}
	token, err := s.auth.IssueToken(userID, tokenTTL)
	if err != nil {
		return nil, err
	}
	return &AuthResult{Token: token, User: user, Workspace: ws, Workspaces: list}, nil
}

func (s *OAuthLoginService) uniqueSlug(ctx context.Context, base string) (string, error) {
	authSvc := &AuthService{workspaces: s.workspaces}
	return authSvc.uniqueSlug(ctx, base)
}

func (s *OAuthLoginService) ensureStartAllowed(ctx context.Context, provider model.LoginOAuthProvider, mode, userID string) error {
	if mode != "login" && mode != "link" {
		return ErrOAuthInvalidMode
	}
	if mode == "link" && userID == "" {
		return ErrOAuthInvalidMode
	}
	enabled, err := s.isProviderEnabled(ctx, provider)
	if err != nil {
		return err
	}
	if !enabled {
		return ErrOAuthProviderDisabled
	}
	if provider == model.LoginProviderVK {
		ok, err := s.isVKConfigured(ctx)
		if err != nil || !ok {
			return ErrOAuthProviderNotReady
		}
	}
	if provider == model.LoginProviderMAX {
		ok, err := s.isMAXConfigured(ctx)
		if err != nil || !ok {
			return ErrOAuthProviderNotReady
		}
	}
	if mode == "link" {
		existing, err := s.identities.ListByUserID(ctx, userID)
		if err != nil {
			return err
		}
		for _, item := range existing {
			if item.Provider == provider {
				return ErrOAuthAlreadyLinked
			}
		}
	}
	return nil
}

func (s *OAuthLoginService) validateSession(ctx context.Context, provider model.LoginOAuthProvider, state string) (*model.OAuthLoginSession, error) {
	session, err := s.sessions.GetByStateToken(ctx, state)
	if err != nil {
		return nil, ErrOAuthStateInvalid
	}
	if session.Provider != provider {
		return nil, ErrOAuthStateInvalid
	}
	if session.CompletedAt != nil {
		return nil, ErrOAuthStateInvalid
	}
	if time.Now().After(session.ExpiresAt) {
		return nil, ErrOAuthSessionExpired
	}
	return session, nil
}

func (s *OAuthLoginService) isProviderEnabled(ctx context.Context, provider model.LoginOAuthProvider) (bool, error) {
	key := settingKeyForProvider(provider)
	value, err := s.settings.Get(ctx, key)
	if errors.Is(err, repository.ErrNotFound) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if value != "true" {
		return false, nil
	}
	return s.isProviderConfigured(ctx, provider)
}

func (s *OAuthLoginService) isProviderConfigured(ctx context.Context, provider model.LoginOAuthProvider) (bool, error) {
	switch provider {
	case model.LoginProviderVK:
		return s.isVKConfigured(ctx)
	case model.LoginProviderMAX:
		return s.isMAXConfigured(ctx)
	default:
		return false, nil
	}
}

func (s *OAuthLoginService) isVKConfigured(ctx context.Context) (bool, error) {
	vk, err := s.oauthSettings.GetVK(ctx)
	if err != nil {
		return false, err
	}
	return vk.Configured(), nil
}

func (s *OAuthLoginService) isMAXConfigured(ctx context.Context) (bool, error) {
	maxCfg, err := s.oauthSettings.GetMAX(ctx)
	if err != nil {
		return false, err
	}
	return maxCfg.Configured(), nil
}

func settingKeyForProvider(provider model.LoginOAuthProvider) string {
	return "auth." + string(provider) + "_login_enabled"
}

func sanitizeRedirectPath(path string) string {
	path = strings.TrimSpace(path)
	if path == "" || !strings.HasPrefix(path, "/") || strings.HasPrefix(path, "//") {
		return "/dashboard"
	}
	if strings.HasPrefix(path, "/auth/") {
		return "/dashboard"
	}
	return path
}

func maxUserIDString(user map[string]any) string {
	switch v := user["user_id"].(type) {
	case float64:
		return fmt.Sprintf("%.0f", v)
	case int64:
		return fmt.Sprintf("%d", v)
	case int:
		return fmt.Sprintf("%d", v)
	case string:
		return v
	default:
		if v := user["id"]; v != nil {
			return fmt.Sprintf("%v", v)
		}
		return ""
	}
}

func maxStartPayload(update map[string]any) string {
	if s, ok := update["payload"].(string); ok {
		return s
	}
	if nested, ok := update["payload"].(map[string]any); ok {
		if s, ok := nested["start_payload"].(string); ok {
			return s
		}
		if s, ok := nested["startPayload"].(string); ok {
			return s
		}
	}
	return ""
}

func maxDisplayName(user map[string]any) string {
	if name, ok := user["name"].(string); ok {
		if trimmed := strings.TrimSpace(name); trimmed != "" {
			return trimmed
		}
	}
	first := strings.TrimSpace(fmt.Sprintf("%v", user["first_name"]))
	last := strings.TrimSpace(fmt.Sprintf("%v", user["last_name"]))
	if first != "" && first != "<nil>" {
		if last != "" && last != "<nil>" {
			return first + " " + last
		}
		return first
	}
	if username, ok := user["username"].(string); ok {
		if trimmed := strings.TrimSpace(username); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

// Used by handler after MAX poll completes to set cookies consistently with email login.
func (s *OAuthLoginService) ResolveActiveWorkspace(
	ctx context.Context,
	userID string,
	r *http.Request,
) (*model.Workspace, []model.Workspace, error) {
	wsSvc := NewWorkspaceService(s.workspaces)
	return wsSvc.ResolveActive(ctx, userID, r)
}
