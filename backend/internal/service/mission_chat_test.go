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
