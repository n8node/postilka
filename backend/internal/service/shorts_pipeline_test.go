package service

import (
	"errors"
	"testing"
)

func TestNormalizeShortsRange(t *testing.T) {
	r, err := NormalizeShortsRange(ShortsProcessingRange{StartSeconds: 10.1234, EndSeconds: 80.9876}, 100)
	if err != nil {
		t.Fatalf("normalize range: %v", err)
	}
	if r.StartSeconds != 10.123 || r.EndSeconds != 80.988 {
		t.Fatalf("unexpected range: %+v", r)
	}

	if _, err := NormalizeShortsRange(ShortsProcessingRange{StartSeconds: 90, EndSeconds: 110}, 100); !errors.Is(err, ErrShortsRangeOutsideVideo) {
		t.Fatalf("expected outside-video error, got %v", err)
	}
}

func TestSplitShortsForKie(t *testing.T) {
	segments, err := SplitShortsForKie(3, 35.5)
	if err != nil {
		t.Fatalf("split: %v", err)
	}
	if len(segments) != 3 {
		t.Fatalf("expected 3 segments, got %d", len(segments))
	}
	if segments[0].StartSeconds != 3 || segments[0].EndSeconds != 18 {
		t.Fatalf("unexpected first segment: %+v", segments[0])
	}
	if segments[2].StartSeconds != 33 || segments[2].EndSeconds != 35.5 {
		t.Fatalf("unexpected last segment: %+v", segments[2])
	}
}

func TestRankShortsCandidatesRemovesOverlap(t *testing.T) {
	got := RankShortsCandidates([]ShortsCandidate{
		{StartSeconds: 0, EndSeconds: 30, Score: 8},
		{StartSeconds: 2, EndSeconds: 28, Score: 9},
		{StartSeconds: 60, EndSeconds: 90, Score: 7},
	}, 3)
	if len(got) != 2 {
		t.Fatalf("expected 2 non-duplicate candidates, got %d", len(got))
	}
	if got[0].Score != 9 || got[1].Score != 7 {
		t.Fatalf("unexpected ranking: %+v", got)
	}
}
