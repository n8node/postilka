package service

import (
	"errors"
	"fmt"
	"testing"
)

func TestValidateReferenceVideoDuration(t *testing.T) {
	t.Parallel()
	tests := []struct {
		sec   float64
		valid bool
	}{
		{1.9, false},
		{2, true},
		{15, true},
		{15.1, true},
		{15.5, true},
		{15.51, false},
		{17.5, false},
	}
	for _, tt := range tests {
		err := validateReferenceVideoDuration(tt.sec)
		if tt.valid && err != nil {
			t.Fatalf("duration %.1f should be valid: %v", tt.sec, err)
		}
		if !tt.valid && err == nil {
			t.Fatalf("duration %.1f should be invalid", tt.sec)
		}
	}
}

func TestReferenceVideoDurationHTTPMessage(t *testing.T) {
	t.Parallel()
	err := fmt.Errorf("%w (%.3f sec)", ErrReferenceVideoDuration, 15.033)
	msg := ReferenceVideoDurationHTTPMessage(err)
	if !errors.Is(err, ErrReferenceVideoDuration) {
		t.Fatal("expected wrapped error")
	}
	want := "Референс-видео должно быть от 2 до 15 секунд (сейчас 15.0 сек). Выберите более короткий ролик."
	if msg != want {
		t.Fatalf("message = %q, want %q", msg, want)
	}
}

func TestVideoJobFailErrorClassifiesSourceRead(t *testing.T) {
	t.Parallel()
	err := videoJobFailError("source media read: NoSuchKey")
	if !errors.Is(err, ErrGenerationSourceRead) {
		t.Fatalf("got %v, want ErrGenerationSourceRead", err)
	}
}
