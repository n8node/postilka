package service

import "testing"

func TestShortsVerticalFilter(t *testing.T) {
	filter := ShortsVerticalFilter(1920, 1080)
	if filter == "" || filter == "null" {
		t.Fatal("expected vertical ffmpeg filter")
	}
	if filter != "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:(iw-1080)/2:(ih-1920)/2,format=yuv420p" {
		t.Fatalf("unexpected filter: %s", filter)
	}
}
