package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/mail"
	"regexp"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	pwdpolicy "github.com/postilka/postilka/internal/password"
	"github.com/postilka/postilka/internal/repository"
	tzpkg "github.com/postilka/postilka/internal/timezone"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrEmailTaken         = errors.New("email already registered")
	ErrEmailNotVerified   = errors.New("email not verified")
	ErrUserBlocked        = errors.New("account blocked")
	ErrInvalidInput       = errors.New("invalid input")
)

const bcryptCost = 12
const tokenTTL = 7 * 24 * time.Hour

var slugSanitizer = regexp.MustCompile(`[^a-z0-9-]+`)

type AuthService struct {
	users         *repository.UserRepository
	workspaces    *repository.WorkspaceRepository
	plans         *repository.PlanRepository
	invites       *InviteService
	wsInvites     *WorkspaceInviteService
	pool          pgxPoolBeginner
	auth          *middleware.Auth
	verification  *EmailVerificationService
	passwordReset *PasswordResetService
	telegram      *TelegramService
}

func NewAuthService(
	users *repository.UserRepository,
	workspaces *repository.WorkspaceRepository,
	plans *repository.PlanRepository,
	invites *InviteService,
	wsInvites *WorkspaceInviteService,
	pool pgxPoolBeginner,
	auth *middleware.Auth,
	verification *EmailVerificationService,
	passwordReset *PasswordResetService,
	telegram *TelegramService,
) *AuthService {
	return &AuthService{
		users: users, workspaces: workspaces, plans: plans,
		invites: invites, wsInvites: wsInvites, pool: pool, auth: auth,
		verification: verification, passwordReset: passwordReset,
		telegram: telegram,
	}
}

type AuthResult struct {
	Token      string
	User       *model.User
	Workspace  *model.Workspace
	Workspaces []model.Workspace
}

type RegisterResult struct {
	Email                     string
	EmailVerificationRequired bool
	Message                   string
}

func (s *AuthService) Register(ctx context.Context, email, password, name, inviteCode, workspaceInviteToken string) (*RegisterResult, error) {
	email = normalizeEmail(email)
	if err := validateCredentials(email, password); err != nil {
		return nil, err
	}

	inviteEnabled := false
	if s.invites != nil {
		var err error
		inviteEnabled, err = s.invites.IsRegistrationEnabled(ctx)
		if err != nil {
			return nil, err
		}
	}

	workspaceInviteBypass := false
	if inviteEnabled && strings.TrimSpace(inviteCode) == "" && s.wsInvites != nil && strings.TrimSpace(workspaceInviteToken) != "" {
		if err := s.wsInvites.ValidateTokenForEmail(ctx, workspaceInviteToken, email); err == nil {
			workspaceInviteBypass = true
		} else if !errors.Is(err, ErrWorkspaceInviteInvalid) && !errors.Is(err, ErrWorkspaceInviteEmail) {
			return nil, err
		}
	}
	if inviteEnabled && strings.TrimSpace(inviteCode) == "" && !workspaceInviteBypass {
		return nil, ErrInviteRequired
	}

	exists, err := s.users.ExistsByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrEmailTaken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return nil, err
	}

	if strings.TrimSpace(name) == "" {
		name = defaultNameFromEmail(email)
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	user, err := s.users.CreateTx(ctx, tx, email, string(hash), strings.TrimSpace(name))
	if err != nil {
		return nil, err
	}

	var consumedInviteID string
	if inviteEnabled {
		consumedInviteID, err = s.invites.ConsumeInviteTx(ctx, tx, inviteCode, user.ID)
		if err != nil {
			return nil, err
		}
		if err := s.users.SetRegisteredViaInviteTx(ctx, tx, user.ID, consumedInviteID); err != nil {
			return nil, err
		}
		if err := s.invites.GrantRegistrationInvitesTx(ctx, tx, user.ID); err != nil {
			return nil, err
		}
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
	_, err = s.workspaces.CreateWithOwnerTx(ctx, tx, wsName, slug, user.ID, planID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	if s.verification != nil {
		s.verification.SendRegistrationConfirmationBestEffort(ctx, user.ID, user.Email, user.Name)
	}
	if s.telegram != nil {
		meta := RegistrationNotifyMeta{InviteCode: NormalizeInviteCode(inviteCode)}
		s.telegram.NotifyRegistration(ctx, user, meta)
	}

	return &RegisterResult{
		Email:                     user.Email,
		EmailVerificationRequired: true,
		Message:                   "Мы отправили письмо со ссылкой для подтверждения регистрации",
	}, nil
}

func (s *AuthService) registerWithoutInviteCheck(ctx context.Context, email, password, name string) (*AuthResult, error) {
	email = normalizeEmail(email)
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(name) == "" {
		name = defaultNameFromEmail(email)
	}

	user, err := s.users.Create(ctx, email, string(hash), strings.TrimSpace(name))
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
	ws, err := s.workspaces.CreateWithOwner(ctx, wsName, slug, user.ID, planID)
	if err != nil {
		return nil, err
	}

	token, err := s.auth.IssueToken(user.ID, tokenTTL)
	if err != nil {
		return nil, err
	}

	list := []model.Workspace{*ws}
	return &AuthResult{Token: token, User: user, Workspace: ws, Workspaces: list}, nil
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*AuthResult, error) {
	email = normalizeEmail(email)
	if email == "" || password == "" {
		return nil, ErrInvalidCredentials
	}

	user, hash, err := s.users.GetByEmail(ctx, email)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrInvalidCredentials
	}
	if err != nil {
		return nil, err
	}
	if user.IsBlocked {
		return nil, ErrUserBlocked
	}
	if hash == "" {
		return nil, ErrInvalidCredentials
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}
	if user.EmailVerifiedAt == nil {
		return nil, ErrEmailNotVerified
	}

	_ = s.users.TouchActive(ctx, user.ID)

	list, err := s.workspaces.ListForUser(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	var ws *model.Workspace
	if len(list) > 0 {
		ws = &list[0]
	}

	token, err := s.auth.IssueToken(user.ID, tokenTTL)
	if err != nil {
		return nil, err
	}

	return &AuthResult{Token: token, User: user, Workspace: ws, Workspaces: list}, nil
}

func (s *AuthService) Me(ctx context.Context, userID string, r *http.Request) (*model.User, *model.Workspace, []model.Workspace, error) {
	user, err := s.users.GetByID(ctx, userID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, nil, nil, ErrInvalidCredentials
	}
	if err != nil {
		return nil, nil, nil, err
	}

	wsSvc := NewWorkspaceService(s.workspaces, s.plans)
	active, list, err := wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, nil, nil, err
	}
	return user, active, list, nil
}

// EnsureSuperAdmin creates a user (with workspace) if missing, then sets is_platform_admin.
// If the email already exists, only the platform-admin flag is set (password unchanged).
func (s *AuthService) EnsureSuperAdmin(ctx context.Context, email, password, name string) (*model.User, bool, error) {
	email = normalizeEmail(email)
	if email == "" {
		return nil, false, ErrInvalidInput
	}

	exists, err := s.users.ExistsByEmail(ctx, email)
	if err != nil {
		return nil, false, err
	}

	created := false
	if !exists {
		if err := validateCredentials(email, password); err != nil {
			return nil, false, err
		}
		result, err := s.registerWithoutInviteCheck(ctx, email, password, name)
		if err != nil {
			return nil, false, err
		}
		created = true
		if err := s.users.SetEmailVerified(ctx, result.User.ID); err != nil {
			return nil, false, err
		}
		if err := s.users.SetPlatformAdmin(ctx, result.User.ID, true); err != nil {
			return nil, false, err
		}
		user, err := s.users.GetByID(ctx, result.User.ID)
		return user, created, err
	}

	user, err := s.users.SetPlatformAdminByEmail(ctx, email, true)
	return user, created, err
}

func (s *AuthService) VerifyEmail(ctx context.Context, token string) (*AuthResult, error) {
	if s.verification == nil {
		return nil, ErrEmailVerificationInvalid
	}

	userID, err := s.verification.Verify(ctx, token)
	if err != nil {
		return nil, err
	}

	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user.IsBlocked {
		return nil, ErrUserBlocked
	}

	list, err := s.workspaces.ListForUser(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	var ws *model.Workspace
	if len(list) > 0 {
		ws = &list[0]
	}

	jwtToken, err := s.auth.IssueToken(user.ID, tokenTTL)
	if err != nil {
		return nil, err
	}

	return &AuthResult{Token: jwtToken, User: user, Workspace: ws, Workspaces: list}, nil
}

func (s *AuthService) ForgotPassword(ctx context.Context, email string) {
	if s.passwordReset != nil {
		s.passwordReset.RequestReset(ctx, email)
	}
}

func (s *AuthService) ResendVerification(ctx context.Context, email string) {
	email = normalizeEmail(email)
	if email == "" || s.verification == nil {
		return
	}
	user, _, err := s.users.GetByEmail(ctx, email)
	if errors.Is(err, repository.ErrNotFound) {
		return
	}
	if err != nil || user.IsBlocked || user.EmailVerifiedAt != nil {
		return
	}
	s.verification.SendRegistrationConfirmationBestEffort(ctx, user.ID, user.Email, user.Name)
}

func (s *AuthService) ResendVerificationForUser(ctx context.Context, userID string) error {
	if s.verification == nil {
		return ErrEmailVerificationInvalid
	}
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if user.EmailVerifiedAt != nil {
		return nil
	}
	return s.verification.SendRegistrationConfirmation(ctx, user.ID, user.Email, user.Name)
}

func (s *AuthService) ChangeEmail(ctx context.Context, userID, newEmail, password string) (*model.User, error) {
	newEmail = normalizeEmail(newEmail)
	if _, err := mail.ParseAddress(newEmail); err != nil {
		return nil, ErrInvalidInput
	}

	existing, _, err := s.users.GetByEmail(ctx, newEmail)
	if err == nil && existing.ID != userID {
		return nil, ErrEmailTaken
	}
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}

	current, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if current.IsBlocked {
		return nil, ErrUserBlocked
	}

	storedHash, err := s.users.GetPasswordHash(ctx, userID)
	if err != nil {
		return nil, err
	}
	if storedHash == "" {
		return nil, ErrInvalidCredentials
	}
	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	if normalizeEmail(current.Email) == newEmail {
		return current, nil
	}

	updated, err := s.users.UpdateEmail(ctx, userID, newEmail)
	if err != nil {
		return nil, err
	}
	if s.verification != nil {
		s.verification.SendRegistrationConfirmationBestEffort(ctx, userID, updated.Email, updated.Name)
	}
	return updated, nil
}

func (s *AuthService) UpdateTimezone(ctx context.Context, userID, timezone string) (*model.User, error) {
	timezone = strings.TrimSpace(timezone)
	if err := tzpkg.Validate(timezone); err != nil {
		return nil, ErrInvalidInput
	}

	current, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if current.IsBlocked {
		return nil, ErrUserBlocked
	}
	if current.Timezone == timezone {
		return current, nil
	}

	return s.users.UpdateTimezone(ctx, userID, timezone)
}

func (s *AuthService) ResetPassword(ctx context.Context, token, password string) (*AuthResult, error) {
	if s.passwordReset == nil {
		return nil, ErrPasswordResetInvalid
	}

	userID, err := s.passwordReset.ResetPassword(ctx, token, password)
	if err != nil {
		return nil, err
	}

	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	list, err := s.workspaces.ListForUser(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	var ws *model.Workspace
	if len(list) > 0 {
		ws = &list[0]
	}

	jwtToken, err := s.auth.IssueToken(user.ID, tokenTTL)
	if err != nil {
		return nil, err
	}

	return &AuthResult{Token: jwtToken, User: user, Workspace: ws, Workspaces: list}, nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func validateCredentials(email, password string) error {
	if _, err := mail.ParseAddress(email); err != nil {
		return ErrInvalidInput
	}
	if err := pwdpolicy.Validate(password); err != nil {
		return ErrInvalidInput
	}
	return nil
}

func defaultNameFromEmail(email string) string {
	parts := strings.Split(email, "@")
	if len(parts) > 0 && parts[0] != "" {
		return parts[0]
	}
	return "Пользователь"
}

func slugFromEmail(email string) string {
	base := strings.Split(email, "@")[0]
	base = strings.ToLower(base)
	base = slugSanitizer.ReplaceAllString(base, "-")
	base = strings.Trim(base, "-")
	if base == "" {
		base = "workspace"
	}
	return base
}

func (s *AuthService) uniqueSlug(ctx context.Context, base string) (string, error) {
	slug := base
	for i := 0; i < 100; i++ {
		if i > 0 {
			slug = fmt.Sprintf("%s-%d", base, i)
		}
		exists, err := s.workspaces.SlugExists(ctx, slug)
		if err != nil {
			return "", err
		}
		if !exists {
			return slug, nil
		}
	}
	return "", fmt.Errorf("generate unique slug")
}
