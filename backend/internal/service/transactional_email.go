package service

import (
	"context"
	"fmt"
	"html"
	"log/slog"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

type TransactionalEmailService struct {
	email *EmailService
	users *repository.UserRepository
	plans *repository.PlanRepository
	ws    *repository.WorkspaceRepository
	cfg   *config.Config
	log   *slog.Logger
}

func NewTransactionalEmailService(
	email *EmailService,
	users *repository.UserRepository,
	plans *repository.PlanRepository,
	ws *repository.WorkspaceRepository,
	cfg *config.Config,
	logger *slog.Logger,
) *TransactionalEmailService {
	return &TransactionalEmailService{
		email: email, users: users, plans: plans, ws: ws, cfg: cfg, log: logger,
	}
}

func (s *TransactionalEmailService) SendSubscriptionPaidBestEffort(ctx context.Context, checkout *model.PlanCheckout) {
	if s == nil || s.email == nil || checkout == nil {
		return
	}
	user, err := s.users.GetByID(ctx, checkout.UserID)
	if err != nil {
		return
	}
	plan, err := s.plans.GetByID(ctx, checkout.PlanID)
	if err != nil {
		return
	}
	ws, _ := s.ws.GetByID(ctx, checkout.WorkspaceID)
	wsName := ""
	if ws != nil {
		wsName = ws.Name
	}

	period := billingPeriodLabel(checkout.BillingPeriod)
	amount := FormatRubOutSum(checkout.AmountCents)
	appURL := strings.TrimSuffix(s.cfg.PublicAppURLNormalized(), "/")
	body := SubscriptionPaidEmailBody(user.Name, plan.Name, wsName, amount, period, appURL)
	if err := s.email.Send(ctx, user.Email, "Postilka — оплата тарифа подтверждена", body); err != nil && s.log != nil {
		s.log.Warn("subscription paid email failed", "user_id", user.ID, "error", err)
	}
}

func (s *TransactionalEmailService) SendWalletTopupPaidBestEffort(ctx context.Context, topup *model.WalletTopup) {
	if s == nil || s.email == nil || topup == nil {
		return
	}
	user, err := s.users.GetByID(ctx, topup.UserID)
	if err != nil {
		return
	}
	amount := FormatRubOutSum(topup.AmountCents)
	appURL := strings.TrimSuffix(s.cfg.PublicAppURLNormalized(), "/")
	body := WalletTopupPaidEmailBody(user.Name, amount, appURL)
	if err := s.email.Send(ctx, user.Email, "Postilka — пополнение кошелька подтверждено", body); err != nil && s.log != nil {
		s.log.Warn("wallet topup email failed", "user_id", user.ID, "error", err)
	}
}

func (s *TransactionalEmailService) SendWorkspaceInviteBestEffort(
	ctx context.Context,
	toEmail, inviterName, workspaceName, inviteURL string,
	role model.WorkspaceRole,
) {
	if s == nil || s.email == nil {
		return
	}
	body := WorkspaceInviteEmailBody(inviterName, workspaceName, inviteURL, roleLabel(role))
	if err := s.email.Send(ctx, toEmail, "Postilka — приглашение в воркфлоу", body); err != nil && s.log != nil {
		s.log.Warn("workspace invite email failed", "email", toEmail, "error", err)
	}
}

func billingPeriodLabel(period model.BillingPeriod) string {
	switch period {
	case model.BillingPeriodYearly:
		return "год"
	default:
		return "месяц"
	}
}

func roleLabel(role model.WorkspaceRole) string {
	switch role {
	case model.RoleAdmin:
		return "администратор"
	case model.RoleEditor:
		return "редактор"
	case model.RoleViewer:
		return "наблюдатель"
	default:
		return string(role)
	}
}

func SubscriptionPaidEmailBody(name, planName, workspaceName, amount, period, appURL string) EmailBody {
	displayName := strings.TrimSpace(name)
	if displayName == "" {
		displayName = "друг"
	}
	wsLine := ""
	if strings.TrimSpace(workspaceName) != "" {
		wsLine = emailParagraphRow(fmt.Sprintf("Workspace: <strong>%s</strong>", html.EscapeString(workspaceName)))
	}
	content := emailGreetingRow(displayName) +
		emailParagraphRow("Оплата тарифа в Postilka прошла успешно.") +
		wsLine +
		emailParagraphRow(fmt.Sprintf("Тариф: <strong>%s</strong><br>Сумма: <strong>%s ₽</strong> / %s",
			html.EscapeString(planName), html.EscapeString(amount), html.EscapeString(period))) +
		emailNoteRow("Подробности доступны в разделе «Тариф и кошелёк».")

	return EmailBody{
		Preheader:   "Оплата тарифа Postilka подтверждена",
		ContentHTML: content,
		CTALabel:    "Открыть тарифы",
		CTAURL:      strings.TrimSuffix(appURL, "/") + "/plans",
	}
}

func WalletTopupPaidEmailBody(name, amount, appURL string) EmailBody {
	displayName := strings.TrimSpace(name)
	if displayName == "" {
		displayName = "друг"
	}
	content := emailGreetingRow(displayName) +
		emailParagraphRow(fmt.Sprintf("Пополнение кошелька на <strong>%s ₽</strong> зачислено.", html.EscapeString(amount))) +
		emailNoteRow("Баланс доступен в разделе «Тариф и кошелёк».")

	return EmailBody{
		Preheader:   "Кошелёк Postilka пополнен",
		ContentHTML: content,
		CTALabel:    "Открыть кошелёк",
		CTAURL:      appURL + "/plans",
	}
}

func YouTubeReconnectEmailBody(channelName, workspaceName string, reconnectBy time.Time, channelsURL string) EmailBody {
	wsLine := ""
	if strings.TrimSpace(workspaceName) != "" {
		wsLine = emailParagraphRow(fmt.Sprintf("Workspace: <strong>%s</strong>", html.EscapeString(workspaceName)))
	}
	dateLabel := reconnectBy.In(time.Local).Format("02.01.2006 15:04")
	content := emailParagraphRow(
		fmt.Sprintf("Для YouTube-канала <strong>%s</strong> пора обновить доступ Google OAuth (Testing).",
			html.EscapeString(channelName))) +
		wsLine +
		emailParagraphRow(fmt.Sprintf("В Postilka кнопка «Переподключить» доступна с <strong>%s</strong>.", html.EscapeString(dateLabel))) +
		emailNoteRow("Client ID и Secret менять не нужно — достаточно снова войти через Google.")

	return EmailBody{
		Preheader:   "Переподключите YouTube-канал в Postilka",
		ContentHTML: content,
		CTALabel:    "Открыть каналы",
		CTAURL:      channelsURL,
	}
}

func WorkspaceInviteEmailBody(inviterName, workspaceName, inviteURL string, roleLabel string) EmailBody {
	inviter := html.EscapeString(strings.TrimSpace(inviterName))
	if inviter == "" {
		inviter = "Коллега"
	}
	ws := html.EscapeString(strings.TrimSpace(workspaceName))
	content := emailParagraphRow(fmt.Sprintf("<strong>%s</strong> приглашает вас в воркфлоу <strong>%s</strong> с ролью <strong>%s</strong>.",
		inviter, ws, html.EscapeString(roleLabel))) +
		emailLinkBoxRow(inviteURL) +
		emailNoteRow("Ссылка действительна 7 дней. Если вы не ожидали приглашение — проигнорируйте письмо.")

	return EmailBody{
		Preheader:   fmt.Sprintf("Приглашение в %s", workspaceName),
		ContentHTML: content,
		CTALabel:    "Принять приглашение",
		CTAURL:      inviteURL,
	}
}

func workspaceInviteURL(publicAppURL, token string) string {
	return fmt.Sprintf("%s/auth/accept-invite?token=%s", strings.TrimSuffix(publicAppURL, "/"), token)
}
