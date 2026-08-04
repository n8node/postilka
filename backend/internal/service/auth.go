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
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrEmailTaken         = errors.New("email already registered")
	ErrUserBlocked        = errors.New("account blocked")
	ErrInvalidInput       = errors.New("invalid input")
)

const bcryptCost = 12
const tokenTTL = 7 * 24 * time.Hour

var slugSanitizer = regexp.MustCompile(`[^a-z0-9-]+`)

type AuthService struct {
	users       *repository.UserRepository
	workspaces  *repository.WorkspaceRepository
	auth        *middleware.Auth
}

func NewAuthService(users *repository.UserRepository, workspaces *repository.WorkspaceRepository, auth *middleware.Auth) *AuthService {
	return &AuthService{users: users, workspaces: workspaces, auth: auth}
}

type AuthResult struct {
	Token      string
	User       *model.User
	Workspace  *model.Workspace
	Workspaces []model.Workspace
}

func (s *AuthService) Register(ctx context.Context, email, password, name string) (*AuthResult, error) {
	email = normalizeEmail(email)
	if err := validateCredentials(email, password); err != nil {
		return nil, err
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

	user, err := s.users.Create(ctx, email, string(hash), strings.TrimSpace(name))
	if err != nil {
		return nil, err
	}

	slug, err := s.uniqueSlug(ctx, slugFromEmail(email))
	if err != nil {
		return nil, err
	}

	wsName := fmt.Sprintf("Workspace %s", name)
	ws, err := s.workspaces.CreateWithOwner(ctx, wsName, slug, user.ID)
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
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
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

	wsSvc := NewWorkspaceService(s.workspaces)
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
		result, err := s.Register(ctx, email, password, name)
		if err != nil {
			return nil, false, err
		}
		created = true
		if err := s.users.SetPlatformAdmin(ctx, result.User.ID, true); err != nil {
			return nil, false, err
		}
		user, err := s.users.GetByID(ctx, result.User.ID)
		return user, created, err
	}

	user, err := s.users.SetPlatformAdminByEmail(ctx, email, true)
	return user, created, err
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
