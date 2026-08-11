package service

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

const telegramVideoNoteDiameter = 640

func prepareTelegramVideoNoteBytes(videoData []byte) ([]byte, error) {
	if len(videoData) == 0 {
		return nil, fmt.Errorf("%w: пустой видеофайл для кружка Telegram", ErrInvalidPost)
	}
	dir, err := os.MkdirTemp("", "postilka-telegram-video-note-*")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)

	inputPath := filepath.Join(dir, "input")
	outputPath := filepath.Join(dir, "note.mp4")
	if err := os.WriteFile(inputPath, videoData, 0o600); err != nil {
		return nil, err
	}

	// Telegram video notes: square MPEG4, up to 60s, typically 640x640.
	cmd := exec.Command(
		"ffmpeg",
		"-y",
		"-hide_banner",
		"-loglevel", "error",
		"-i", inputPath,
		"-t", "60",
		"-map", "0:v:0",
		"-map", "0:a:0?",
		"-vf", "crop=min(iw\\,ih):min(iw\\,ih),scale=640:640:flags=lanczos",
		"-c:v", "libx264",
		"-pix_fmt", "yuv420p",
		"-c:a", "aac",
		"-b:a", "128k",
		"-movflags", "+faststart",
		outputPath,
	)
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("%w: не удалось подготовить видео для кружка Telegram (нужен ffmpeg и MP4/H.264)", ErrInvalidPost)
	}

	out, err := os.ReadFile(outputPath)
	if err != nil {
		return nil, err
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("%w: ffmpeg вернул пустой файл для кружка Telegram", ErrInvalidPost)
	}
	if len(out) > maxTelegramVideoNoteBytes {
		return nil, fmt.Errorf(
			"%w: видео для кружка Telegram после подготовки превышает %d МБ",
			ErrInvalidPost,
			maxTelegramVideoNoteBytes>>20,
		)
	}
	return out, nil
}
