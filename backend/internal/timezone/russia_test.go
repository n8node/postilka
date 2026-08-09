package timezone

import (
	"testing"
	"time"
)

func TestValidateRussiaTimezone(t *testing.T) {
	if err := Validate("Europe/Moscow"); err != nil {
		t.Fatal(err)
	}
	if err := Validate("America/New_York"); err == nil {
		t.Fatal("expected error for non-Russian TZ")
	}
}

func TestParsePublishAtRFC3339(t *testing.T) {
	got, err := ParsePublishAt("2026-08-09T11:30:00Z", "Europe/Moscow")
	if err != nil {
		t.Fatal(err)
	}
	if got == nil || got.UTC().Format(time.RFC3339) != "2026-08-09T11:30:00Z" {
		t.Fatalf("unexpected: %v", got)
	}
}

func TestParsePublishAtLocalMoscow(t *testing.T) {
	got, err := ParsePublishAt("2026-08-09T14:30", "Europe/Moscow")
	if err != nil {
		t.Fatal(err)
	}
	if got == nil {
		t.Fatal("nil time")
	}
	want := time.Date(2026, 8, 9, 11, 30, 0, 0, time.UTC)
	if !got.Equal(want) {
		t.Fatalf("got %s want %s", got.UTC(), want)
	}
}

func TestParsePublishAtLocalVladivostok(t *testing.T) {
	got, err := ParsePublishAt("2026-08-09T14:30", "Asia/Vladivostok")
	if err != nil {
		t.Fatal(err)
	}
	want := time.Date(2026, 8, 9, 4, 30, 0, 0, time.UTC)
	if !got.Equal(want) {
		t.Fatalf("got %s want %s", got.UTC(), want)
	}
}

func TestNormalizeFallback(t *testing.T) {
	if got := Normalize("Invalid/Zone"); got != Default {
		t.Fatalf("got %q", got)
	}
}
