package service

import (
	"strings"
	"testing"

	"github.com/postilka/postilka/internal/model"
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

func TestShortsCropFilterInterpolatesKeyframes(t *testing.T) {
	filter := shortsCropFilter(model.ShortsCropConfig{
		AspectRatio: "9:16",
		Keyframes: []model.ShortsCropKeyframe{
			{Time: 0, CenterX: 0.2, CenterY: 0.5, Scale: 1},
			{Time: 2, CenterX: 0.8, CenterY: 0.4, Scale: 1.5},
		},
	}, 4)
	for _, fragment := range []string{"if(lt(t\\,2.000000)", "(t-0.000000)/2.000000", "crop=1080:1920", "scale=w="} {
		if !strings.Contains(filter, fragment) {
			t.Fatalf("expected %q in filter: %s", fragment, filter)
		}
	}
}

func TestShortsCropFilterUsesAspectRatio(t *testing.T) {
	filter := ShortsCropFilter(model.ShortsCropConfig{AspectRatio: "1:1"})
	if !strings.Contains(filter, "crop=1080:1080") {
		t.Fatalf("expected square output: %s", filter)
	}
	filter = ShortsCropFilter(model.ShortsCropConfig{AspectRatio: "16:9"})
	if !strings.Contains(filter, "crop=1920:1080") {
		t.Fatalf("expected landscape output: %s", filter)
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
