package service

import (
	"context"
	"errors"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrCannotModifySelf  = errors.New("cannot modify own account")
	ErrCannotDeleteAdmin = errors.New("cannot delete platform admin")
)

type AdminUserService struct {
	users         *repository.UserRepository
	passwordReset *PasswordResetService
	verification  *EmailVerificationService
}

func (s *AdminUserService) BindPasswordReset(passwordReset *PasswordResetService) {
	s.passwordReset = passwordReset
}

func (s *AdminUserService) BindEmailVerification(verification *EmailVerificationService) {
	s.verification = verification
}

func (s *AdminUserService) ResendVerification(ctx context.Context, userID string) error {
	if s.verification == nil {
		return ErrEmailVerificationInvalid
	}
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if user.IsBlocked || user.EmailVerifiedAt != nil {
		return nil
	}
	target := user.Email
	if user.PendingEmail != "" {
		target = user.PendingEmail
	}
	if !model.IsDeliverableEmail(target) {
		return ErrEmailNotBound
	}
	if user.PendingEmail != "" {
		return s.verification.SendEmailConfirmation(ctx, user.ID, target, user.Name)
	}
	return s.verification.SendRegistrationConfirmation(ctx, user.ID, target, user.Name)
}

func (s *AdminUserService) Approve(ctx context.Context, actorID, targetID string) (*model.User, error) {
	if actorID == targetID {
		return nil, ErrCannotModifySelf
	}
	user, err := s.users.GetByID(ctx, targetID)
	if err != nil {
		return nil, err
	}
	if !user.PendingApproval {
		return user, nil
	}
	user, err = s.users.SetPendingApproval(ctx, targetID, false)
	if err != nil {
		return nil, err
	}
	if s.passwordReset != nil {
		_ = s.passwordReset.SendApprovalLink(ctx, user)
	}
	return user, nil
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
