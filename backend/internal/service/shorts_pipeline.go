package service

import (
	"errors"
	"math"
	"sort"
	"strings"
)

const ShortsKieMaxSegmentSeconds = 15.0
const ShortsCandidateMaxSeconds = 60.0

var (
	ErrInvalidShortsRange      = errors.New("invalid shorts processing range")
	ErrShortsRangeOutsideVideo = errors.New("shorts processing range is outside video")
)

type ShortsProcessingRange struct {
	StartSeconds float64 `json:"start_seconds"`
	EndSeconds   float64 `json:"end_seconds"`
}

func (r ShortsProcessingRange) DurationSeconds() float64 {
	return r.EndSeconds - r.StartSeconds
}

// NormalizeShortsRange validates a user-selected range. A partial range is the
// supported fallback when the monthly plan has fewer minutes remaining.
func NormalizeShortsRange(r ShortsProcessingRange, videoDuration float64) (ShortsProcessingRange, error) {
	if videoDuration <= 0 || math.IsNaN(videoDuration) || math.IsInf(videoDuration, 0) {
		return ShortsProcessingRange{}, ErrInvalidShortsRange
	}
	if r.StartSeconds < 0 || r.EndSeconds <= r.StartSeconds {
		return ShortsProcessingRange{}, ErrInvalidShortsRange
	}
	if r.EndSeconds > videoDuration+0.001 {
		return ShortsProcessingRange{}, ErrShortsRangeOutsideVideo
	}
	return ShortsProcessingRange{
		StartSeconds: math.Round(r.StartSeconds*1000) / 1000,
		EndSeconds:   math.Round(math.Min(r.EndSeconds, videoDuration)*1000) / 1000,
	}, nil
}

type ShortsKieSegment struct {
	Index        int     `json:"index"`
	StartSeconds float64 `json:"start_seconds"`
	EndSeconds   float64 `json:"end_seconds"`
}

// SplitShortsForKie creates deterministic, non-overlapping chunks. It is
// intentionally independent from the KIE client so preparation can be tested
// and retried without submitting external tasks.
func SplitShortsForKie(startSeconds, endSeconds float64) ([]ShortsKieSegment, error) {
	if endSeconds <= startSeconds || startSeconds < 0 {
		return nil, ErrInvalidShortsRange
	}
	segments := make([]ShortsKieSegment, 0, int(math.Ceil((endSeconds-startSeconds)/ShortsKieMaxSegmentSeconds)))
	index := 0
	for cursor := startSeconds; cursor < endSeconds-0.0005; cursor += ShortsKieMaxSegmentSeconds {
		end := math.Min(cursor+ShortsKieMaxSegmentSeconds, endSeconds)
		segments = append(segments, ShortsKieSegment{
			Index:        index,
			StartSeconds: roundMilliseconds(cursor),
			EndSeconds:   roundMilliseconds(end),
		})
		index++
	}
	return segments, nil
}

type ShortsCandidate struct {
	StartSeconds float64
	EndSeconds   float64
	Text         string
	Score        float64
}

// BuildShortsCandidates turns transcript fragments into deterministic windows
// suitable for scoring and later rendering. It intentionally has no LLM or
// storage dependency; an optional scorer can refine the returned candidates.
func BuildShortsCandidates(segments []ShortsTranscriptSegment, startSeconds, endSeconds float64, limit int) []ShortsCandidate {
	if limit <= 0 || endSeconds <= startSeconds {
		return []ShortsCandidate{}
	}
	ordered := append([]ShortsTranscriptSegment(nil), segments...)
	sort.SliceStable(ordered, func(i, j int) bool { return ordered[i].StartSeconds < ordered[j].StartSeconds })
	windows := make([]ShortsCandidate, 0)
	var current *ShortsCandidate
	for _, segment := range ordered {
		text := strings.Join(strings.Fields(segment.Text), " ")
		segStart := math.Max(startSeconds, segment.StartSeconds)
		segEnd := math.Min(endSeconds, segment.EndSeconds)
		if text == "" || segEnd <= segStart {
			continue
		}
		if current == nil || segEnd-current.StartSeconds > ShortsCandidateMaxSeconds {
			if current != nil {
				windows = append(windows, *current)
			}
			candidate := ShortsCandidate{StartSeconds: segStart, EndSeconds: segEnd, Text: text}
			current = &candidate
			continue
		}
		current.EndSeconds = segEnd
		current.Text = strings.TrimSpace(current.Text + " " + text)
	}
	if current != nil {
		windows = append(windows, *current)
	}
	for i := range windows {
		windows[i].Score = shortsCandidateHeuristicScore(windows[i])
	}
	return RankShortsCandidates(windows, limit)
}

func shortsCandidateHeuristicScore(candidate ShortsCandidate) float64 {
	words := len(strings.Fields(candidate.Text))
	score := math.Min(float64(words)/20.0, 5.0)
	if strings.ContainsAny(candidate.Text, "?!") {
		score += 2
	}
	if candidate.EndSeconds-candidate.StartSeconds >= 15 {
		score += 1
	}
	return math.Round(score*100) / 100
}

// RankShortsCandidates provides a deterministic fallback ranking before the
// optional LLM scoring step. Higher scored candidates are returned first and
// near-duplicates are removed by temporal overlap.
func RankShortsCandidates(candidates []ShortsCandidate, limit int) []ShortsCandidate {
	if limit <= 0 {
		return []ShortsCandidate{}
	}
	ordered := append([]ShortsCandidate(nil), candidates...)
	sort.SliceStable(ordered, func(i, j int) bool { return ordered[i].Score > ordered[j].Score })
	selected := make([]ShortsCandidate, 0, minInt(limit, len(ordered)))
	for _, candidate := range ordered {
		if candidate.EndSeconds <= candidate.StartSeconds {
			continue
		}
		duplicate := false
		for _, existing := range selected {
			if temporalOverlap(candidate, existing) >= 0.6 {
				duplicate = true
				break
			}
		}
		if duplicate {
			continue
		}
		selected = append(selected, candidate)
		if len(selected) == limit {
			break
		}
	}
	return selected
}

func temporalOverlap(a, b ShortsCandidate) float64 {
	start := math.Max(a.StartSeconds, b.StartSeconds)
	end := math.Min(a.EndSeconds, b.EndSeconds)
	intersection := end - start
	if intersection <= 0 {
		return 0
	}
	shorter := math.Min(a.EndSeconds-a.StartSeconds, b.EndSeconds-b.StartSeconds)
	if shorter <= 0 {
		return 0
	}
	return intersection / shorter
}

func roundMilliseconds(value float64) float64 { return math.Round(value*1000) / 1000 }

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
