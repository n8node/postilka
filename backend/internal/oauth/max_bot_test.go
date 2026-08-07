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
