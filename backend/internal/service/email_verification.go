package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrEmailVerificationInvalid = errors.New("invalid or expired verification token")
	ErrEmailAlreadyVerified     = errors.New("email already verified")
)

const emailVerificationTTL = 24 * time.Hour

type EmailVerificationService struct {
	tokens   *repository.EmailVerificationRepository
	users    *repository.UserRepository
	email    *EmailService
	cfg      *config.Config
	logger   *slog.Logger
	telegram *TelegramService
}

func NewEmailVerificationService(
	tokens *repository.EmailVerificationRepository,
	users *repository.UserRepository,
	email *EmailService,
	cfg *config.Config,
	logger *slog.Logger,
) *EmailVerificationService {
	return &EmailVerificationService{
		tokens: tokens,
		users:  users,
		email:  email,
		cfg:    cfg,
		logger: logger,
	}
}

func (s *EmailVerificationService) BindTelegram(telegram *TelegramService) {
	s.telegram = telegram
}

func (s *EmailVerificationService) SendRegistrationConfirmation(ctx context.Context, userID, email, name string) error {
	return s.sendConfirmation(ctx, userID, email, name, false)
}

func (s *EmailVerificationService) SendEmailConfirmation(ctx context.Context, userID, email, name string) error {
	return s.sendConfirmation(ctx, userID, email, name, true)
}

func (s *EmailVerificationService) sendConfirmation(ctx context.Context, userID, email, name string, bind bool) error {
	if s.email == nil {
		return nil
	}
	if !model.IsDeliverableEmail(email) {
		return nil
	}

	token, tokenHash, err := newVerificationToken()
	if err != nil {
		return err
	}

	if err := s.tokens.InvalidateActiveForUser(ctx, userID); err != nil {
		return err
	}
	if err := s.tokens.Create(ctx, userID, tokenHash, time.Now().Add(emailVerificationTTL)); err != nil {
		return err
	}

	confirmURL := registrationConfirmURL(s.cfg.PublicAppURLNormalized(), token)
	body := RegistrationConfirmationEmailBody(name, confirmURL)
	subject := "Postilka — подтвердите регистрацию"
	if bind {
		body = EmailBindConfirmationEmailBody(name, confirmURL)
		subject = "Postilka — подтвердите email"
	}
	if err := s.email.Send(ctx, email, subject, body); err != nil {
		return err
	}
	return nil
}

func (s *EmailVerificationService) SendRegistrationConfirmationBestEffort(ctx context.Context, userID, email, name string) {
	if err := s.SendRegistrationConfirmation(ctx, userID, email, name); err != nil {
		if s.logger != nil {
			s.logger.Warn("registration confirmation email failed", "user_id", userID, "email", email, "error", err)
		}
	}
}

func (s *EmailVerificationService) SendEmailConfirmationBestEffort(ctx context.Context, userID, email, name string) {
	if err := s.SendEmailConfirmation(ctx, userID, email, name); err != nil {
		if s.logger != nil {
			s.logger.Warn("email confirmation failed", "user_id", userID, "email", email, "error", err)
		}
	}
}

func (s *EmailVerificationService) Verify(ctx context.Context, rawToken string) (string, error) {
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" {
		return "", ErrEmailVerificationInvalid
	}

	tokenHash := hashVerificationToken(rawToken)
	rec, err := s.tokens.FindValid(ctx, tokenHash)
	if errors.Is(err, repository.ErrNotFound) {
		return "", ErrEmailVerificationInvalid
	}
	if err != nil {
		return "", err
	}

	user, err := s.users.GetByID(ctx, rec.UserID)
	if err != nil {
		return "", err
	}

	pending := strings.TrimSpace(user.PendingEmail)
	if pending != "" {
		if !model.IsDeliverableEmail(pending) {
			return "", ErrEmailVerificationInvalid
		}
		taken, err := s.users.EmailTakenByOther(ctx, pending, user.ID)
		if err != nil {
			return "", err
		}
		if taken {
			return "", ErrEmailTaken
		}
		if _, err := s.users.ApplyPendingEmail(ctx, user.ID); err != nil {
			if isUniqueViolation(err) {
				return "", ErrEmailTaken
			}
			return "", err
		}
	} else if user.EmailVerifiedAt != nil {
		_ = s.tokens.MarkUsed(ctx, rec.ID)
		return user.ID, nil
	} else {
		if err := s.users.SetEmailVerified(ctx, rec.UserID); err != nil {
			return "", err
		}
	}

	if err := s.tokens.MarkUsed(ctx, rec.ID); err != nil {
		return "", err
	}
	if s.telegram != nil {
		if verified, err := s.users.GetByID(ctx, rec.UserID); err == nil {
			s.telegram.NotifyEmailVerified(ctx, verified)
		}
	}
	return rec.UserID, nil
}

func newVerificationToken() (string, []byte, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", nil, err
	}
	token := hex.EncodeToString(buf)
	return token, hashVerificationToken(token), nil
}

func hashVerificationToken(token string) []byte {
	sum := sha256.Sum256([]byte(token))
	return sum[:]
}

func registrationConfirmURL(publicAppURL, token string) string {
	return fmt.Sprintf("%s/auth/verify-email?token=%s", strings.TrimSuffix(publicAppURL, "/"), token)
}

func RegistrationConfirmationEmailBody(name, confirmURL string) EmailBody {
	displayName := strings.TrimSpace(name)
	if displayName == "" {
		displayName = "друг"
	}

	content := emailGreetingRow(displayName) +
		emailParagraphRow("Спасибо за регистрацию в Postilka. Вы уже можете войти в кабинет. Подтвердите email, чтобы публиковать посты, пополнять счёт и оплачивать тариф.") +
		emailLinkBoxRow(confirmURL) +
		emailNoteRow("Ссылка действительна 24 часа. Если вы не регистрировались — просто проигнорируйте это письмо.")

	return EmailBody{
		Preheader:   "Подтвердите email, чтобы публиковать посты и оплачивать тариф в Postilka",
		ContentHTML: content,
		CTALabel:    "Подтвердить email",
		CTAURL:      confirmURL,
	}
}

func EmailBindConfirmationEmailBody(name, confirmURL string) EmailBody {
	displayName := strings.TrimSpace(name)
	if displayName == "" {
		displayName = "друг"
	}

	content := emailGreetingRow(displayName) +
		emailParagraphRow("Подтвердите этот адрес, чтобы привязать его к аккаунту Postilka. После подтверждения уведомления будут приходить сюда.") +
		emailLinkBoxRow(confirmURL) +
		emailNoteRow("Ссылка действительна 24 часа. Если вы не запрашивали привязку email — проигнорируйте письмо.")

	return EmailBody{
		Preheader:   "Подтвердите email, чтобы получать уведомления Postilka",
		ContentHTML: content,
		CTALabel:    "Подтвердить email",
		CTAURL:      confirmURL,
	}
}
