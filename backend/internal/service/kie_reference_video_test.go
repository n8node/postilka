package service

import (
	"os/exec"
	"testing"
)

func TestKieReferenceVideoKind(t *testing.T) {
	t.Parallel()
	tests := []struct {
		ct, name, want string
	}{
		{"video/webm", "clip.webm", "webm"},
		{"application/octet-stream", "clip.webm", "webm"},
		{"video/mp4", "phone.mp4", "mp4"},
		{"video/quicktime", "IMG_001.MOV", "mov"},
		{"", "clip.mov", "mov"},
		{"video/x-matroska", "a.mkv", "mkv"},
		{"video/avi", "old.avi", "avi"},
		{"video/mp4", "clip.m4v", "mp4"},
	}
	for _, tt := range tests {
		if got := kieReferenceVideoKind(tt.ct, tt.name); got != tt.want {
			t.Fatalf("kind(%q, %q) = %q, want %q", tt.ct, tt.name, got, tt.want)
		}
	}
}

func TestIsKieNativeReferenceVideo(t *testing.T) {
	t.Parallel()
	if !isKieNativeReferenceVideo("video/mp4", "a.mp4") {
		t.Fatal("mp4 should be native")
	}
	if !isKieNativeReferenceVideo("video/quicktime", "a.mov") {
		t.Fatal("mov should be native")
	}
	if isKieNativeReferenceVideo("video/webm", "a.webm") {
		t.Fatal("webm should not be native")
	}
	if isKieNativeReferenceVideo("application/octet-stream", "a.webm") {
		t.Fatal("octet-stream webm should not be native")
	}
}

func TestKieMediaMaxBytesOctetStreamWebM(t *testing.T) {
	t.Parallel()
	if n := kieMediaMaxBytes("application/octet-stream", "clip.webm"); n != kieReferenceVideoMaxBytes {
		t.Fatalf("max bytes = %d, want %d", n, kieReferenceVideoMaxBytes)
	}
	if n := kieUploadMaxBytes("application/octet-stream"); n != 0 {
		t.Fatalf("kieUploadMaxBytes(octet-stream) = %d, want 0", n)
	}
}

func TestPrepareKieReferenceVideoRejectsEmpty(t *testing.T) {
	t.Parallel()
	_, err := prepareKieReferenceVideo(nil, "video/mp4", "a.mp4", false)
	if err != ErrGenerationUploadInvalid {
		t.Fatalf("empty: %v", err)
	}
}

func TestTranscodeToKieReferenceMP4SkipWithoutFFmpeg(t *testing.T) {
	if _, err := exec.LookPath("ffmpeg"); err != nil {
		t.Skip("ffmpeg not in PATH")
	}
	_, err := transcodeToKieReferenceMP4([]byte("not-a-video"), "clip.webm")
	if err == nil {
		t.Fatal("expected ffmpeg to fail on garbage input")
	}
}
