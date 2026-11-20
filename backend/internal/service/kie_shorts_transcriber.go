package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/ai"
)

type KieShortsTranscriber struct {
	Config  *KieConfigService
	Storage *ObjectStorage
}

func (t KieShortsTranscriber) Transcribe(ctx context.Context, audioPath string) (ShortsTranscript, error) {
	if t.Config == nil || t.Storage == nil {
		return ShortsTranscript{}, fmt.Errorf("transcription is not configured")
	}
	settings, err := t.Config.GetSettings(ctx)
	if err != nil {
		return ShortsTranscript{}, err
	}
	if !settings.TranscriptionEnabled {
		return ShortsTranscript{}, fmt.Errorf("transcription is disabled")
	}
	baseURL, apiKey, err := t.Config.ResolveCredentials(ctx)
	if err != nil {
		return ShortsTranscript{}, err
	}
	info, err := os.Stat(audioPath)
	if err != nil {
		return ShortsTranscript{}, err
	}
	key := fmt.Sprintf("transcription/%d/audio.mp3", info.ModTime().UnixNano())
	if err := t.Storage.PutObjectFromFile(ctx, key, "audio/mpeg", audioPath); err != nil {
		return ShortsTranscript{}, err
	}
	defer t.Storage.DeleteObject(ctx, key)
	url, err := t.Storage.PresignGetWithOptions(ctx, key, PresignGetOptions{Expires: 2 * time.Hour, Inline: true})
	if err != nil {
		return ShortsTranscript{}, err
	}
	client := ai.NewKieClient(baseURL, apiKey)
	taskID, err := client.CreateTask(ctx, ai.KieCreateTaskRequest{Model: settings.TranscriptionModel, Input: map[string]any{"audio_url": url, "timestamps": true}})
	if err != nil {
		return ShortsTranscript{}, err
	}
	detail, err := client.WaitForTask(ctx, taskID)
	if err != nil {
		return ShortsTranscript{}, err
	}
	raw, err := client.DownloadResult(ctx, detail)
	if err != nil {
		return ShortsTranscript{}, err
	}
	return parseKieTranscript(raw)
}

func parseKieTranscript(raw []byte) (ShortsTranscript, error) {
	var payload struct {
		Language   string `json:"language"`
		Text       string `json:"text"`
		Transcript string `json:"transcript"`
		Words      []struct {
			Word      string  `json:"word"`
			Start     float64 `json:"start"`
			End       float64 `json:"end"`
			StartTime float64 `json:"start_time"`
			EndTime   float64 `json:"end_time"`
		} `json:"words"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return ShortsTranscript{}, fmt.Errorf("parse transcription result: %w", err)
	}
	segments := make([]ShortsTranscriptSegment, 0)
	var current strings.Builder
	var start, end float64
	flush := func() {
		if current.Len() > 0 && end > start {
			segments = append(segments, ShortsTranscriptSegment{StartSeconds: start, EndSeconds: end, Text: strings.TrimSpace(current.String())})
			current.Reset()
		}
	}
	for _, word := range payload.Words {
		wordStart, wordEnd := word.Start, word.End
		if wordEnd <= wordStart {
			wordStart, wordEnd = word.StartTime, word.EndTime
		}
		if wordEnd <= wordStart || strings.TrimSpace(word.Word) == "" {
			continue
		}
		if current.Len() == 0 {
			start = wordStart
		}
		if current.Len() > 0 {
			current.WriteByte(' ')
		}
		current.WriteString(strings.TrimSpace(word.Word))
		end = wordEnd
		if wordEnd-start >= 8 {
			flush()
		}
	}
	flush()
	text := strings.TrimSpace(payload.Text)
	if text == "" {
		text = strings.TrimSpace(payload.Transcript)
	}
	if text == "" {
		for _, segment := range segments {
			if text != "" {
				text += " "
			}
			text += segment.Text
		}
	}
	if len(segments) == 0 || text == "" {
		return ShortsTranscript{}, fmt.Errorf("transcription result has no timed words")
	}
	return ShortsTranscript{Language: payload.Language, Text: text, Segments: segments}, nil
}
