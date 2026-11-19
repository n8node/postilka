package service

import (
	"context"
	"testing"
)

func TestCommandShortsTranscriberRequiresCommand(t *testing.T) {
	_, err := (CommandShortsTranscriber{}).Transcribe(context.Background(), "audio.mp3")
	if err == nil {
		t.Fatal("expected missing transcriber command error")
	}
}
