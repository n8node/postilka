package service

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

func (s *SupportTicketService) Start() {
	if s == nil || s.telegram == nil {
		return
	}
	s.pollMu.Lock()
	if s.pollStarted {
		s.pollMu.Unlock()
		return
	}
	s.pollStarted = true
	s.pollMu.Unlock()
	if s.log != nil {
		s.log.Info("support telegram topic poller started")
	}
	go s.pollSupportTelegramLoop()
}

func (s *SupportTicketService) sendTelegramForTicket(ctx context.Context, cfg model.SupportSettings, ticket *model.SupportTicket, text string, _ bool) error {
	token := strings.TrimSpace(cfg.TelegramBotToken)
	chatID := strings.TrimSpace(cfg.TelegramChatID)
	text = strings.TrimSpace(text)
	if token == "" || chatID == "" || text == "" {
		return errors.New("telegram not configured")
	}
	topicID, err := s.ensureTelegramTopic(ctx, cfg, ticket)
	if err != nil {
		s.log.Warn("support telegram topic create failed, sending to group root", "err", err, "ticket_id", ticketID(ticket))
		return s.sendTelegram(ctx, token, chatID, text)
	}
	if err := s.telegram.SendThreadMessage(ctx, token, chatID, text, topicID); err != nil {
		if isTelegramTopicGone(err) && s.healTelegramTopic(ctx, cfg, ticket) {
			return s.telegram.SendThreadMessage(ctx, token, chatID, text, ticket.TelegramTopicID)
		}
		return err
	}
	return nil
}

func (s *SupportTicketService) mirrorAdminReplyToTelegram(ctx context.Context, ticket *model.SupportTicket, body string) {
	cfg, err := s.supportTelegramConfig(ctx)
	if err != nil || cfg == nil {
		return
	}
	text := strings.TrimSpace(body)
	if text == "" || text == " " {
		text = "Вложение"
	}
	text = "👤 Ответ из кабинета Postilka\n\n" + text
	text = appendSupportAttachmentNames(text, ticket)
	if err := s.sendTelegramForTicket(ctx, *cfg, ticket, text, false); err != nil {
		s.log.Warn("support telegram admin mirror failed", "err", err, "ticket_id", ticketID(ticket))
	}
}

func (s *SupportTicketService) mirrorTicketStatusToTelegram(ctx context.Context, ticket *model.SupportTicket, status model.TicketStatus) {
	if ticket == nil || ticket.TelegramTopicID <= 0 {
		return
	}
	cfg, err := s.supportTelegramConfig(ctx)
	if err != nil || cfg == nil {
		return
	}
	var text string
	switch status {
	case model.TicketStatusResolved:
		text = "✅ Тикет решён"
	case model.TicketStatusClosed:
		text = "🔒 Тикет закрыт"
	default:
		return
	}
	if err := s.sendTelegramForTicket(ctx, *cfg, ticket, text, false); err != nil {
		s.log.Warn("support telegram status mirror failed", "err", err, "ticket_id", ticketID(ticket))
	}
}

func (s *SupportTicketService) supportTelegramConfig(ctx context.Context) (*model.SupportSettings, error) {
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil {
		return nil, err
	}
	if !cfg.TelegramEnabled || strings.TrimSpace(cfg.TelegramBotToken) == "" || strings.TrimSpace(cfg.TelegramChatID) == "" {
		return nil, nil
	}
	return &cfg, nil
}

func (s *SupportTicketService) ensureTelegramTopic(ctx context.Context, cfg model.SupportSettings, ticket *model.SupportTicket) (int, error) {
	if ticket == nil {
		return 0, errors.New("ticket required")
	}
	if s.telegram == nil {
		return 0, errors.New("telegram client not configured")
	}
	chatID := strings.TrimSpace(cfg.TelegramChatID)
	if ticket.TelegramTopicID > 0 && supportChatIDEqual(ticket.TelegramChatID, chatID) {
		return ticket.TelegramTopicID, nil
	}

	name := supportForumTopicName(ticket)
	topicID, err := s.telegram.CreateForumTopic(ctx, cfg.TelegramBotToken, chatID, name)
	if err != nil {
		return 0, err
	}
	if err := s.tickets.SetTelegramTopic(ctx, ticket.ID, chatID, topicID); err != nil {
		return 0, err
	}
	ticket.TelegramChatID = chatID
	ticket.TelegramTopicID = topicID
	return topicID, nil
}

func (s *SupportTicketService) healTelegramTopic(ctx context.Context, cfg model.SupportSettings, ticket *model.SupportTicket) bool {
	if ticket == nil {
		return false
	}
	if err := s.tickets.ClearTelegramTopic(ctx, ticket.ID); err != nil {
		s.log.Warn("support telegram topic clear failed", "err", err, "ticket_id", ticket.ID)
		return false
	}
	ticket.TelegramChatID = ""
	ticket.TelegramTopicID = 0
	if _, err := s.ensureTelegramTopic(ctx, cfg, ticket); err != nil {
		s.log.Warn("support telegram topic heal failed", "err", err, "ticket_id", ticket.ID)
		return false
	}
	return ticket.TelegramTopicID > 0
}

func (s *SupportTicketService) pollSupportTelegramLoop() {
	for {
		cfg, err := s.settings.GetEffective(context.Background())
		if err != nil || !cfg.TelegramEnabled || strings.TrimSpace(cfg.TelegramBotToken) == "" {
			time.Sleep(3 * time.Second)
			continue
		}
		token := strings.TrimSpace(cfg.TelegramBotToken)

		if s.needsSupportTelegramPrime(token) {
			s.primeSupportTelegramOffset(token)
		}

		ctx, cancel := context.WithTimeout(context.Background(), 40*time.Second)
		updates, pollErr := s.telegram.GetSupportUpdates(ctx, token, s.currentPollOffset(), 10)
		cancel()
		if pollErr != nil {
			s.log.Warn("support telegram getUpdates failed", "err", pollErr)
			time.Sleep(5 * time.Second)
			continue
		}
		for _, upd := range updates {
			s.advancePollOffset(upd.UpdateID)
			s.handleSupportTelegramUpdate(cfg, upd)
		}
	}
}

func (s *SupportTicketService) needsSupportTelegramPrime(token string) bool {
	s.pollMu.Lock()
	defer s.pollMu.Unlock()
	return !s.pollPrimed || s.pollToken != token
}

func (s *SupportTicketService) primeSupportTelegramOffset(token string) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	_ = s.telegram.DeleteWebhookDropPending(ctx, token)
	offset, err := s.telegram.PrimeSupportUpdateOffset(ctx, token)
	if err != nil {
		s.log.Warn("support telegram prime offset failed", "err", err)
		return
	}
	s.pollMu.Lock()
	if s.pollToken != token {
		s.pollOffset = 0
	}
	s.pollPrimed = true
	s.pollToken = token
	if offset > s.pollOffset {
		s.pollOffset = offset
	}
	s.pollMu.Unlock()
}

func (s *SupportTicketService) currentPollOffset() int64 {
	s.pollMu.Lock()
	defer s.pollMu.Unlock()
	return s.pollOffset
}

func (s *SupportTicketService) advancePollOffset(updateID int64) {
	s.pollMu.Lock()
	defer s.pollMu.Unlock()
	if next := updateID + 1; next > s.pollOffset {
		s.pollOffset = next
	}
}

func (s *SupportTicketService) handleSupportTelegramUpdate(cfg model.SupportSettings, upd supportBotUpdate) {
	msg := upd.Message
	if msg == nil {
		return
	}
	if msg.From != nil && msg.From.IsBot {
		return
	}
	if len(msg.ForumTopicCreated) > 0 && string(msg.ForumTopicCreated) != "null" {
		return
	}
	if msg.MessageThreadID <= 0 {
		return
	}
	if !supportChatIDEqual(formatChatID(msg.Chat.ID), cfg.TelegramChatID) {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	ticket, err := s.tickets.GetByTelegramTopic(ctx, formatChatID(msg.Chat.ID), msg.MessageThreadID)
	if errors.Is(err, repository.ErrNotFound) {
		ticket, err = s.tickets.GetByTelegramTopic(ctx, strings.TrimSpace(cfg.TelegramChatID), msg.MessageThreadID)
	}
	if err != nil {
		if !errors.Is(err, repository.ErrNotFound) {
			s.log.Warn("support telegram topic lookup failed", "err", err)
		}
		return
	}

	body := supportTelegramIngestBody(msg)
	if body == "" {
		return
	}

	adminID, err := s.users.FirstPlatformAdminID(ctx)
	if err != nil || adminID == "" {
		s.log.Warn("support telegram ingest skipped: no platform admin", "err", err)
		return
	}

	if _, err := s.tickets.AddMessage(ctx, ticket.ID, adminID, model.TicketAuthorAdmin, body); err != nil {
		s.log.Warn("support telegram ingest message failed", "err", err, "ticket_id", ticket.ID)
		return
	}
	if err := s.tickets.UpdateTicketStatus(ctx, ticket.ID, model.TicketStatusAwaitingUser); err != nil {
		s.log.Warn("support telegram ingest status failed", "err", err, "ticket_id", ticket.ID)
	}

	full, err := s.GetAdminTicket(ctx, ticket.ID)
	if err != nil {
		s.log.Warn("support telegram ingest reload failed", "err", err, "ticket_id", ticket.ID)
		return
	}
	s.notifyUserReply(ctx, full, body)
}

func supportForumTopicName(ticket *model.SupportTicket) string {
	if ticket == nil {
		return "Тикет"
	}
	title := ticketThemeName(ticket)
	if ticket.Subject != nil {
		if subj := strings.TrimSpace(*ticket.Subject); subj != "" {
			title = subj
		}
	}
	email := ""
	if ticket.User != nil {
		email = strings.TrimSpace(ticket.User.Email)
	}
	number := ticket.TicketNumber
	var name string
	switch {
	case number > 0 && email != "":
		name = fmt.Sprintf("#%d %s — %s", number, title, email)
	case number > 0:
		name = fmt.Sprintf("#%d %s", number, title)
	case email != "":
		name = fmt.Sprintf("%s — %s", title, email)
	default:
		name = title
	}
	name = strings.TrimSpace(name)
	if name == "" {
		name = "Тикет"
	}
	return truncateRunes(name, 128)
}

func supportTelegramIntro(ticket *model.SupportTicket, adminURL string) string {
	if ticket == nil {
		return ""
	}
	var b strings.Builder
	fmt.Fprintf(&b, "🆕 Тикет")
	if ticket.TicketNumber > 0 {
		fmt.Fprintf(&b, " #%d", ticket.TicketNumber)
	}
	b.WriteString("\nТема: ")
	b.WriteString(ticketThemeName(ticket))
	if ticket.User != nil {
		b.WriteString("\nОт: ")
		b.WriteString(strings.TrimSpace(ticket.User.Email))
		if name := strings.TrimSpace(ticket.User.Name); name != "" {
			fmt.Fprintf(&b, " (%s)", name)
		}
	}
	if href := strings.TrimSpace(adminURL); href != "" {
		b.WriteString("\n")
		b.WriteString(href)
	}
	b.WriteString("\n\nОтветьте в этой теме — сообщение появится в тикете.")
	return b.String()
}

func supportTelegramIngestBody(msg *supportBotMessage) string {
	if msg == nil {
		return ""
	}
	text := strings.TrimSpace(msg.Text)
	if text == "" {
		text = strings.TrimSpace(msg.Caption)
	}
	var extras []string
	if msg.Document != nil {
		if name := strings.TrimSpace(msg.Document.FileName); name != "" {
			extras = append(extras, "📎 "+name)
		} else {
			extras = append(extras, "📎 файл")
		}
	}
	if len(msg.Photo) > 0 {
		extras = append(extras, "📷 фото")
	}
	if len(msg.Video) > 0 && string(msg.Video) != "null" {
		extras = append(extras, "🎬 видео")
	}
	if len(msg.Voice) > 0 && string(msg.Voice) != "null" {
		extras = append(extras, "🎤 голосовое")
	}
	if len(msg.Audio) > 0 && string(msg.Audio) != "null" {
		extras = append(extras, "🎵 аудио")
	}
	if len(msg.Sticker) > 0 && string(msg.Sticker) != "null" {
		extras = append(extras, "стикер")
	}
	if text == "" && len(extras) == 0 {
		return ""
	}
	if from := formatSupportTelegramSender(msg.From); from != "" {
		if text != "" {
			text = from + "\n\n" + text
		} else {
			text = from
		}
	}
	if len(extras) > 0 {
		if text != "" {
			text += "\n" + strings.Join(extras, "\n")
		} else {
			text = strings.Join(extras, "\n")
		}
	}
	return strings.TrimSpace(text)
}

func formatSupportTelegramSender(from *supportBotUser) string {
	if from == nil {
		return ""
	}
	name := strings.TrimSpace(strings.TrimSpace(from.FirstName + " " + from.LastName))
	switch {
	case from.Username != "" && name != "":
		return fmt.Sprintf("Telegram: %s (@%s)", name, from.Username)
	case from.Username != "":
		return "Telegram: @" + from.Username
	case name != "":
		return "Telegram: " + name
	default:
		return ""
	}
}

func appendSupportAttachmentNames(text string, ticket *model.SupportTicket) string {
	text = strings.TrimSpace(text)
	if ticket == nil || len(ticket.Messages) == 0 {
		return text
	}
	last := ticket.Messages[len(ticket.Messages)-1]
	for _, att := range last.Attachments {
		if name := strings.TrimSpace(att.Filename); name != "" {
			text += "\n📎 " + name
		}
	}
	return strings.TrimSpace(text)
}

func supportChatIDEqual(a, b string) bool {
	a = strings.TrimSpace(a)
	b = strings.TrimSpace(b)
	if a == "" || b == "" {
		return false
	}
	if a == b {
		return true
	}
	left, errA := strconv.ParseInt(a, 10, 64)
	right, errB := strconv.ParseInt(b, 10, 64)
	return errA == nil && errB == nil && left == right
}

func isTelegramTopicGone(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "message thread not found") ||
		strings.Contains(msg, "topic_closed") ||
		strings.Contains(msg, "topic not found")
}

func ticketID(ticket *model.SupportTicket) string {
	if ticket == nil {
		return ""
	}
	return ticket.ID
}

func truncateRunes(s string, max int) string {
	if max <= 0 || s == "" {
		return ""
	}
	if utf8.RuneCountInString(s) <= max {
		return s
	}
	return string([]rune(s)[:max])
}

func splitTelegramText(text string, max int) []string {
	text = strings.TrimSpace(text)
	if text == "" || max <= 0 {
		return nil
	}
	if utf8.RuneCountInString(text) <= max {
		return []string{text}
	}
	runes := []rune(text)
	out := make([]string, 0, (len(runes)/max)+1)
	for len(runes) > 0 {
		n := max
		if n > len(runes) {
			n = len(runes)
		}
		out = append(out, string(runes[:n]))
		runes = runes[n:]
	}
	return out
}
