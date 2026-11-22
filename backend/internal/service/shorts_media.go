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
	return ExtractShortsAudioRange(ctx, inputPath, 0, 0)
}

// ExtractShortsAudioRange extracts only the selected source interval. A zero
// duration means the interval extends to the end of the input.
func ExtractShortsAudioRange(ctx context.Context, inputPath string, startSeconds, durationSeconds float64) (string, error) {
	if strings.TrimSpace(inputPath) == "" {
		return "", fmt.Errorf("input video path is required")
	}
	if startSeconds < 0 || durationSeconds < 0 {
		return "", fmt.Errorf("invalid audio extraction range")
	}
	outputPath := filepath.Join(os.TempDir(), fmt.Sprintf("postilka-shorts-audio-%d.mp3", time.Now().UnixNano()))
	args := []string{"-hide_banner", "-loglevel", "error", "-y"}
	if startSeconds > 0 {
		args = append(args, "-ss", fmt.Sprintf("%.3f", startSeconds))
	}
	args = append(args, "-i", inputPath)
	if durationSeconds > 0 {
		args = append(args, "-t", fmt.Sprintf("%.3f", durationSeconds))
	}
	args = append(args, "-vn", "-codec:a", "libmp3lame", "-b:a", "192k", outputPath)
	cmd := exec.CommandContext(ctx, "ffmpeg", args...)
	if output, err := cmd.CombinedOutput(); err != nil {
		_ = os.Remove(outputPath)
		return "", fmt.Errorf("extract mp3: %w: %s", err, strings.TrimSpace(string(output)))
	}
	return outputPath, nil
}

func ValidateShortsVideoFile(mimeType string) bool {
	return strings.HasPrefix(strings.ToLower(strings.TrimSpace(mimeType)), "video/")
}
