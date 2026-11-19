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

func ShortsVerticalFilter(width, height int) string {
	// Scale to cover a 1080x1920 canvas, then center-crop. The expressions are
	// deterministic and work for landscape, portrait, and square inputs.
	_ = width
	_ = height
	return "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:(iw-1080)/2:(ih-1920)/2,format=yuv420p"
}

func RenderShortsDraft(ctx context.Context, inputPath string, startSeconds, endSeconds float64) (string, error) {
	if strings.TrimSpace(inputPath) == "" || endSeconds <= startSeconds {
		return "", fmt.Errorf("invalid shorts render input")
	}
	outputPath := filepath.Join(os.TempDir(), fmt.Sprintf("postilka-shorts-draft-%d.mp4", time.Now().UnixNano()))
	duration := fmt.Sprintf("%.3f", endSeconds-startSeconds)
	cmd := exec.CommandContext(ctx, "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", fmt.Sprintf("%.3f", startSeconds), "-i", inputPath, "-t", duration, "-vf", ShortsVerticalFilter(0, 0), "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", outputPath)
	if output, err := cmd.CombinedOutput(); err != nil {
		_ = os.Remove(outputPath)
		return "", fmt.Errorf("render shorts draft: %w: %s", err, strings.TrimSpace(string(output)))
	}
	return outputPath, nil
}
