package service

import (
	"strings"
	"testing"
	"time"

	"github.com/postilka/postilka/internal/model"
)

func TestFormatOpsDigestMessage(t *testing.T) {
	now := time.Date(2026, 8, 29, 9, 0, 0, 0, moscowLocation)
	text := formatOpsDigestMessage(now, []model.OpsCheck{
		{Key: "telegram_proxy", Label: "Телеграм прокси", Group: model.OpsGroupSystem, Status: model.OpsCheckOK},
		{Key: "processes", Label: "Процессы", Group: model.OpsGroupSystem, Status: model.OpsCheckWarn, Detail: "нет сигнала"},
		{Key: "vk", Label: "ВКонтакте", Group: model.OpsGroupSocial, Status: model.OpsCheckOK},
		{Key: "youtube", Label: "YouTube", Group: model.OpsGroupSocial, Status: model.OpsCheckSkip, Detail: "не настроено"},
	})

	if !strings.Contains(text, "<b>Система</b>") || !strings.Contains(text, "<b>Соцсети</b>") {
		t.Fatalf("expected section headers, got %q", text)
	}
	if !strings.Contains(text, "────────") {
		t.Fatalf("expected visual separator, got %q", text)
	}
	if !strings.Contains(text, "✅ Телеграм прокси") {
		t.Fatalf("expected system ok line, got %q", text)
	}
	if !strings.Contains(text, "⚠️ Процессы — нет сигнала") {
		t.Fatalf("expected warn line, got %q", text)
	}
	if !strings.Contains(text, "⏸ YouTube — не настроено") {
		t.Fatalf("expected skip line, got %q", text)
	}
	if strings.Contains(strings.ToLower(text), "credit") || strings.Contains(text, "кредит") {
		t.Fatalf("digest must not mention credits: %q", text)
	}
	if !strings.Contains(text, "Система: 1 ок, 1 предупреждение") {
		t.Fatalf("expected system summary, got %q", text)
	}
	if !strings.Contains(text, "Соцсети: 1 ок, 1 не настроено") {
		t.Fatalf("expected social summary, got %q", text)
	}
}

func TestSanitizeOpsReasonStripsSecretsAndCredits(t *testing.T) {
	if got := sanitizeOpsReason("connected, 12 models, credits: 128.0"); got != "нет связи" {
		t.Fatalf("credits leaked: %q", got)
	}
	if got := sanitizeOpsReason("proxy http://user:pass@host:3128 failed"); got != "нет связи" {
		t.Fatalf("url leaked: %q", got)
	}
	if got := sanitizeOpsReason("telegram api: bot123:AASECRET invalid"); !strings.Contains(got, "bot***") {
		t.Fatalf("token not masked: %q", got)
	}
}
