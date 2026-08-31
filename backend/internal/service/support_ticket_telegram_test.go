package service

import (
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/postilka/postilka/internal/model"
)

func TestSupportForumTopicNameTruncates(t *testing.T) {
	email := "very-long-user-name@example.com"
	subj := strings.Repeat("тема", 80)
	ticket := &model.SupportTicket{
		TicketNumber: 12,
		Subject:      &subj,
		User:         &model.SupportTicketUserSummary{Email: email},
		Theme:        &model.SupportTicketThemeSummary{Name: "Общие вопросы"},
	}
	name := supportForumTopicName(ticket)
	if utf8.RuneCountInString(name) > 128 {
		t.Fatalf("topic name too long: %d", utf8.RuneCountInString(name))
	}
	if !strings.HasPrefix(name, "#12 ") {
		t.Fatalf("expected ticket number prefix, got %q", name)
	}
}

func TestSupportUpdateFromAdminMapsMessage(t *testing.T) {
	upd := adminBotUpdate{
		UpdateID: 15,
		Message: &adminBotMessage{
			MessageID:       99,
			Text:            "ответ в теме",
			MessageThreadID: 7,
			Chat:            adminBotChat{ID: -1001, Type: "supergroup"},
			From:            &telegramUser{ID: 1, FirstName: "Анна"},
			Document:        &supportBotFile{FileName: "log.txt"},
		},
	}
	got := supportUpdateFromAdmin(upd)
	if got.UpdateID != 15 || got.Message == nil {
		t.Fatalf("unexpected update: %+v", got)
	}
	if got.Message.MessageThreadID != 7 || got.Message.Text != "ответ в теме" {
		t.Fatalf("message fields not copied: %+v", got.Message)
	}
	if got.Message.Document == nil || got.Message.Document.FileName != "log.txt" {
		t.Fatalf("document not copied: %+v", got.Message.Document)
	}
}

func TestSupportChatIDEqual(t *testing.T) {
	if !supportChatIDEqual("-1003911499538", "-1003911499538") {
		t.Fatal("same ids should match")
	}
	if supportChatIDEqual("-1001", "-1002") {
		t.Fatal("different ids should not match")
	}
	if supportChatIDEqual("", "-1001") {
		t.Fatal("empty should not match")
	}
}

func TestSupportTelegramIngestBody(t *testing.T) {
	msg := &supportBotMessage{
		Text:     "Нужна помощь",
		From:     &supportBotUser{FirstName: "Анна", Username: "anna"},
		Document: &supportBotFile{FileName: "log.txt"},
	}
	got := supportTelegramIngestBody(msg)
	if !strings.Contains(got, "Нужна помощь") || !strings.Contains(got, "log.txt") {
		t.Fatalf("unexpected ingest body: %q", got)
	}
	if strings.Contains(got, "Telegram:") || strings.Contains(got, "@anna") {
		t.Fatalf("telegram identity should not appear in ticket body: %q", got)
	}
}

func TestStripSupportTelegramSenderPrefix(t *testing.T) {
	got := stripSupportTelegramSenderPrefix("Telegram: George Erman (@ermangeorge)\n\nGggggg")
	if got != "Gggggg" {
		t.Fatalf("got %q", got)
	}
}

func TestSplitTelegramText(t *testing.T) {
	chunks := splitTelegramText(strings.Repeat("я", 5000), 4096)
	if len(chunks) != 2 {
		t.Fatalf("expected 2 chunks, got %d", len(chunks))
	}
	if utf8.RuneCountInString(chunks[0]) != 4096 {
		t.Fatalf("first chunk %d", utf8.RuneCountInString(chunks[0]))
	}
}

func TestSupportTelegramIntro(t *testing.T) {
	ticket := &model.SupportTicket{
		TicketNumber: 7,
		User:         &model.SupportTicketUserSummary{Email: "a@b.c", Name: "Алексей"},
		Theme:        &model.SupportTicketThemeSummary{Name: "Оплата"},
	}
	got := supportTelegramIntro(ticket, "https://postilka.ru/app/admin/support?ticket=1")
	if !strings.Contains(got, "#7") || !strings.Contains(got, "a@b.c") {
		t.Fatalf("unexpected intro: %q", got)
	}
}
