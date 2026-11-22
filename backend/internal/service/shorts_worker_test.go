package service

import (
	"encoding/json"
	"testing"
)

func TestShortsProcessingRangeFromSettings(t *testing.T) {
	settings, _ := json.Marshal(map[string]float64{"processing_start_seconds": 15, "processing_end_seconds": 115})
	start, end := shortsProcessingRangeFromSettings(settings, 721)
	if start != 15 || end != 115 {
		t.Fatalf("expected selected range 15..115, got %v..%v", start, end)
	}
}

func TestShortsProcessingRangeFromSettingsFallsBackForInvalidRange(t *testing.T) {
	settings, _ := json.Marshal(map[string]float64{"processing_start_seconds": 200, "processing_end_seconds": 100})
	start, end := shortsProcessingRangeFromSettings(settings, 721)
	if start != 0 || end != 721 {
		t.Fatalf("expected full-video fallback, got %v..%v", start, end)
	}
}

func TestValidateShortsVideoFileTrimsAndNormalizes(t *testing.T) {
	if !ValidateShortsVideoFile("  VIDEO/MP4 ") {
		t.Fatal("expected normalized video MIME")
	}
	if ValidateShortsVideoFile("video") {
		t.Fatal("expected incomplete MIME to be rejected")
	}
}
