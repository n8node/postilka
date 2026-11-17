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
	jobs          *repository.AIGenerationJobRepository
	email         *EmailService
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

func NewAdminUserService(users *repository.UserRepository, jobs *repository.AIGenerationJobRepository, email *EmailService) *AdminUserService {
	return &AdminUserService{users: users, jobs: jobs, email: email}
}

func (s *AdminUserService) SetBlocked(ctx context.Context, actorID, targetID string, blocked bool) (*model.User, error) {
	if actorID == targetID {
		return nil, ErrCannotModifySelf
	}
	target, err := s.users.GetByID(ctx, targetID)
	if err != nil {
		return nil, err
	}
	if target.IsPlatformAdmin {
		return nil, ErrCannotDeleteAdmin
	}
	user, err := s.users.SetBlocked(ctx, targetID, blocked)
	if err != nil {
		return nil, err
	}
	if blocked {
		if s.jobs != nil {
			if cancelErr := s.jobs.CancelActiveForUser(ctx, targetID, "Генерация отменена: аккаунт заблокирован"); cancelErr != nil {
				return nil, cancelErr
			}
		}
		s.sendBlockedEmail(ctx, user)
	}
	return user, nil
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
	if s.jobs != nil {
		if err := s.jobs.CancelActiveForUser(ctx, targetID, "Генерация отменена: аккаунт удалён"); err != nil {
			return err
		}
	}
	return s.users.Delete(ctx, targetID)
}

func (s *AdminUserService) sendBlockedEmail(ctx context.Context, user *model.User) {
	if s.email == nil || user == nil || !user.HasDeliverableEmail() {
		return
	}
	_ = s.email.Send(ctx, user.Email, "Postilka — аккаунт заблокирован", EmailBody{
		ContentHTML: "<p>Здравствуйте, " + user.Name + ".</p><p>Ваш аккаунт Postilka заблокирован в связи с созданием множества аккаунтов для использования бесплатного тарифа.</p><p>Если вы считаете блокировку ошибочной, обратитесь в службу поддержки.</p>",
		Preheader:   "Аккаунт заблокирован",
	})
}
