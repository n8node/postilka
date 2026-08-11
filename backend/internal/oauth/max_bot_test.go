package oauth

import "testing"

func TestMaxChatLinkMatches(t *testing.T) {
	chat := &MAXChat{Link: "https://max.ru/channel_postilka"}

	if !maxChatLinkMatches(chat, "channel_postilka") {
		t.Fatal("expected slug match")
	}
	if !maxChatLinkMatches(chat, "https://max.ru/channel_postilka") {
		t.Fatal("expected full url match")
	}
	if maxChatLinkMatches(chat, "other_channel") {
		t.Fatal("expected no match")
	}
}

func TestNormalizeMAXChatLink(t *testing.T) {
	got := NormalizeMAXChatLink("https://max.ru/channel_postilka/")
	if got != "channel_postilka" {
		t.Fatalf("got %q", got)
	}
}

func TestMAXImageMimeAllowed(t *testing.T) {
	if !MAXImageMimeAllowed("image/jpeg") {
		t.Fatal("expected jpeg")
	}
	if MAXImageMimeAllowed("image/webp") {
		t.Fatal("webp should not be supported by MAX")
	}
}

func TestMAXVideoMimeAllowed(t *testing.T) {
	if !MAXVideoMimeAllowed("video/mp4") {
		t.Fatal("expected mp4")
	}
	if !MAXVideoMimeAllowed("video/webm") {
		t.Fatal("expected webm")
	}
}
