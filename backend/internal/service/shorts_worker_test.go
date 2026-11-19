package service

import "testing"

func TestValidateShortsVideoFileTrimsAndNormalizes(t *testing.T) {
	if !ValidateShortsVideoFile("  VIDEO/MP4 ") {
		t.Fatal("expected normalized video MIME")
	}
	if ValidateShortsVideoFile("video") {
		t.Fatal("expected incomplete MIME to be rejected")
	}
}
