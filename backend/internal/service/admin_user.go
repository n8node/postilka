package service

import (
	"context"
	"errors"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrCannotModifySelf      = errors.New("cannot modify own account")
	ErrCannotDeleteAdmin     = errors.New("cannot delete platform admin")
)

type AdminUserService struct {
	users *repository.UserRepository
}

func NewAdminUserService(users *repository.UserRepository) *AdminUserService {
	return &AdminUserService{users: users}
}

func (s *AdminUserService) SetBlocked(ctx context.Context, actorID, targetID string, blocked bool) (*model.User, error) {
	if actorID == targetID {
		return nil, ErrCannotModifySelf
	}
	return s.users.SetBlocked(ctx, targetID, blocked)
}

func (s *AdminUserService) Delete(ctx context.Context, actorID, targetID string) error {
	if actorID == targetID {
		return ErrCannotModifySelf
	}
	target, err := s.users.GetByID(ctx, targetID)
	if errors.Is(err, repository.ErrNotFound) {
		return repository.ErrNotFound
	}
	if err != nil {
		return err
	}
	if target.IsPlatformAdmin {
		return ErrCannotDeleteAdmin
	}
	return s.users.Delete(ctx, targetID)
}
