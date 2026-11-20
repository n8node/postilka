package service

import "context"

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
