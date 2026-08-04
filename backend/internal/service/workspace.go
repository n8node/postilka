package service

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrForbidden          = errors.New("forbidden")
	ErrWorkspaceNotFound  = errors.New("workspace not found")
	ErrNotWorkspaceMember = errors.New("not a workspace member")
)

const (
	ActiveWorkspaceCookie = "active_workspace_id"
	ActiveWorkspaceHeader = "X-Workspace-Id"
)

type WorkspaceService struct {
	workspaces *repository.WorkspaceRepository
}

func NewWorkspaceService(workspaces *repository.WorkspaceRepository) *WorkspaceService {
	return &WorkspaceService{workspaces: workspaces}
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
