package ai

import "testing"

func TestBuildVideoTaskInput_KlingV3AspectClamp(t *testing.T) {
	input := BuildVideoTaskInput(
		"kling/v3-turbo-text-to-video",
		"text-to-video",
		"test prompt",
		"21:9",
		5,
		nil,
	)
	if input["aspect_ratio"] != "16:9" {
		t.Fatalf("aspect_ratio=%v want 16:9", input["aspect_ratio"])
	}
	if input["resolution"] != "720p" {
		t.Fatalf("resolution=%v want 720p", input["resolution"])
	}
	if input["duration"] != "5" {
		t.Fatalf("duration=%v want 5", input["duration"])
	}
}

func TestBuildVideoTaskInput_DefaultResolutionNot768(t *testing.T) {
	input := BuildVideoTaskInput(
		"grok-imagine/text-to-video",
		"text-to-video",
		"test",
		"16:9",
		5,
		nil,
	)
	if input["resolution"] == DefaultVideoResolution {
		t.Fatalf("resolution should not be legacy %q", DefaultVideoResolution)
	}
	if input["resolution"] != "720p" {
		t.Fatalf("resolution=%v want 720p", input["resolution"])
	}
}
