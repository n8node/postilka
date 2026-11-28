package service

import (
	"context"
	"encoding/json"
)

type ShortsTranscriptSegment struct {
	StartSeconds float64                `json:"start_seconds"`
	EndSeconds   float64                `json:"end_seconds"`
	Text         string                 `json:"text"`
	Words        []ShortsTranscriptWord `json:"words,omitempty"`
}

type ShortsTranscriptWord struct {
	Word         string  `json:"word"`
	StartSeconds float64 `json:"start_seconds"`
	EndSeconds   float64 `json:"end_seconds"`
}

type ShortsTranscript struct {
	Language  string                    `json:"language"`
	Text      string                    `json:"text"`
	Segments  []ShortsTranscriptSegment `json:"segments"`
	RawResult json.RawMessage           `json:"raw_result,omitempty"`
}

type ShortsTranscriber interface {
	Transcribe(ctx context.Context, audioPath string) (ShortsTranscript, error)
}
