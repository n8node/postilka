package service

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

func extractVideoPreviewJPEG(videoData []byte) ([]byte, error) {
	dir, err := os.MkdirTemp("", "postilka-video-preview-*")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)

	videoPath := filepath.Join(dir, "input.mp4")
	if err := os.WriteFile(videoPath, videoData, 0o600); err != nil {
		return nil, err
	}
	outPath := filepath.Join(dir, "preview.jpg")
	cmd := exec.Command(
		"ffmpeg",
		"-y",
		"-hide_banner",
		"-loglevel", "error",
		"-i", videoPath,
		"-ss", "00:00:00.500",
		"-vframes", "1",
		"-vf", "scale=320:-2",
		"-q:v", "6",
		outPath,
	)
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ffmpeg preview: %w", err)
	}
	return os.ReadFile(outPath)
}
