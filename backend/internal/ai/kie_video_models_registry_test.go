package ai

import "testing"

func TestBuildVideoTaskInput_MiniMaxH3TextToVideo(t *testing.T) {
	input := BuildVideoTaskInput(
		"minimax-h3/text-to-video",
		"text-to-video",
		"test prompt",
		"21:9",
		5,
		VideoTaskSources{},
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
		VideoTaskSources{
			FirstFrameURL: "https://example.com/first.jpg",
			LastFrameURL:  "https://example.com/last.jpg",
		},
	)
	if _, ok := input["aspect_ratio"]; ok {
		t.Fatalf("image-to-video should not include aspect_ratio, got %v", input["aspect_ratio"])
	}
	if input["first_frame_url"] != "https://example.com/first.jpg" {
		t.Fatalf("first_frame_url=%v", input["first_frame_url"])
	}
	if input["last_frame_url"] != "https://example.com/last.jpg" {
		t.Fatalf("last_frame_url=%v", input["last_frame_url"])
	}
}

func TestBuildVideoTaskInput_MiniMaxH3ReferenceToVideo(t *testing.T) {
	input := BuildVideoTaskInput(
		"minimax-h3/reference-to-video",
		"reference-to-video",
		"test",
		"4:3",
		8,
		VideoTaskSources{
			ReferenceImageURLs: []string{"https://example.com/a.jpg"},
			ReferenceVideoURLs: []string{"https://example.com/v.mp4"},
			ReferenceAudioURLs: []string{"https://example.com/a.mp3"},
		},
	)
	refs, ok := input["reference_image_urls"].([]string)
	if !ok || len(refs) != 1 {
		t.Fatalf("reference_image_urls=%v", input["reference_image_urls"])
	}
	vids, ok := input["reference_video_urls"].([]string)
	if !ok || len(vids) != 1 {
		t.Fatalf("reference_video_urls=%v", input["reference_video_urls"])
	}
	auds, ok := input["reference_audio_urls"].([]string)
	if !ok || len(auds) != 1 {
		t.Fatalf("reference_audio_urls=%v", input["reference_audio_urls"])
	}
	if input["aspect_ratio"] != "4:3" {
		t.Fatalf("aspect_ratio=%v want 4:3", input["aspect_ratio"])
	}
}

func TestBuildVideoTaskInput_GenericReferenceIncludesVideo(t *testing.T) {
	input := BuildVideoTaskInput(
		"wan/2-7-r2v",
		"reference-to-video",
		"test",
		"16:9",
		8,
		VideoTaskSources{
			ReferenceImageURLs: []string{"https://example.com/a.jpg"},
			ReferenceVideoURLs: []string{"https://example.com/v.mp4"},
		},
	)
	refs, ok := input["reference_image"].([]string)
	if !ok || len(refs) != 1 {
		t.Fatalf("reference_image=%v", input["reference_image"])
	}
	vids, ok := input["reference_video"].([]string)
	if !ok || len(vids) != 1 {
		t.Fatalf("reference_video=%v", input["reference_video"])
	}
}

func TestBuildVideoTaskInput_KlingV3AspectClamp(t *testing.T) {
	input := BuildVideoTaskInput(
		"kling/v3-turbo-text-to-video",
		"text-to-video",
		"test prompt",
		"21:9",
		5,
		VideoTaskSources{},
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
