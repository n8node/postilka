package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
)

type ShortsTranscriptSegment struct {
	StartSeconds float64 `json:"start_seconds"`
	EndSeconds   float64 `json:"end_seconds"`
	Text         string  `json:"text"`
}

type ShortsTranscript struct {
	Language string                    `json:"language"`
	Text     string                    `json:"text"`
	Segments []ShortsTranscriptSegment `json:"segments"`
}

type ShortsTranscriber interface {
	Transcribe(ctx context.Context, audioPath string) (ShortsTranscript, error)
}

type CommandShortsTranscriber struct {
	Command string
}

func (t CommandShortsTranscriber) Transcribe(ctx context.Context, audioPath string) (ShortsTranscript, error) {
	command := strings.TrimSpace(t.Command)
	if command == "" {
		return ShortsTranscript{}, fmt.Errorf("shorts transcriber is not configured")
	}
	cmd := exec.CommandContext(ctx, command, audioPath)
	output, err := cmd.Output()
	if err != nil {
		return ShortsTranscript{}, fmt.Errorf("transcribe audio: %w", err)
	}
	var transcript ShortsTranscript
	if err := json.Unmarshal(output, &transcript); err != nil {
		return ShortsTranscript{}, fmt.Errorf("parse transcript JSON: %w", err)
	}
	for _, segment := range transcript.Segments {
		if segment.EndSeconds <= segment.StartSeconds || strings.TrimSpace(segment.Text) == "" {
			return ShortsTranscript{}, fmt.Errorf("invalid transcript segment")
		}
	}
	return transcript, nil
}
