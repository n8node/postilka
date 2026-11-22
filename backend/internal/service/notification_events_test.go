package service

import (
	"testing"

	"github.com/postilka/postilka/internal/model"
)

func TestShortsDoneHrefEscapesProjectID(t *testing.T) {
	got := shortsDoneHref("project id")
	if got != "/app/shorts?project=project+id&step=clips" {
		t.Fatalf("unexpected Shorts notification href: %s", got)
	}
}

func TestShortsDoneNotificationUsesAIChannelPreference(t *testing.T) {
	if got := model.NotificationPrefKeyForType(model.NotifyShortsDone); got != model.NotifyPrefAI {
		t.Fatalf("expected Shorts notification to use AI preferences, got %s", got)
	}
}
