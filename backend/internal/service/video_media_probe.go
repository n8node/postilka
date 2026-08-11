package service

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

const (
	kieReferenceVideoMinDurationSec       = 2.0
	kieReferenceVideoMaxDurationSec       = 15.0
	kieReferenceVideoDurationToleranceSec = 0.5 // MP4/ffprobe often reports slightly over nominal length
)

func referenceVideoMaxAllowedDurationSec() float64 {
	return kieReferenceVideoMaxDurationSec + kieReferenceVideoDurationToleranceSec
}

var ErrReferenceVideoDuration = errors.New("reference video duration must be between 2 and 15 seconds")

func referenceVideoDurationUserMessage(seconds float64) string {
	if seconds <= 0 {
		return "Не удалось определить длительность референс-видео. Выберите другой файл."
	}
	return fmt.Sprintf(
		"Референс-видео должно быть от 2 до 15 секунд (сейчас %.1f сек). Выберите более короткий ролик.",
		seconds,
	)
}

func validateReferenceVideoDuration(seconds float64) error {
	if seconds < kieReferenceVideoMinDurationSec || seconds > referenceVideoMaxAllowedDurationSec() {
		return fmt.Errorf("%w (%.3f sec)", ErrReferenceVideoDuration, seconds)
	}
	return nil
}

// ReferenceVideoDurationHTTPMessage returns a user-facing message, including probed duration when available.
func ReferenceVideoDurationHTTPMessage(err error) string {
	return referenceVideoDurationUserMessage(extractReferenceVideoDurationSeconds(err))
}

func extractReferenceVideoDurationSeconds(err error) float64 {
	for err != nil {
		msg := err.Error()
		if i := strings.LastIndex(msg, " sec)"); i > 0 {
			start := strings.LastIndex(msg[:i], "(")
			if start >= 0 {
				raw := strings.TrimSpace(msg[start+1 : i])
				if seconds, parseErr := strconv.ParseFloat(raw, 64); parseErr == nil {
					return seconds
				}
			}
		}
		err = errors.Unwrap(err)
	}
	return 0
}

func probeVideoDurationSeconds(data []byte) (float64, error) {
	if len(data) == 0 {
		return 0, errors.New("empty video")
	}
	dir, err := os.MkdirTemp("", "postilka-video-probe-*")
	if err != nil {
		return 0, err
	}
	defer os.RemoveAll(dir)

	videoPath := filepath.Join(dir, "input.mp4")
	if err := os.WriteFile(videoPath, data, 0o600); err != nil {
		return 0, err
	}

	cmd := exec.Command(
		"ffprobe",
		"-v", "error",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		videoPath,
	)
	out, err := cmd.Output()
	if err != nil {
		return 0, fmt.Errorf("ffprobe duration: %w", err)
	}
	raw := strings.TrimSpace(string(out))
	if raw == "" {
		return 0, errors.New("ffprobe returned empty duration")
	}
	seconds, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return 0, fmt.Errorf("parse duration %q: %w", raw, err)
	}
	return seconds, nil
}
