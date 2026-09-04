package service

import (
	"strings"
	"testing"

	"github.com/postilka/postilka/internal/model"
)

func TestNotificationNoticeEmail_RejectAndComment(t *testing.T) {
	subject, body := notificationNoticeEmail("Анна", NotificationInput{
		Type:  model.NotifyApprovalRejected,
		Title: "Пост вернули на доработку",
		Body:  "«Акция». Нужен другой заголовок",
		Href:  "/posts/1",
	}, "https://postilka.ru/app/posts/1")
	if subject != "Postilka — пост вернули на доработку" {
		t.Fatalf("reject subject: %s", subject)
	}
	if body.CTAURL == "" || body.ContentHTML == "" {
		t.Fatal("reject email body empty")
	}

	subject, body = notificationNoticeEmail("Анна", NotificationInput{
		Type:  model.NotifyApprovalComment,
		Title: "Новый комментарий к согласованию",
		Body:  "«Акция»: давайте короче",
	}, "https://postilka.ru/app/posts/1")
	if subject != "Postilka — комментарий к согласованию" {
		t.Fatalf("comment subject: %s", subject)
	}
	if body.CTALabel != "Открыть обсуждение" {
		t.Fatalf("comment cta: %s", body.CTALabel)
	}
}

func TestNotificationHasDedicatedEmail(t *testing.T) {
	if !notificationHasDedicatedEmail(model.NotifyPlanPaid) {
		t.Fatal("plan paid already has checkout email")
	}
	if !notificationHasDedicatedEmail(model.NotifySupportTicket) {
		t.Fatal("support replies already send a dedicated email")
	}
	if notificationHasDedicatedEmail(model.NotifyApprovalRejected) {
		t.Fatal("reject should go through notification email")
	}
	if notificationHasDedicatedEmail(model.NotifyApprovalComment) {
		t.Fatal("comment should go through notification email")
	}
}

func TestNotificationNoticeEmail_AIDoneHasFileButtonNotPrompt(t *testing.T) {
	subject, body := notificationNoticeEmail("Erman", NotificationInput{
		Type:  model.NotifyAIImageDone,
		Title: "Картинка готова",
		Body:  "Файл сохранён в папке «AI контент».",
		Href:  "/files?folder=folder-1&file=file-1",
	}, "https://postilka.ru/app/files?folder=folder-1&file=file-1")
	if subject != "Postilka — Картинка готова" {
		t.Fatalf("subject: %s", subject)
	}
	if strings.Contains(body.ContentHTML, "watercolor") || strings.Contains(body.ContentHTML, "промпт") {
		t.Fatal("email must not include generation prompt")
	}
	if body.CTALabel != "Открыть файл" {
		t.Fatalf("cta: %s", body.CTALabel)
	}
	if !strings.Contains(body.CTAURL, "file=file-1") || !strings.Contains(body.CTAURL, "folder=folder-1") {
		t.Fatalf("cta url: %s", body.CTAURL)
	}

	_, videoBody := notificationNoticeEmail("Erman", NotificationInput{
		Type: model.NotifyAIVideoDone,
		Href: "/files?file=vid-1",
	}, "https://postilka.ru/app/files?file=vid-1")
	if videoBody.CTALabel != "Открыть файл" {
		t.Fatalf("video cta: %s", videoBody.CTALabel)
	}
}
