package service

import (
	"testing"

	"github.com/postilka/postilka/internal/model"
)

func TestParseAgentChatJSON(t *testing.T) {
	payload, reply := parseAgentChat(`{"reply":"Привет","mission_patch":{"title":"Запуск"},"plan":null}`)
	if payload == nil {
		t.Fatal("expected payload")
	}
	if reply != "Привет" {
		t.Fatalf("reply=%q", reply)
	}
	if payload.MissionPatch == nil || payload.MissionPatch.Title != "Запуск" {
		t.Fatalf("patch=%+v", payload.MissionPatch)
	}
}

func TestParseAgentChatPlain(t *testing.T) {
	payload, reply := parseAgentChat("Просто текст")
	if payload != nil {
		t.Fatalf("expected nil payload, got %+v", payload)
	}
	if reply != "Просто текст" {
		t.Fatalf("reply=%q", reply)
	}
}

func TestParseAgentChatPlanMedia(t *testing.T) {
	raw := `{"reply":"Ход готов","plan":{"items":[{"role":"attention","text":"Смотрите","format":"short_video","media_kind":"video","file_ids":["11111111-1111-1111-1111-111111111111"],"buttons":[{"text":"Сайт","url":"https://postilka.ru"}]}]}}`
	payload, reply := parseAgentChat(raw)
	if payload == nil || reply != "Ход готов" {
		t.Fatalf("payload=%+v reply=%q", payload, reply)
	}
	if payload.Plan == nil || len(payload.Plan.Items) != 1 {
		t.Fatalf("plan=%+v", payload.Plan)
	}
	item := payload.Plan.Items[0]
	if item.Format != "short_video" || item.MediaKind != "video" || len(item.FileIDs) != 1 {
		t.Fatalf("item=%+v", item)
	}
}

func TestNormalizePlanItemsKeepsMedia(t *testing.T) {
	mission := &model.Mission{ChannelIDs: []string{"ch-1"}}
	items := normalizePlanItems([]model.MissionPlanItem{{
		Role:      model.MissionPlanRoleProof,
		Text:      "Доказательство",
		Format:    "wall_post",
		FileIDs:   []string{"11111111-1111-1111-1111-111111111111", "not-a-uuid"},
		MediaKind: "photo",
		Buttons:   []model.MissionPlanButton{{Text: "Открыть", URL: "https://postilka.ru"}, {Text: "bad", URL: "ftp://x"}},
		PostID:    "post-1",
	}}, mission, true)
	if len(items) != 1 {
		t.Fatalf("len=%d", len(items))
	}
	if items[0].Format != "message" {
		t.Fatalf("format=%s", items[0].Format)
	}
	if len(items[0].FileIDs) != 1 || items[0].PostID != "post-1" {
		t.Fatalf("item=%+v", items[0])
	}
	if len(items[0].Buttons) != 1 || items[0].Buttons[0].URL != "https://postilka.ru" {
		t.Fatalf("buttons=%+v", items[0].Buttons)
	}
}

func TestResolveItemFormatIntersection(t *testing.T) {
	tg := model.Channel{Provider: model.ChannelProviderTelegram}
	vk := model.Channel{Provider: model.ChannelProviderVK}
	if got := resolveItemFormat("article", []model.Channel{tg, vk}); got != "message" {
		t.Fatalf("tg+vk article -> %s", got)
	}
	yt := model.Channel{Provider: model.ChannelProviderYouTube}
	if got := resolveItemFormat("message", []model.Channel{yt}); got != "video" {
		t.Fatalf("youtube message -> %s", got)
	}
}

func TestBuildPlanDraftRequestButtons(t *testing.T) {
	tg := model.Channel{ID: "tg", Provider: model.ChannelProviderTelegram}
	req := buildPlanDraftRequest(model.MissionPlanItem{
		Text:    "Привет",
		Format:  "message",
		Buttons: []model.MissionPlanButton{{Text: "Сайт", URL: "https://postilka.ru"}},
	}, []model.Channel{tg}, "mission-test", true)
	if len(req.Content.Buttons) != 1 || req.Content.Buttons[0][0].URL != "https://postilka.ru" {
		t.Fatalf("buttons=%+v", req.Content.Buttons)
	}
	vk := model.Channel{ID: "vk", Provider: model.ChannelProviderVK}
	mixed := buildPlanDraftRequest(model.MissionPlanItem{
		Text:    "Привет",
		Format:  "message",
		Buttons: []model.MissionPlanButton{{Text: "Сайт", URL: "https://postilka.ru"}},
	}, []model.Channel{tg, vk}, "mission-test", false)
	if len(mixed.Content.Buttons) != 0 {
		t.Fatalf("mixed channels should drop buttons, got %+v", mixed.Content.Buttons)
	}
}

func TestMeasurabilityForMetric(t *testing.T) {
	if measurabilityForMetric(model.MissionMetricClicks) != model.MissionMeasurabilityAutomatic {
		t.Fatal("clicks should be automatic")
	}
	if measurabilityForMetric(model.MissionMetricManual) != model.MissionMeasurabilityManual {
		t.Fatal("manual")
	}
	if measurabilityForMetric(model.MissionMetricLikes) != model.MissionMeasurabilityPartial {
		t.Fatal("likes")
	}
}
