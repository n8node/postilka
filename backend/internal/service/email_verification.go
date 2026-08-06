package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"html"
	"log/slog"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrEmailVerificationInvalid = errors.New("invalid or expired verification token")
	ErrEmailAlreadyVerified     = errors.New("email already verified")
)

const emailVerificationTTL = 24 * time.Hour

type EmailVerificationService struct {
	tokens *repository.EmailVerificationRepository
	users  *repository.UserRepository
	email  *EmailService
	cfg    *config.Config
	logger *slog.Logger
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

func (s *EmailVerificationService) SendRegistrationConfirmation(ctx context.Context, userID, email, name string) error {
	if s.email == nil {
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
	if err := s.email.Send(ctx, email, "Postilka — подтвердите регистрацию", body); err != nil {
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
	if user.EmailVerifiedAt != nil {
		_ = s.tokens.MarkUsed(ctx, rec.ID)
		return user.ID, nil
	}

	if err := s.users.SetEmailVerified(ctx, rec.UserID); err != nil {
		return "", err
	}
	if err := s.tokens.MarkUsed(ctx, rec.ID); err != nil {
		return "", err
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
	escapedName := html.EscapeString(displayName)
	escapedURL := html.EscapeString(confirmURL)

	content := fmt.Sprintf(`<div style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1e293b;">Здравствуйте, %s!</div>
<div style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#1e293b;">Спасибо за регистрацию в Postilka. Подтвердите email, чтобы завершить создание аккаунта.</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%%" style="margin:0 0 24px;">
  <tr>
    <td style="padding:16px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;word-break:break-all;">
      <a href="%s" style="color:#2563eb;font-size:14px;line-height:1.6;text-decoration:underline;">%s</a>
    </td>
  </tr>
</table>
<div style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">Ссылка действительна 24 часа. Если вы не регистрировались — просто проигнорируйте это письмо.</div>`,
		escapedName,
		escapedURL,
		escapedURL,
	)

	return EmailBody{
		Preheader:   "Подтвердите email, чтобы завершить регистрацию в Postilka",
		ContentHTML: content,
		CTALabel:    "Подтвердить регистрацию",
		CTAURL:      confirmURL,
	}
}
