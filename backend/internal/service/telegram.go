package service

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
)

var (
	ErrTelegramDisabled      = errors.New("telegram notifications disabled")
	ErrTelegramNotConfigured = errors.New("telegram bot not configured")
)

type RegistrationNotifyMeta struct {
	InviteCode  string
	InviteScope string
	InviteOwner string
}

func (s *TelegramService) SendTest(ctx context.Context) (bool, string) {
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil {
		return false, err.Error()
	}
	if !cfg.Enabled {
		return false, "Включите Telegram-уведомления в настройках"
	}
	if strings.TrimSpace(cfg.BotToken) == "" || strings.TrimSpace(cfg.ChatID) == "" {
		return false, "Укажите токен бота и ID чата"
	}
	text := "✅ Тестовое сообщение Postilka\nБот подключён и может отправлять уведомления в этот чат."
	if err := s.send(ctx, cfg, text); err != nil {
		return false, err.Error()
	}
	s.triggerHealthCheck()
	return true, "Тестовое сообщение отправлено"
}

func (s *TelegramService) NotifyRegistration(ctx context.Context, user *model.User, meta RegistrationNotifyMeta) {
	if user == nil {
		return
	}
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil || !cfg.Enabled || !cfg.NotifyRegistration {
		return
	}
	vars := map[string]string{
		"email":       user.Email,
		"name":        displayTelegramName(user.Name, user.Email),
		"inviteCode":  strings.TrimSpace(meta.InviteCode),
		"inviteScope": strings.TrimSpace(meta.InviteScope),
		"inviteOwner": strings.TrimSpace(meta.InviteOwner),
	}
	text := applyTelegramTemplate(cfg.RegistrationTemplate, vars)
	s.dispatchAdminNotification(ctx, text, "registration")
}

func (s *TelegramService) NotifyEmailVerified(ctx context.Context, user *model.User) {
	if user == nil {
		return
	}
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil || !cfg.Enabled || !cfg.NotifyEmailVerified {
		return
	}
	vars := map[string]string{
		"email": user.Email,
		"name":  displayTelegramName(user.Name, user.Email),
	}
	text := applyTelegramTemplate(cfg.EmailVerifiedTemplate, vars)
	s.dispatchAdminNotification(ctx, text, "email_verified")
}

func (s *TelegramService) NotifyPayment(ctx context.Context, user *model.User, plan *model.Plan, amountCents int) {
	if user == nil || plan == nil {
		return
	}
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil || !cfg.Enabled || !cfg.NotifyPayment {
		return
	}
	vars := map[string]string{
		"userEmail": user.Email,
		"userName":  displayTelegramName(user.Name, user.Email),
		"planName":  plan.Name,
		"amount":    FormatRubOutSum(amountCents),
		"currency":  "₽",
	}
	text := applyTelegramTemplate(cfg.PaymentTemplate, vars)
	s.dispatchAdminNotification(ctx, text, "payment")
}

func (s *TelegramService) NotifyWalletTopup(ctx context.Context, user *model.User, amountCents int, balanceCents int64) {
	if user == nil {
		return
	}
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil || !cfg.Enabled || !cfg.NotifyWalletTopup {
		return
	}
	vars := map[string]string{
		"userEmail": user.Email,
		"userName":  displayTelegramName(user.Name, user.Email),
		"amount":    FormatRubOutSum(amountCents),
		"balance":   FormatRubOutSum(int(balanceCents)),
		"currency":  "₽",
	}
	text := applyTelegramTemplate(cfg.WalletTopupTemplate, vars)
	s.dispatchAdminNotification(ctx, text, "wallet_topup")
}

func (s *TelegramService) dispatchAdminNotification(ctx context.Context, text, kind string) {
	if strings.TrimSpace(text) == "" {
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cfg, cfgErr := s.settings.GetEffective(ctx)
		if cfgErr == nil && cfg.Enabled {
			if err := s.send(ctx, cfg, text); err == nil {
				return
			} else {
				slog.Warn("telegram direct send failed, enqueueing for retry", "kind", kind, "err", err)
			}
		}

		if err := s.enqueueTelegramNotification(ctx, kind, text, map[string]any{"kind": kind}); err != nil {
			if errors.Is(err, ErrTelegramQueueUnavailable) {
				if cfgErr == nil && cfg.Enabled {
					if sendErr := s.send(ctx, cfg, text); sendErr != nil {
						slog.Warn("telegram notification failed", "kind", kind, "err", sendErr)
					}
				}
			} else {
				slog.Warn("telegram queue enqueue failed", "kind", kind, "err", err)
			}
		}
	}()
}

func (s *TelegramService) send(ctx context.Context, cfg model.TelegramSettings, text string) error {
	token := strings.TrimSpace(cfg.BotToken)
	chatID := strings.TrimSpace(cfg.ChatID)
	if token == "" || chatID == "" {
		return ErrTelegramNotConfigured
	}
	if strings.TrimSpace(text) == "" {
		return errors.New("empty message")
	}
	return s.telegramSendMessage(ctx, token, chatID, text)
}

// SendDigestMessage posts an HTML ops digest into a forum topic, bypassing the notification queue.
func (s *TelegramService) SendDigestMessage(ctx context.Context, chatID, text string, topicID int) error {
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil {
		return err
	}
	token := strings.TrimSpace(cfg.BotToken)
	chatID = strings.TrimSpace(chatID)
	if token == "" || chatID == "" {
		return ErrTelegramNotConfigured
	}
	if strings.TrimSpace(text) == "" {
		return errors.New("empty message")
	}
	return s.telegramSendThreadHTML(ctx, token, chatID, text, topicID)
}

func applyTelegramTemplate(tpl string, vars map[string]string) string {
	out := tpl
	for k, v := range vars {
		out = strings.ReplaceAll(out, "{"+k+"}", v)
	}
	lines := strings.Split(out, "\n")
	filtered := make([]string, 0, len(lines))
	for _, line := range lines {
		if strings.Contains(line, "{") && strings.Contains(line, "}") {
			continue
		}
		filtered = append(filtered, line)
	}
	return strings.TrimSpace(strings.Join(filtered, "\n"))
}

func displayTelegramName(name, email string) string {
	name = strings.TrimSpace(name)
	if name != "" {
		return name
	}
	email = strings.TrimSpace(email)
	if at := strings.Index(email, "@"); at > 0 {
		return email[:at]
	}
	return email
}
