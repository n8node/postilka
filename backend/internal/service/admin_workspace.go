package service

import (
	"context"
	"errors"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

const DeleteAllWorkspacesConfirm = "DELETE_ALL_WORKSPACES"

var ErrDeleteAllConfirmRequired = errors.New("delete all confirmation required")

type AdminWorkspaceService struct {
	workspaces *repository.WorkspaceRepository
	users      *repository.UserRepository
}

func NewAdminWorkspaceService(
	workspaces *repository.WorkspaceRepository,
	users *repository.UserRepository,
) *AdminWorkspaceService {
	return &AdminWorkspaceService{workspaces: workspaces, users: users}
}

func (s *AdminWorkspaceService) Stats(ctx context.Context) (*model.AdminWorkspaceStats, error) {
	return s.workspaces.AdminStats(ctx)
}

func (s *AdminWorkspaceService) List(
	ctx context.Context,
	f repository.ListWorkspacesAdminFilter,
) ([]model.AdminWorkspaceListItem, int, error) {
	return s.workspaces.ListForAdmin(ctx, f)
}

func (s *AdminWorkspaceService) Get(ctx context.Context, workspaceID string) (*model.AdminWorkspaceDetail, error) {
	return s.workspaces.GetAdminDetail(ctx, workspaceID)
}

func (s *AdminWorkspaceService) ListForUser(ctx context.Context, userID string) ([]model.AdminUserWorkspaceItem, error) {
	if _, err := s.users.GetByID(ctx, userID); err != nil {
		return nil, err
	}
	list, err := s.workspaces.ListForUserAdmin(ctx, userID)
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []model.AdminUserWorkspaceItem{}
	}
	return list, nil
}

func (s *AdminWorkspaceService) Delete(ctx context.Context, workspaceID string) error {
	return s.workspaces.DeleteByID(ctx, workspaceID)
}

func (s *AdminWorkspaceService) DeleteAll(ctx context.Context, confirm string) (int, error) {
	if confirm != DeleteAllWorkspacesConfirm {
		return 0, ErrDeleteAllConfirmRequired
	}
	return s.workspaces.DeleteAll(ctx)
}
