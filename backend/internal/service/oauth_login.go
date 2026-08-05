package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/repository"
)

const oauthSessionTTL = 5 * time.Minute
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
	users      *repository.UserRepository
	identities *repository.UserLoginIdentityRepository
	sessions   *repository.OAuthLoginSessionRepository
	workspaces *repository.WorkspaceRepository
	plans      *repository.PlanRepository
	settings   *repository.SettingsRepository
	pool       pgxPoolBeginner
	auth       *middleware.Auth
	cfg        *config.Config
	vk         *oauthclient.VKClient
}

func NewOAuthLoginService(
	users *repository.UserRepository,
	identities *repository.UserLoginIdentityRepository,
	sessions *repository.OAuthLoginSessionRepository,
	workspaces *repository.WorkspaceRepository,
	plans *repository.PlanRepository,
	settings *repository.SettingsRepository,
	pool pgxPoolBeginner,
	auth *middleware.Auth,
	cfg *config.Config,
) *OAuthLoginService {
	return &OAuthLoginService{
		users: users, identities: identities, sessions: sessions,
		workspaces: workspaces, plans: plans, settings: settings,
		pool: pool, auth: auth, cfg: cfg,
		vk: &oauthclient.VKClient{
			ClientID:     cfg.VKClientID,
			ClientSecret: cfg.VKClientSecret,
			RedirectURI:  cfg.VKOAuthRedirectURI(),
		},
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

	if _, err := s.sessions.Create(ctx, model.LoginProviderVK, state, mode, userID, sanitizeRedirectPath(redirectPath), verifier, oauthSessionTTL); err != nil {
		return nil, err
	}

	return &OAuthStartResult{
		RedirectURL: s.vk.AuthorizeURL(state, challenge, s.cfg.VKOAuthRedirectURI()),
		StateToken:  state,
	}, nil
}

func (s *OAuthLoginService) StartMAX(ctx context.Context, mode, userID, redirectPath string) (*OAuthStartResult, error) {
	if err := s.ensureStartAllowed(ctx, model.LoginProviderMAX, mode, userID); err != nil {
		return nil, err
	}
	if s.cfg.MAXBotUsername == "" {
		return nil, ErrOAuthProviderNotReady
	}

	state, err := oauthclient.StateToken()
	if err != nil {
		return nil, err
	}
	if _, err := s.sessions.Create(ctx, model.LoginProviderMAX, state, mode, userID, sanitizeRedirectPath(redirectPath), "", oauthSessionTTL); err != nil {
		return nil, err
	}

	payload := maxStartPrefix + state
	deepLink := fmt.Sprintf("https://max.ru/%s?start=%s", s.cfg.MAXBotUsername, payload)
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

	token, err := s.vk.ExchangeCode(ctx, code, session.CodeVerifier, deviceID, state, s.cfg.VKOAuthRedirectURI())
	if err != nil {
		return nil, "", err
	}

	profile, err := s.vk.FetchUserInfo(ctx, token.AccessToken)
	if err != nil {
		profile = &oauthclient.VKProfile{UserID: fmt.Sprintf("%d", token.UserID)}
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

	payload, _ := update["payload"].(map[string]any)
	if payload == nil {
		payload = update
	}

	startPayload, _ := payload["start_payload"].(string)
	if startPayload == "" {
		startPayload, _ = payload["startPayload"].(string)
	}
	if !strings.HasPrefix(startPayload, maxStartPrefix) {
		return nil
	}
	state := strings.TrimPrefix(startPayload, maxStartPrefix)

	session, err := s.validateSession(ctx, model.LoginProviderMAX, state)
	if err != nil {
		return err
	}

	userObj, _ := payload["user"].(map[string]any)
	if userObj == nil {
		userObj, _ = update["user"].(map[string]any)
	}
	if userObj == nil {
		return ErrOAuthStateInvalid
	}

	providerUserID := maxUserIDString(userObj)
	displayName := strings.TrimSpace(fmt.Sprintf("%v %v", userObj["first_name"], userObj["last_name"]))
	if displayName == "" {
		displayName = fmt.Sprintf("MAX %s", providerUserID)
	}
	avatarURL, _ := userObj["photo_url"].(string)

	_, _, err = s.completeOAuth(ctx, session, OAuthIdentityProfile{
		Provider:       model.LoginProviderMAX,
		ProviderUserID: providerUserID,
		DisplayName:    strings.TrimSpace(displayName),
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
		if s.cfg.MAXBotUsername != "" {
			deepLink = fmt.Sprintf("https://max.ru/%s?start=%s%s", s.cfg.MAXBotUsername, maxStartPrefix, stateToken)
		}
		return &OAuthStatusResult{Status: "pending", DeepLink: deepLink}, nil
	}
	if session.CompletedUserID == "" {
		return &OAuthStatusResult{Status: "error", Error: "Не удалось завершить вход"}, nil
	}
	return &OAuthStatusResult{
		Status:      "completed",
		RedirectURL: s.cfg.PublicAppURL + session.RedirectPath,
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
		return nil, "", err
	}
	if err := s.sessions.Complete(ctx, session.StateToken, targetUserID, profile.ProviderUserID); err != nil {
		return nil, "", err
	}

	_ = s.users.TouchActive(ctx, targetUserID)

	result, err := s.authResultForUser(ctx, targetUserID)
	if err != nil {
		return nil, "", err
	}
	return result, session.RedirectPath, nil
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
	if provider == model.LoginProviderVK && s.cfg.VKClientID == "" {
		return ErrOAuthProviderNotReady
	}
	if provider == model.LoginProviderMAX && s.cfg.MAXBotToken == "" {
		return ErrOAuthProviderNotReady
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
		return s.providerConfigured(provider), nil
	}
	if err != nil {
		return false, err
	}
	if value != "true" {
		return false, nil
	}
	return s.providerConfigured(provider), nil
}

func (s *OAuthLoginService) providerConfigured(provider model.LoginOAuthProvider) bool {
	switch provider {
	case model.LoginProviderVK:
		return s.cfg.VKClientID != ""
	case model.LoginProviderMAX:
		return s.cfg.MAXBotToken != "" && s.cfg.MAXBotUsername != ""
	default:
		return false
	}
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
		return fmt.Sprintf("%v", v)
	}
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
