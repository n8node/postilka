package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/repository"
	pwdpolicy "github.com/postilka/postilka/internal/password"
	"golang.org/x/crypto/bcrypt"
)

var ErrPasswordResetInvalid = errors.New("invalid or expired password reset token")

const passwordResetTTL = time.Hour

type PasswordResetService struct {
	tokens *repository.PasswordResetRepository
	users  *repository.UserRepository
	email  *EmailService
	cfg    *config.Config
	logger *slog.Logger
}

func NewPasswordResetService(
	tokens *repository.PasswordResetRepository,
	users *repository.UserRepository,
	email *EmailService,
	cfg *config.Config,
	logger *slog.Logger,
) *PasswordResetService {
	return &PasswordResetService{
		tokens: tokens,
		users:  users,
		email:  email,
		cfg:    cfg,
		logger: logger,
	}
}

func (s *PasswordResetService) RequestReset(ctx context.Context, email string) {
	email = normalizeEmail(email)
	if email == "" || s.email == nil {
		return
	}

	user, hash, err := s.users.GetByEmail(ctx, email)
	if errors.Is(err, repository.ErrNotFound) {
		return
	}
	if err != nil {
		if s.logger != nil {
			s.logger.Warn("password reset lookup failed", "email", email, "error", err)
		}
		return
	}
	if user.IsBlocked || hash == "" {
		return
	}

	token, tokenHash, err := newVerificationToken()
	if err != nil {
		if s.logger != nil {
			s.logger.Warn("password reset token generation failed", "user_id", user.ID, "error", err)
		}
		return
	}

	if err := s.tokens.InvalidateActiveForUser(ctx, user.ID); err != nil {
		if s.logger != nil {
			s.logger.Warn("password reset invalidate failed", "user_id", user.ID, "error", err)
		}
		return
	}
	if err := s.tokens.Create(ctx, user.ID, tokenHash, time.Now().Add(passwordResetTTL)); err != nil {
		if s.logger != nil {
			s.logger.Warn("password reset token create failed", "user_id", user.ID, "error", err)
		}
		return
	}

	resetURL := passwordResetURL(s.cfg.PublicAppURLNormalized(), token)
	body := PasswordResetEmailBody(user.Name, resetURL)
	if err := s.email.Send(ctx, user.Email, "Postilka — восстановление пароля", body); err != nil {
		if s.logger != nil {
			s.logger.Warn("password reset email failed", "user_id", user.ID, "email", user.Email, "error", err)
		}
	}
}

func (s *PasswordResetService) ResetPassword(ctx context.Context, rawToken, password string) (string, error) {
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" {
		return "", ErrPasswordResetInvalid
	}
	if err := validatePasswordOnly(password); err != nil {
		return "", err
	}

	tokenHash := hashVerificationToken(rawToken)
	rec, err := s.tokens.FindValid(ctx, tokenHash)
	if errors.Is(err, repository.ErrNotFound) {
		return "", ErrPasswordResetInvalid
	}
	if err != nil {
		return "", err
	}

	user, err := s.users.GetByID(ctx, rec.UserID)
	if err != nil {
		return "", err
	}
	if user.IsBlocked {
		return "", ErrUserBlocked
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", err
	}
	if err := s.users.UpdatePasswordHash(ctx, rec.UserID, string(hash)); err != nil {
		return "", err
	}
	if err := s.tokens.MarkUsed(ctx, rec.ID); err != nil {
		return "", err
	}
	return rec.UserID, nil
}

func passwordResetURL(publicAppURL, token string) string {
	return fmt.Sprintf("%s/auth/reset-password?token=%s", strings.TrimSuffix(publicAppURL, "/"), token)
}

func PasswordResetEmailBody(name, resetURL string) EmailBody {
	displayName := strings.TrimSpace(name)
	if displayName == "" {
		displayName = "друг"
	}

	content := emailGreetingRow(displayName) +
		emailParagraphRow("Мы получили запрос на восстановление пароля в Postilka. Перейдите по ссылке ниже, чтобы задать новый пароль.") +
		emailLinkBoxRow(resetURL) +
		emailNoteRow("Ссылка действительна 1 час. Если вы не запрашивали восстановление — просто проигнорируйте это письмо.")

	return EmailBody{
		Preheader:   "Восстановите пароль в Postilka",
		ContentHTML: content,
		CTALabel:    "Восстановить пароль",
		CTAURL:      resetURL,
	}
}

func validatePasswordOnly(password string) error {
	if err := pwdpolicy.Validate(password); err != nil {
		return ErrInvalidInput
	}
	return nil
}
