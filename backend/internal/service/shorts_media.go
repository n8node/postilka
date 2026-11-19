package service

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// ExtractShortsAudio creates a temporary MP3 without loading the source video
// into memory. The caller owns the returned file and must remove it.
func ExtractShortsAudio(ctx context.Context, inputPath string) (string, error) {
	if strings.TrimSpace(inputPath) == "" {
		return "", fmt.Errorf("input video path is required")
	}
	outputPath := filepath.Join(os.TempDir(), fmt.Sprintf("postilka-shorts-audio-%d.mp3", time.Now().UnixNano()))
	cmd := exec.CommandContext(ctx, "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", inputPath, "-vn", "-codec:a", "libmp3lame", "-b:a", "192k", outputPath)
	if output, err := cmd.CombinedOutput(); err != nil {
		_ = os.Remove(outputPath)
		return "", fmt.Errorf("extract mp3: %w: %s", err, strings.TrimSpace(string(output)))
	}
	return outputPath, nil
}

func ValidateShortsVideoFile(mimeType string) bool {
	return strings.HasPrefix(strings.ToLower(strings.TrimSpace(mimeType)), "video/")
}
