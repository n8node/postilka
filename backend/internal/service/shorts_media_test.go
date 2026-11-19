package service

import "testing"

func TestValidateShortsVideoFile(t *testing.T) {
	if !ValidateShortsVideoFile("video/mp4") {
		t.Fatal("expected video mime to be accepted")
	}
	if ValidateShortsVideoFile("audio/mpeg") {
		t.Fatal("expected audio mime to be rejected")
	}
	if ValidateShortsVideoFile(" application/octet-stream ") {
		t.Fatal("expected generic mime to be rejected")
	}
}
