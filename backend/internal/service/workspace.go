package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrForbidden                 = errors.New("forbidden")
	ErrWorkspaceNotFound         = errors.New("workspace not found")
	ErrNotWorkspaceMember        = errors.New("not a workspace member")
	ErrInvalidWorkspaceName      = errors.New("invalid workspace name")
	ErrWorkspaceLimitReached     = errors.New("workspace limit reached")
	ErrCannotDeleteLastWorkspace = errors.New("cannot delete last workspace")
)

const MaxOwnedWorkspacesPerUser = 20

var wsSlugSanitizer = regexp.MustCompile(`[^a-z0-9-]+`)

const (
	ActiveWorkspaceCookie = "active_workspace_id"
	ActiveWorkspaceHeader = "X-Workspace-Id"
)

type WorkspaceService struct {
	workspaces *repository.WorkspaceRepository
	plans      *repository.PlanRepository
}

func NewWorkspaceService(workspaces *repository.WorkspaceRepository, plans *repository.PlanRepository) *WorkspaceService {
	return &WorkspaceService{workspaces: workspaces, plans: plans}
}

// RequireMembership loads the workspace membership and ensures role >= minRole.
// Use this in every domain service before reading/mutating workspace-scoped resources.
func (s *WorkspaceService) RequireMembership(
	ctx context.Context,
	userID, workspaceID string,
	minRole model.WorkspaceRole,
) (*model.Workspace, error) {
	ws, err := s.workspaces.GetMembership(ctx, workspaceID, userID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotWorkspaceMember
	}
	if err != nil {
		return nil, err
	}
	role := model.WorkspaceRole(ws.Role)
	if !role.AtLeast(minRole) {
		return nil, ErrForbidden
	}
	return ws, nil
}

func (s *WorkspaceService) ListForUser(ctx context.Context, userID string) ([]model.Workspace, error) {
	return s.workspaces.ListForUser(ctx, userID)
}

// ResolveActive picks active workspace: X-Workspace-Id → cookie → primary membership.
func (s *WorkspaceService) ResolveActive(ctx context.Context, userID string, r *http.Request) (*model.Workspace, []model.Workspace, error) {
	list, err := s.workspaces.ListForUser(ctx, userID)
	if err != nil {
		return nil, nil, err
	}
	if len(list) == 0 {
		return nil, list, nil
	}

	preferred := strings.TrimSpace(r.Header.Get(ActiveWorkspaceHeader))
	if preferred == "" {
		if c, err := r.Cookie(ActiveWorkspaceCookie); err == nil {
			preferred = strings.TrimSpace(c.Value)
		}
	}

	if preferred != "" {
		for i := range list {
			if list[i].ID == preferred {
				return &list[i], list, nil
			}
		}
	}

	return &list[0], list, nil
}

func (s *WorkspaceService) SetActive(ctx context.Context, userID, workspaceID string) (*model.Workspace, error) {
	ws, err := s.workspaces.GetMembership(ctx, workspaceID, userID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotWorkspaceMember
	}
	return ws, err
}

// Create adds a new workspace owned by userID and assigns the default free plan.
func (s *WorkspaceService) Create(ctx context.Context, userID, name string) (*model.Workspace, error) {
	name = strings.TrimSpace(name)
	if name == "" || len(name) > 255 {
		return nil, ErrInvalidWorkspaceName
	}

	count, err := s.workspaces.CountOwnedByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	if count >= MaxOwnedWorkspacesPerUser {
		return nil, ErrWorkspaceLimitReached
	}

	slug, err := s.uniqueSlug(ctx, slugFromWorkspaceName(name))
	if err != nil {
		return nil, err
	}

	planID := ""
	if s.plans != nil {
		if free, err := s.plans.GetDefaultFree(ctx); err == nil && free != nil {
			planID = free.ID
		}
	}

	return s.workspaces.CreateWithOwner(ctx, name, slug, userID, planID)
}

func slugFromWorkspaceName(name string) string {
	base := strings.ToLower(name)
	base = wsSlugSanitizer.ReplaceAllString(base, "-")
	base = strings.Trim(base, "-")
	if base == "" {
		base = "workspace"
	}
	return base
}

func (s *WorkspaceService) uniqueSlug(ctx context.Context, base string) (string, error) {
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

func (s *WorkspaceService) uniqueSlugForUpdate(ctx context.Context, base, workspaceID string) (string, error) {
	slug := base
	for i := 0; i < 100; i++ {
		if i > 0 {
			slug = fmt.Sprintf("%s-%d", base, i)
		}
		exists, err := s.workspaces.SlugExistsExcept(ctx, slug, workspaceID)
		if err != nil {
			return "", err
		}
		if !exists {
			return slug, nil
		}
	}
	return "", fmt.Errorf("generate unique slug")
}

// Update renames a workspace (admin+).
func (s *WorkspaceService) Update(ctx context.Context, userID, workspaceID, name string) (*model.Workspace, error) {
	name = strings.TrimSpace(name)
	if name == "" || len(name) > 255 {
		return nil, ErrInvalidWorkspaceName
	}

	if _, err := s.RequireMembership(ctx, userID, workspaceID, model.RoleAdmin); err != nil {
		return nil, err
	}

	slug, err := s.uniqueSlugForUpdate(ctx, slugFromWorkspaceName(name), workspaceID)
	if err != nil {
		return nil, err
	}

	if err := s.workspaces.UpdateNameAndSlug(ctx, workspaceID, name, slug); err != nil {
		return nil, err
	}

	return s.workspaces.GetMembership(ctx, workspaceID, userID)
}

// Delete removes a workspace owned by the caller. Cannot delete the user's last workspace.
func (s *WorkspaceService) Delete(ctx context.Context, userID, workspaceID string) ([]model.Workspace, error) {
	ws, err := s.RequireMembership(ctx, userID, workspaceID, model.RoleOwner)
	if err != nil {
		return nil, err
	}
	if ws.OwnerID != userID {
		return nil, ErrForbidden
	}

	count, err := s.workspaces.CountMembershipsForUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	if count <= 1 {
		return nil, ErrCannotDeleteLastWorkspace
	}

	if err := s.workspaces.DeleteByID(ctx, workspaceID); err != nil {
		return nil, err
	}

	return s.workspaces.ListForUser(ctx, userID)
}

func (s *WorkspaceService) ListMembers(ctx context.Context, userID, workspaceID string) ([]model.WorkspaceMember, error) {
	if _, err := s.RequireMembership(ctx, userID, workspaceID, model.RoleViewer); err != nil {
		return nil, err
	}
	return s.workspaces.ListMembers(ctx, workspaceID)
}

func SetActiveWorkspaceCookie(w http.ResponseWriter, workspaceID string, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     ActiveWorkspaceCookie,
		Value:    workspaceID,
		Path:     "/",
		MaxAge:   int((365 * 24 * time.Hour).Seconds()),
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})
}

func ClearActiveWorkspaceCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     ActiveWorkspaceCookie,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}
