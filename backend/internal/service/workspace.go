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
	ErrAlreadyMember             = errors.New("already a workspace member")
	ErrCannotManageOwner         = errors.New("cannot manage workspace owner")
	ErrCannotManageSelf          = errors.New("cannot change own membership")
	ErrCannotLeaveAsOwner        = errors.New("owner cannot leave workspace")
	ErrInvalidMemberStatus       = errors.New("invalid member status")
	ErrMemberNotFound            = errors.New("workspace member not found")
	ErrSeatQuotaExceeded         = errors.New("workspace seat quota exceeded")
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

func (s *WorkspaceService) SeatSnapshot(ctx context.Context, userID, workspaceID string) (*model.WorkspaceSeatSnapshot, error) {
	if _, err := s.RequireMembership(ctx, userID, workspaceID, model.RoleViewer); err != nil {
		return nil, err
	}
	return s.seatSnapshot(ctx, workspaceID)
}

func (s *WorkspaceService) seatSnapshot(ctx context.Context, workspaceID string) (*model.WorkspaceSeatSnapshot, error) {
	used, err := s.workspaces.CountActiveMembers(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	pending, err := s.workspaces.CountPendingInvites(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	snap := &model.WorkspaceSeatSnapshot{Used: used, Pending: pending}
	plan, err := s.planForWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	if plan != nil {
		snap.Limit = plan.MaxSeats
	}
	return snap, nil
}

func canManageMember(actor, target model.WorkspaceRole) bool {
	return actor.Rank() > target.Rank()
}

func (s *WorkspaceService) UpdateMember(
	ctx context.Context,
	actorID, workspaceID, targetUserID string,
	role *model.WorkspaceRole,
	status *model.MemberStatus,
) (*model.WorkspaceMember, error) {
	actor, err := s.RequireMembership(ctx, actorID, workspaceID, model.RoleAdmin)
	if err != nil {
		return nil, err
	}
	if targetUserID == actorID {
		return nil, ErrCannotManageSelf
	}

	target, err := s.workspaces.GetMember(ctx, workspaceID, targetUserID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrMemberNotFound
	}
	if err != nil {
		return nil, err
	}
	if target.Role == model.RoleOwner {
		return nil, ErrCannotManageOwner
	}
	if !canManageMember(model.WorkspaceRole(actor.Role), target.Role) {
		return nil, ErrForbidden
	}

	if role != nil {
		if *role == model.RoleOwner || *role == "" {
			return nil, ErrInvalidInput
		}
		if !canManageMember(model.WorkspaceRole(actor.Role), *role) && *role != target.Role {
			return nil, ErrForbidden
		}
		if err := s.workspaces.SetMemberRole(ctx, workspaceID, targetUserID, *role); err != nil {
			return nil, err
		}
	}

	if status != nil {
		switch *status {
		case model.MemberActive, model.MemberSuspended:
		default:
			return nil, ErrInvalidMemberStatus
		}
		if *status == model.MemberActive && target.Status != model.MemberActive {
			if err := s.CheckSeatRoom(ctx, workspaceID, 1); err != nil {
				return nil, err
			}
		}
		if err := s.workspaces.SetMemberStatus(ctx, workspaceID, targetUserID, *status); err != nil {
			return nil, err
		}
	}

	return s.memberByUserID(ctx, workspaceID, targetUserID)
}

func (s *WorkspaceService) RemoveMember(ctx context.Context, actorID, workspaceID, targetUserID string) error {
	actor, err := s.RequireMembership(ctx, actorID, workspaceID, model.RoleAdmin)
	if err != nil {
		return err
	}
	if targetUserID == actorID {
		return ErrCannotManageSelf
	}
	target, err := s.workspaces.GetMember(ctx, workspaceID, targetUserID)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrMemberNotFound
	}
	if err != nil {
		return err
	}
	if target.Role == model.RoleOwner {
		return ErrCannotManageOwner
	}
	if !canManageMember(model.WorkspaceRole(actor.Role), target.Role) {
		return ErrForbidden
	}
	return s.workspaces.RemoveMember(ctx, workspaceID, targetUserID)
}

func (s *WorkspaceService) Leave(ctx context.Context, userID, workspaceID string) ([]model.Workspace, error) {
	ws, err := s.RequireMembership(ctx, userID, workspaceID, model.RoleViewer)
	if err != nil {
		return nil, err
	}
	if model.WorkspaceRole(ws.Role) == model.RoleOwner || ws.OwnerID == userID {
		return nil, ErrCannotLeaveAsOwner
	}
	if err := s.workspaces.RemoveMember(ctx, workspaceID, userID); err != nil {
		return nil, err
	}
	return s.workspaces.ListForUser(ctx, userID)
}

func (s *WorkspaceService) TransferOwnership(ctx context.Context, actorID, workspaceID, targetUserID string) (*model.WorkspaceMember, error) {
	ws, err := s.RequireMembership(ctx, actorID, workspaceID, model.RoleOwner)
	if err != nil {
		return nil, err
	}
	if ws.OwnerID != actorID {
		return nil, ErrForbidden
	}
	if targetUserID == actorID {
		return nil, ErrCannotManageSelf
	}
	target, err := s.workspaces.GetMember(ctx, workspaceID, targetUserID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrMemberNotFound
	}
	if err != nil {
		return nil, err
	}
	if target.Status != model.MemberActive {
		return nil, ErrNotWorkspaceMember
	}
	if err := s.workspaces.TransferOwnership(ctx, workspaceID, actorID, targetUserID); err != nil {
		return nil, err
	}
	return s.memberByUserID(ctx, workspaceID, targetUserID)
}

func (s *WorkspaceService) memberByUserID(ctx context.Context, workspaceID, userID string) (*model.WorkspaceMember, error) {
	members, err := s.workspaces.ListMembers(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	for i := range members {
		if members[i].UserID == userID {
			return &members[i], nil
		}
	}
	return nil, ErrMemberNotFound
}

func (s *WorkspaceService) CheckSeatRoom(ctx context.Context, workspaceID string, extra int) error {
	snap, err := s.seatSnapshot(ctx, workspaceID)
	if err != nil {
		return err
	}
	if snap.Limit == nil {
		return nil
	}
	if snap.Used+snap.Pending+extra > *snap.Limit {
		return ErrSeatQuotaExceeded
	}
	return nil
}

func (s *WorkspaceService) IsActiveMember(ctx context.Context, workspaceID, userID string) (bool, error) {
	_, err := s.workspaces.GetMembership(ctx, workspaceID, userID)
	if errors.Is(err, repository.ErrNotFound) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (s *WorkspaceService) planForWorkspace(ctx context.Context, workspaceID string) (*model.Plan, error) {
	if s.plans == nil {
		return nil, nil
	}
	planID, _, err := s.workspaces.GetPlanMeta(ctx, workspaceID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return s.plans.GetDefaultFree(ctx)
		}
		return nil, err
	}
	plan, err := s.plans.GetByID(ctx, planID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return s.plans.GetDefaultFree(ctx)
		}
		return nil, err
	}
	return plan, nil
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
