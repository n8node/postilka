package service

import (
	"strings"
	"testing"
)

func TestShortsVerticalFilter(t *testing.T) {
	filter := ShortsVerticalFilter(1920, 1080)
	if filter == "" || filter == "null" {
		t.Fatal("expected vertical ffmpeg filter")
	}
	if filter != "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:(iw-1080)/2:(ih-1920)/2,format=yuv420p" {
		t.Fatalf("unexpected filter: %s", filter)
	}
}

func TestBuildShortsASSShiftsAndEscapesText(t *testing.T) {
	ass := BuildShortsASS([]ShortsTranscriptSegment{{StartSeconds: 10, EndSeconds: 12, Text: "Привет {мир}"}}, 10, 20, ShortsSubtitleConfig{Style: "classic", Position: "bottom"})
	if !strings.Contains(ass, "0:00:00.00,0:00:02.00") {
		t.Fatalf("unexpected timing: %s", ass)
	}
	if strings.Contains(ass, "{мир}") {
		t.Fatal("ASS override braces were not escaped")
	}
}
