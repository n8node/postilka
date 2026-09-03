package service

import (
	"context"
	"errors"
	"fmt"
	"html"
	"log/slog"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrSupportTicketClosed = errors.New("ticket is closed")
	ErrInvalidSupportInput = errors.New("invalid support input")
)

type SupportTicketService struct {
	tickets     *repository.SupportTicketRepository
	settings    *SupportSettingsService
	users       *repository.UserRepository
	notify      *NotificationService
	email       *EmailService
	maxClient   *oauthclient.MAXBotClient
	telegram    *TelegramBotClient
	runtime     *TelegramService
	store       *ObjectStorage
	cfg         *config.Config
	log         *slog.Logger
	pollMu      sync.Mutex
	pollStarted bool
}

func NewSupportTicketService(
	tickets *repository.SupportTicketRepository,
	settings *SupportSettingsService,
	users *repository.UserRepository,
	notify *NotificationService,
	email *EmailService,
	maxClient *oauthclient.MAXBotClient,
	telegram *TelegramBotClient,
	store *ObjectStorage,
	cfg *config.Config,
	logger *slog.Logger,
) *SupportTicketService {
	if maxClient == nil {
		maxClient = oauthclient.NewMAXBotClient()
	}
	return &SupportTicketService{
		tickets:   tickets,
		settings:  settings,
		users:     users,
		notify:    notify,
		email:     email,
		maxClient: maxClient,
		telegram:  telegram,
		store:     store,
		cfg:       cfg,
		log:       logger,
	}
}

func (s *SupportTicketService) ListThemes(ctx context.Context) ([]model.SupportTicketTheme, error) {
	return s.tickets.ListActiveThemes(ctx)
}

func (s *SupportTicketService) ListAllThemes(ctx context.Context) ([]model.SupportTicketTheme, error) {
	return s.tickets.ListAllThemes(ctx)
}

func (s *SupportTicketService) ListUserTickets(ctx context.Context, userID string) ([]model.SupportTicket, error) {
	items, err := s.tickets.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	items, err = s.tickets.AttachMessages(ctx, items)
	if err != nil {
		return nil, err
	}
	for i := range items {
		s.decorateTicket(&items[i], false)
	}
	return items, nil
}

func (s *SupportTicketService) ListAdminTickets(ctx context.Context) ([]model.SupportTicket, error) {
	items, err := s.tickets.ListAll(ctx)
	if err != nil {
		return nil, err
	}
	items, err = s.tickets.AttachMessages(ctx, items)
	if err != nil {
		return nil, err
	}
	for i := range items {
		s.decorateTicket(&items[i], true)
	}
	return items, nil
}

func (s *SupportTicketService) CountAwaitingUser(ctx context.Context, userID string) (int, error) {
	return s.tickets.CountByUserStatus(ctx, userID, model.TicketStatusAwaitingUser)
}

func (s *SupportTicketService) CountAwaitingAdmin(ctx context.Context) (int, error) {
	return s.tickets.CountByStatus(ctx, model.TicketStatusAwaitingAdmin)
}

func (s *SupportTicketService) GetUserTicket(ctx context.Context, ticketID, userID string) (*model.SupportTicket, error) {
	ticket, err := s.tickets.GetByIDForUser(ctx, ticketID, userID)
	if err != nil {
		return nil, err
	}
	msgs, err := s.tickets.ListMessages(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	ticket.Messages = msgs
	s.decorateTicket(ticket, false)
	return ticket, nil
}

func (s *SupportTicketService) GetAdminTicket(ctx context.Context, ticketID string) (*model.SupportTicket, error) {
	ticket, err := s.tickets.GetByID(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	msgs, err := s.tickets.ListMessages(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	ticket.Messages = msgs
	s.decorateTicket(ticket, true)
	return ticket, nil
}

func (s *SupportTicketService) CreateTicket(ctx context.Context, userID string, req model.SupportTicketCreateRequest, files []SupportUpload) (*model.SupportTicket, error) {
	themeID := strings.TrimSpace(req.ThemeID)
	body := strings.TrimSpace(req.Body)
	if themeID == "" || (body == "" && len(files) == 0) {
		return nil, fmt.Errorf("%w: theme and message required", ErrInvalidSupportInput)
	}
	if err := s.validateUploads(files); err != nil {
		return nil, err
	}
	if _, err := s.tickets.GetActiveThemeByID(ctx, themeID); err != nil {
		return nil, err
	}

	var subject *string
	if req.Subject != nil {
		v := strings.TrimSpace(*req.Subject)
		if v != "" {
			subject = &v
		}
	}
	priority := model.NormalizeTicketPriority(string(req.Priority))

	ticket, err := s.tickets.CreateTicket(ctx, userID, themeID, subject, priority)
	if err != nil {
		return nil, err
	}
	if body == "" {
		body = " "
	}
	msg, err := s.tickets.AddMessage(ctx, ticket.ID, userID, model.TicketAuthorUser, body)
	if err != nil {
		return nil, err
	}
	if err := s.saveUploads(ctx, ticket.ID, msg.ID, files); err != nil {
		return nil, err
	}

	full, err := s.GetAdminTicket(ctx, ticket.ID)
	if err != nil {
		return nil, err
	}
	s.notifyAdminsNewActivity(ctx, full, body, true)
	return s.GetUserTicket(ctx, ticket.ID, userID)
}

func (s *SupportTicketService) AddUserMessage(ctx context.Context, ticketID, userID, body string, files []SupportUpload) (*model.SupportTicket, error) {
	body = strings.TrimSpace(body)
	if body == "" && len(files) == 0 {
		return nil, fmt.Errorf("%w: message required", ErrInvalidSupportInput)
	}
	if err := s.validateUploads(files); err != nil {
		return nil, err
	}
	ticket, err := s.tickets.GetByIDForUser(ctx, ticketID, userID)
	if err != nil {
		return nil, err
	}
	if model.IsTicketClosed(ticket.Status) {
		return nil, ErrSupportTicketClosed
	}
	if body == "" {
		body = " "
	}
	msg, err := s.tickets.AddMessage(ctx, ticketID, userID, model.TicketAuthorUser, body)
	if err != nil {
		return nil, err
	}
	if err := s.saveUploads(ctx, ticketID, msg.ID, files); err != nil {
		return nil, err
	}
	if err := s.tickets.UpdateTicketStatus(ctx, ticketID, model.TicketStatusAwaitingAdmin); err != nil {
		return nil, err
	}
	full, err := s.GetAdminTicket(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	s.notifyAdminsNewActivity(ctx, full, body, false)
	return s.GetUserTicket(ctx, ticketID, userID)
}

func (s *SupportTicketService) AdminReply(ctx context.Context, ticketID, adminUserID, body string, files []SupportUpload) (*model.SupportTicket, error) {
	body = strings.TrimSpace(body)
	if body == "" && len(files) == 0 {
		return nil, fmt.Errorf("%w: message required", ErrInvalidSupportInput)
	}
	if err := s.validateUploads(files); err != nil {
		return nil, err
	}
	ticket, err := s.tickets.GetByID(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	if model.IsTicketClosed(ticket.Status) {
		return nil, ErrSupportTicketClosed
	}
	if body == "" {
		body = " "
	}
	msg, err := s.tickets.AddMessage(ctx, ticketID, adminUserID, model.TicketAuthorAdmin, body)
	if err != nil {
		return nil, err
	}
	if err := s.saveUploads(ctx, ticketID, msg.ID, files); err != nil {
		return nil, err
	}
	if err := s.tickets.UpdateTicketStatus(ctx, ticketID, model.TicketStatusAwaitingUser); err != nil {
		return nil, err
	}

	full, err := s.GetAdminTicket(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	s.notifyUserReply(ctx, full, body)
	s.mirrorAdminReplyToTelegram(ctx, full, body)
	return full, nil
}

func (s *SupportTicketService) UpdateUserStatus(ctx context.Context, ticketID, userID string, status model.TicketStatus) (*model.SupportTicket, error) {
	if status != model.TicketStatusResolved && status != model.TicketStatusClosed {
		return nil, fmt.Errorf("%w: invalid status", ErrInvalidSupportInput)
	}
	ticket, err := s.tickets.GetByIDForUser(ctx, ticketID, userID)
	if err != nil {
		return nil, err
	}
	if err := s.tickets.UpdateTicketStatus(ctx, ticket.ID, status); err != nil {
		return nil, err
	}
	full, err := s.GetUserTicket(ctx, ticketID, userID)
	if err != nil {
		return nil, err
	}
	s.mirrorTicketStatusToTelegram(ctx, full, status)
	return full, nil
}

func (s *SupportTicketService) UpdateStatus(ctx context.Context, ticketID string, status model.TicketStatus) (*model.SupportTicket, error) {
	if err := validateTicketStatus(status); err != nil {
		return nil, err
	}
	if err := s.tickets.UpdateTicketStatus(ctx, ticketID, status); err != nil {
		return nil, err
	}
	full, err := s.GetAdminTicket(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	s.mirrorTicketStatusToTelegram(ctx, full, status)
	return full, nil
}

func (s *SupportTicketService) CreateTheme(ctx context.Context, req model.SupportTicketThemeCreateRequest) (*model.SupportTicketTheme, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, fmt.Errorf("%w: name required", ErrInvalidSupportInput)
	}
	slug := supportThemeSlug(req.Slug, name)
	exists, err := s.tickets.ThemeExistsByNameOrSlug(ctx, name, slug, "")
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, fmt.Errorf("%w: theme already exists", ErrInvalidSupportInput)
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	return s.tickets.CreateTheme(ctx, model.SupportTicketTheme{
		Name:        name,
		Slug:        slug,
		Description: strings.TrimSpace(req.Description),
		Icon:        normalizeSupportThemeIcon(req.Icon),
		SortOrder:   req.SortOrder,
		IsActive:    isActive,
	})
}

func (s *SupportTicketService) UpdateTheme(ctx context.Context, id string, req model.SupportTicketThemeUpdateRequest) (*model.SupportTicketTheme, error) {
	current, err := s.tickets.GetThemeByID(ctx, id)
	if err != nil {
		return nil, err
	}
	name := current.Name
	slug := current.Slug
	description := current.Description
	icon := current.Icon
	sortOrder := current.SortOrder
	isActive := current.IsActive

	if req.Name != nil {
		name = strings.TrimSpace(*req.Name)
		if name == "" {
			return nil, fmt.Errorf("%w: name required", ErrInvalidSupportInput)
		}
	}
	if req.Slug != nil {
		slug = supportThemeSlug(*req.Slug, name)
	} else if req.Name != nil {
		slug = supportThemeSlug("", name)
	}
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	if req.Description != nil {
		description = strings.TrimSpace(*req.Description)
	}
	if req.Icon != nil {
		icon = normalizeSupportThemeIcon(*req.Icon)
	}

	exists, err := s.tickets.ThemeExistsByNameOrSlug(ctx, name, slug, id)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, fmt.Errorf("%w: theme already exists", ErrInvalidSupportInput)
	}

	return s.tickets.UpdateTheme(ctx, id, model.SupportTicketTheme{
		Name:        name,
		Slug:        slug,
		Description: description,
		Icon:        icon,
		SortOrder:   sortOrder,
		IsActive:    isActive,
	})
}

func (s *SupportTicketService) DeleteTheme(ctx context.Context, id string) error {
	count, err := s.tickets.CountThemeTickets(ctx, id)
	if err != nil {
		return err
	}
	if count > 0 {
		return s.tickets.DeactivateTheme(ctx, id)
	}
	return s.tickets.DeleteTheme(ctx, id)
}

func (s *SupportTicketService) SendTestTelegram(ctx context.Context) (bool, string) {
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil {
		return false, err.Error()
	}
	if !cfg.TelegramEnabled {
		return false, "Включите Telegram-бот поддержки"
	}
	text := "✅ Тестовое сообщение Postilka Support\nБот поддержки подключён. Это сообщение уходит в общий чат группы, не в тему тикета."
	if err := s.sendTelegram(ctx, cfg.TelegramBotToken, cfg.TelegramChatID, text); err != nil {
		return false, mapSupportTelegramError(err)
	}
	return true, "Тестовое сообщение отправлено"
}

func (s *SupportTicketService) SendTestMax(ctx context.Context) (bool, string) {
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil {
		return false, err.Error()
	}
	if !cfg.MaxEnabled {
		return false, "Включите MAX-бот поддержки"
	}
	text := "✅ Тестовое сообщение Postilka Support\nБот поддержки подключён."
	if err := s.sendMax(ctx, cfg.MaxBotToken, cfg.MaxRecipientID, text); err != nil {
		return false, err.Error()
	}
	return true, "Тестовое сообщение отправлено"
}

func (s *SupportTicketService) SendTestAdminEmail(ctx context.Context) (bool, string) {
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil {
		return false, err.Error()
	}
	if !cfg.AdminEmailEnabled {
		return false, "Включите email-оповещения поддержки"
	}
	recipients := splitEmailRecipients(cfg.AdminEmailRecipients)
	if len(recipients) == 0 {
		return false, "Укажите email администратора"
	}
	subject := "Postilka — тест оповещений поддержки"
	bodyHTML := "<p>Тестовое письмо из настроек поддержки Postilka.</p>"
	var sendErr error
	for _, to := range recipients {
		if err := s.email.Send(ctx, to, subject, EmailBody{ContentHTML: bodyHTML}); err != nil {
			sendErr = err
		}
	}
	if sendErr != nil {
		return false, MapEmailSendError(sendErr)
	}
	return true, "Тестовое письмо отправлено"
}

func (s *SupportTicketService) notifyAdminsNewActivity(ctx context.Context, ticket *model.SupportTicket, body string, isNew bool) {
	if ticket == nil {
		return
	}
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil {
		s.log.Warn("support settings load failed", "err", err)
		return
	}
	preview := formatSupportPreview(body, 400)
	vars := supportTemplateVars(ticket, preview)

	if cfg.TelegramEnabled {
		tpl := cfg.TelegramUserReplyTemplate
		if isNew {
			tpl = cfg.TelegramNewTicketTemplate
		}
		text := applySupportTemplate(tpl, vars)
		text = appendSupportAttachmentNames(text, ticket)
		if err := s.sendTelegramForTicket(ctx, cfg, ticket, text, isNew); err != nil {
			s.log.Warn("support telegram notify failed", "err", err)
		}
	}
	if cfg.MaxEnabled {
		tpl := cfg.MaxUserReplyTemplate
		if isNew {
			tpl = cfg.MaxNewTicketTemplate
		}
		text := applySupportTemplate(tpl, vars)
		if err := s.sendMax(ctx, cfg.MaxBotToken, cfg.MaxRecipientID, text); err != nil {
			s.log.Warn("support max notify failed", "err", err)
		}
	}
	if cfg.AdminEmailEnabled {
		recipients := splitEmailRecipients(cfg.AdminEmailRecipients)
		subjectPrefix := "Ответ в тикете"
		if isNew {
			subjectPrefix = "Новый тикет"
		}
		subject := fmt.Sprintf("[Postilka] %s #%s — %s", subjectPrefix, supportTicketShortID(ticket.ID), vars["themeName"])
		ticketURL := s.adminTicketURL(ticket.ID)
		bodyHTML := fmt.Sprintf(
			"<p><strong>%s</strong></p><p>Тема: %s<br>От: %s (%s)</p><div style=\"background:#f5f5f5;padding:12px;border-radius:8px;\">%s</div><p><a href=\"%s\">Открыть в админке</a></p>",
			html.EscapeString(subjectPrefix),
			html.EscapeString(vars["themeName"]),
			html.EscapeString(vars["userEmail"]),
			html.EscapeString(vars["userName"]),
			strings.ReplaceAll(html.EscapeString(preview), "\n", "<br>"),
			html.EscapeString(ticketURL),
		)
		for _, to := range recipients {
			if err := s.email.Send(ctx, to, subject, EmailBody{ContentHTML: bodyHTML, CTALabel: "Открыть тикет", CTAURL: ticketURL}); err != nil {
				s.log.Warn("support admin email failed", "to", to, "err", err)
			}
		}
	}
}

func (s *SupportTicketService) notifyUserReply(ctx context.Context, ticket *model.SupportTicket, replyBody string) {
	if ticket == nil || s.notify == nil {
		return
	}
	href := s.userTicketURL(ticket.ID)
	s.notify.Create(ctx, NotificationInput{
		UserID:   ticket.UserID,
		Type:     model.NotifySupportTicket,
		Category: model.NotificationInfo,
		Title:    "Ответ в тикете поддержки",
		Body:     fmt.Sprintf("Тема: %s. Перейдите в раздел поддержки.", ticketThemeName(ticket)),
		Payload:  map[string]any{"ticket_id": ticket.ID},
		Href:     href,
	})

	user, err := s.users.GetByID(ctx, ticket.UserID)
	if err != nil || user == nil || !user.HasDeliverableEmail() {
		return
	}
	ticketURL := s.userTicketURL(ticket.ID)
	subject := fmt.Sprintf("Ответ по тикету: %s", ticketThemeName(ticket))
	content := fmt.Sprintf(
		"<p>Здравствуйте%s!</p><p>По вашему обращению в техподдержку (тема: %s) получен ответ:</p><div style=\"background:#f5f5f5;padding:12px;margin:12px 0;border-radius:8px;\">%s</div>",
		userGreetingName(user.Name),
		html.EscapeString(ticketThemeName(ticket)),
		strings.ReplaceAll(html.EscapeString(strings.TrimSpace(replyBody)), "\n", "<br>"),
	)
	if err := s.email.Send(ctx, user.Email, subject, EmailBody{
		ContentHTML: content,
		CTALabel:    "Открыть тикет",
		CTAURL:      ticketURL,
	}); err != nil {
		s.log.Warn("support user email failed", "err", err)
	}
}

func (s *SupportTicketService) sendTelegram(ctx context.Context, token, chatID, text string) error {
	token = strings.TrimSpace(token)
	chatID = strings.TrimSpace(chatID)
	text = strings.TrimSpace(text)
	if token == "" || chatID == "" || text == "" {
		return errors.New("telegram not configured")
	}
	if s.telegram == nil {
		return errors.New("telegram client not configured")
	}
	return s.telegram.SendMessage(ctx, token, chatID, text)
}

func mapSupportTelegramError(err error) string {
	if err == nil {
		return ""
	}
	msg := sanitizeTelegramError(err).Error()
	lower := strings.ToLower(msg)
	if strings.Contains(lower, "deadline") || strings.Contains(lower, "timeout") || strings.Contains(lower, "ожидания заголовков") {
		return "Telegram не отвечает с сервера. Нужен исходящий прокси (админка → настройки Telegram / outbound proxy), как для публикации в каналы."
	}
	return msg
}

func (s *SupportTicketService) sendMax(ctx context.Context, token, recipientID, text string) error {
	token = strings.TrimSpace(token)
	recipientID = strings.TrimSpace(recipientID)
	if token == "" || recipientID == "" {
		return errors.New("max not configured")
	}
	if strings.HasPrefix(recipientID, "-") || strings.HasPrefix(recipientID, "chat:") {
		chatID := strings.TrimPrefix(recipientID, "chat:")
		return s.maxClient.SendText(ctx, token, chatID, text)
	}
	return s.maxClient.SendText(ctx, token, "", recipientID)
}

func (s *SupportTicketService) userTicketURL(ticketID string) string {
	return strings.TrimSuffix(s.cfg.PublicAppURLNormalized(), "/") + "/support?ticket=" + ticketID
}

func (s *SupportTicketService) adminTicketURL(ticketID string) string {
	return strings.TrimSuffix(s.cfg.PublicAppURLNormalized(), "/") + "/admin/support?ticket=" + ticketID
}

func ticketThemeName(ticket *model.SupportTicket) string {
	if ticket != nil && ticket.Theme != nil {
		return ticket.Theme.Name
	}
	return "Поддержка"
}

func userGreetingName(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return ""
	}
	return ", " + html.EscapeString(name)
}

var supportSlugRe = regexp.MustCompile(`[^a-z0-9а-яё\-]+`)

func supportThemeSlug(rawSlug, name string) string {
	slug := strings.TrimSpace(strings.ToLower(rawSlug))
	if slug == "" {
		slug = strings.TrimSpace(strings.ToLower(name))
	}
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = supportSlugRe.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		slug = fmt.Sprintf("theme-%d", time.Now().Unix())
	}
	return slug
}

func supportTicketShortID(id string) string {
	id = strings.TrimSpace(id)
	if len(id) <= 6 {
		return id
	}
	return id[len(id)-6:]
}

func formatSupportPreview(body string, max int) string {
	body = strings.TrimSpace(body)
	if max <= 0 {
		return body
	}
	runes := []rune(body)
	if len(runes) <= max {
		return body
	}
	return string(runes[:max]) + "…"
}

func supportTemplateVars(ticket *model.SupportTicket, preview string) map[string]string {
	if ticket == nil {
		return map[string]string{}
	}
	themeName := ticketThemeName(ticket)
	userEmail := ""
	userName := "—"
	if ticket.User != nil {
		userEmail = ticket.User.Email
		if strings.TrimSpace(ticket.User.Name) != "" {
			userName = ticket.User.Name
		}
	} else if ticket.UserID != "" {
		userEmail = ticket.UserID
	}
	return map[string]string{
		"ticketShortId": supportTicketShortID(ticket.ID),
		"ticketNumber":  fmt.Sprintf("%d", ticket.TicketNumber),
		"themeName":     themeName,
		"userEmail":     userEmail,
		"userName":      userName,
		"preview":       preview,
	}
}

func applySupportTemplate(tpl string, vars map[string]string) string {
	out := tpl
	for k, v := range vars {
		out = strings.ReplaceAll(out, "{"+k+"}", v)
	}
	return strings.TrimSpace(out)
}

func splitEmailRecipients(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func validateTicketStatus(status model.TicketStatus) error {
	switch status {
	case model.TicketStatusOpen, model.TicketStatusAwaitingAdmin, model.TicketStatusAwaitingUser,
		model.TicketStatusInProgress, model.TicketStatusResolved, model.TicketStatusClosed:
		return nil
	default:
		return fmt.Errorf("%w: invalid status", ErrInvalidSupportInput)
	}
}

func normalizeSupportThemeIcon(raw string) string {
	switch strings.TrimSpace(strings.ToLower(raw)) {
	case "wrench", "credit-card", "radio", "help", "plus", "bug", "message":
		return strings.TrimSpace(strings.ToLower(raw))
	default:
		return "help"
	}
}
