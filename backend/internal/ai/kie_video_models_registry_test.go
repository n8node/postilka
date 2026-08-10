package ai

import "testing"

func TestBuildVideoTaskInput_MiniMaxH3TextToVideo(t *testing.T) {
	input := BuildVideoTaskInput(
		"minimax-h3/text-to-video",
		"text-to-video",
		"test prompt",
		"21:9",
		5,
		nil,
	)
	if input["aspect_ratio"] != "21:9" {
		t.Fatalf("aspect_ratio=%v want 21:9", input["aspect_ratio"])
	}
	if input["resolution"] != "768P" {
		t.Fatalf("resolution=%v want 768P", input["resolution"])
	}
	if input["duration"] != 5 {
		t.Fatalf("duration=%v want int 5", input["duration"])
	}
}

func TestBuildVideoTaskInput_MiniMaxH3ImageToVideo(t *testing.T) {
	input := BuildVideoTaskInput(
		"minimax-h3/image-to-video",
		"image-to-video",
		"test",
		"16:9",
		6,
		[]string{"https://example.com/frame.jpg"},
	)
	if _, ok := input["aspect_ratio"]; ok {
		t.Fatalf("image-to-video should not include aspect_ratio, got %v", input["aspect_ratio"])
	}
	if input["first_frame_url"] != "https://example.com/frame.jpg" {
		t.Fatalf("first_frame_url=%v", input["first_frame_url"])
	}
	if input["duration"] != 6 {
		t.Fatalf("duration=%v want int 6", input["duration"])
	}
}

func TestBuildVideoTaskInput_MiniMaxH3ReferenceToVideo(t *testing.T) {
	urls := []string{"https://example.com/a.jpg", "https://example.com/b.jpg"}
	input := BuildVideoTaskInput(
		"minimax-h3/reference-to-video",
		"reference-to-video",
		"test",
		"4:3",
		8,
		urls,
	)
	refs, ok := input["reference_image_urls"].([]string)
	if !ok || len(refs) != 2 {
		t.Fatalf("reference_image_urls=%v", input["reference_image_urls"])
	}
	if input["aspect_ratio"] != "4:3" {
		t.Fatalf("aspect_ratio=%v want 4:3", input["aspect_ratio"])
	}
}

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
		t.Fatalf("duration=%v want string 5", input["duration"])
	}
}
