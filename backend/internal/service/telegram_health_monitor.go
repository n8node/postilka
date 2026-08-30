package service

import (
	"context"
	"fmt"
	"html"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

const (
	telegramSelfTestInterval      = 30 * time.Minute
	telegramSelfTestStartupDelay  = 2 * time.Minute
	telegramSelfTestCheckTimeout  = 45 * time.Second
)

// TelegramHealthMonitor runs periodic Telegram/proxy self-diagnostics.
// Every 30 minutes it sends a status report to the admin Telegram chat.
// On bot/proxy failure it emails platform admins.
type TelegramHealthMonitor struct {
	telegram *TelegramService
	email    *EmailService
	users    *repository.UserRepository
	cfg      *config.Config
	logger   *slog.Logger

	mu      sync.Mutex
	started bool
	stopCh  chan struct{}
}

func NewTelegramHealthMonitor(
	telegram *TelegramService,
	email *EmailService,
	users *repository.UserRepository,
	cfg *config.Config,
	logger *slog.Logger,
) *TelegramHealthMonitor {
	if logger == nil {
		logger = slog.Default()
	}
	return &TelegramHealthMonitor{
		telegram: telegram,
		email:    email,
		users:    users,
		cfg:      cfg,
		logger:   logger,
	}
}

func (m *TelegramHealthMonitor) Start() {
	m.mu.Lock()
	if m.started {
		m.mu.Unlock()
		return
	}
	m.started = true
	m.stopCh = make(chan struct{})
	m.mu.Unlock()

	m.logger.Info("telegram health monitor starting", "interval", telegramSelfTestInterval.String())
	go m.loop()
}

func (m *TelegramHealthMonitor) Stop() {
	m.mu.Lock()
	if !m.started {
		m.mu.Unlock()
		return
	}
	close(m.stopCh)
	m.started = false
	m.mu.Unlock()
	m.logger.Info("telegram health monitor stopped")
}

func (m *TelegramHealthMonitor) loop() {
	timer := time.NewTimer(telegramSelfTestStartupDelay)
	defer timer.Stop()

	select {
	case <-m.stopCh:
		return
	case <-timer.C:
		m.runCheck()
	}

	ticker := time.NewTicker(telegramSelfTestInterval)
	defer ticker.Stop()

	for {
		select {
		case <-m.stopCh:
			return
		case <-ticker.C:
			m.runCheck()
		}
	}
}

func (m *TelegramHealthMonitor) runCheck() {
	if m.telegram == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), telegramSelfTestCheckTimeout)
	defer cancel()

	cfg, err := m.telegram.settings.GetEffective(ctx)
	if err != nil || !cfg.Enabled {
		return
	}

	st := m.telegram.RunHealthCheck(ctx)
	diagnostic := formatTelegramSelfTestMessage(st, cfg, m.telegram.localProxy, m.adminURL())

	if err := m.telegram.SendDirectAdminHealthMessage(ctx, diagnostic); err != nil {
		m.logger.Warn("telegram self-test message failed", "err", err, "status", st.Status)
	} else {
		m.logger.Info("telegram self-test message sent", "status", st.Status)
	}

	if !isTelegramHealthUnhealthy(st) {
		return
	}

	m.logger.Warn(
		"telegram self-test unhealthy",
		"status", st.Status,
		"error", st.LastError,
	)

	emails, err := m.users.ListPlatformAdminEmails(ctx)
	if err != nil {
		m.logger.Warn("telegram health alert: list platform admins failed", "err", err)
		return
	}
	if len(emails) == 0 {
		m.logger.Warn("telegram health alert: no platform admin emails")
		return
	}
	if m.email == nil {
		m.logger.Warn("telegram health alert: email service unavailable")
		return
	}

	subject, body := telegramHealthAlertEmail(st, cfg, m.adminURL())
	for _, to := range emails {
		if err := m.email.Send(ctx, to, subject, body); err != nil {
			m.logger.Warn("telegram health alert email failed", "to", to, "err", err)
		}
	}
}

func (m *TelegramHealthMonitor) adminURL() string {
	if m.cfg == nil {
		return "https://postilka.ru/app/admin/telegram"
	}
	base := strings.TrimSuffix(m.cfg.PublicAppURLNormalized(), "/")
	return base + "/admin/telegram"
}

func isTelegramHealthUnhealthy(st model.TelegramBotRuntimeStatus) bool {
	switch st.Status {
	case model.TelegramBotStatusOffline, model.TelegramBotStatusMisconfigured:
		return true
	default:
		return false
	}
}

func formatTelegramSelfTestMessage(
	st model.TelegramBotRuntimeStatus,
	cfg model.TelegramSettings,
	localProxyHop string,
	adminURL string,
) string {
	now := time.Now().UTC().Format("02.01.2006 15:04 UTC")
	lines := []string{
		"🔍 Postilka — самодиагностика Telegram",
		"",
		"🕐 " + now,
		"🤖 " + telegramSelfTestBotLine(st),
		"🌐 " + telegramSelfTestProxyLine(cfg, localProxyHop),
	}
	if st.LastError != "" {
		lines = append(lines, "⚠️ "+st.LastError)
	}
	lines = append(lines, "", adminURL)
	return strings.Join(lines, "\n")
}

func telegramSelfTestBotLine(st model.TelegramBotRuntimeStatus) string {
	switch st.Status {
	case model.TelegramBotStatusOnline:
		if st.BotUsername != "" {
			return "Бот: ✅ @" + st.BotUsername
		}
		return "Бот: ✅ " + st.Message
	case model.TelegramBotStatusDisabled:
		return "Бот: ⏸ уведомления отключены"
	case model.TelegramBotStatusMisconfigured:
		return "Бот: ❌ " + st.Message
	default:
		if st.Message != "" {
			return "Бот: ❌ " + st.Message
		}
		return "Бот: ❌ недоступен"
	}
}

func telegramSelfTestProxyLine(cfg model.TelegramSettings, localProxyHop string) string {
	if !cfg.ProxyEnabled {
		return "Прокси: выключен"
	}
	active := strings.TrimSpace(cfg.ProxyActiveURL)
	if active == "" && len(cfg.ProxyURLs) > 0 {
		active = cfg.ProxyURLs[0]
	}
	line := "Прокси: вкл"
	if active != "" {
		line += " → " + maskProxyURLForError(active)
	}
	hop := strings.TrimSpace(localProxyHop)
	if hop != "" {
		line += " (hop " + maskProxyURLForError(hop) + ")"
	}
	return line
}

func telegramHealthAlertEmail(
	st model.TelegramBotRuntimeStatus,
	cfg model.TelegramSettings,
	adminURL string,
) (subject string, body EmailBody) {
	now := time.Now().UTC().Format("02.01.2006 15:04 UTC")
	subject = "⚠️ Postilka — Telegram-бот или прокси недоступны"

	details := html.EscapeString(st.Message)
	if st.LastError != "" {
		details += "<br><br><strong>Ошибка:</strong> " + html.EscapeString(st.LastError)
	}
	proxyLine := html.EscapeString(telegramSelfTestProxyLine(cfg, ""))

	content := emailParagraphRow("Самодиагностика Telegram-уведомлений Postilka обнаружила проблему.") +
		emailParagraphRow(fmt.Sprintf("<strong>Время проверки:</strong> %s", html.EscapeString(now))) +
		emailParagraphRow(fmt.Sprintf("<strong>Бот:</strong> %s", html.EscapeString(telegramSelfTestBotLine(st)))) +
		emailParagraphRow(fmt.Sprintf("<strong>%s</strong>", proxyLine)) +
		emailParagraphRow(details) +
		emailNoteRow("Проверьте бота, прокси (gost :8889 и upstream в .env) и настройки в админке.")

	body = EmailBody{
		Preheader:   "Postilka: сбой Telegram-бота или прокси",
		ContentHTML: content,
		CTALabel:    "Открыть настройки Telegram",
		CTAURL:      adminURL,
	}
	return subject, body
}
