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

func TestParseMAXUploadTokenFromPhotos(t *testing.T) {
	token := parseMAXUploadToken([]byte(`{"photos":{"abc":{"token":"img-token-123"}}}`))
	if token != "img-token-123" {
		t.Fatalf("got %q", token)
	}
}

func TestParseMAXUploadTokenFlat(t *testing.T) {
	token := parseMAXUploadToken([]byte(`{"token":"flat-token"}`))
	if token != "flat-token" {
		t.Fatalf("got %q", token)
	}
}

func TestBuildMAXMessageAttachmentsPrefersImageToken(t *testing.T) {
	attachments := buildMAXMessageAttachments([]MAXOutgoingAttachment{
		{Type: "image", Token: "img-token", ImageURL: "https://example.com/a.jpg"},
	})
	if len(attachments) != 1 {
		t.Fatalf("expected 1 attachment, got %d", len(attachments))
	}
	payload, ok := attachments[0]["payload"].(map[string]any)
	if !ok {
		t.Fatal("expected payload map")
	}
	if payload["token"] != "img-token" {
		t.Fatalf("expected token attachment, got %#v", payload)
	}
	if _, hasURL := payload["url"]; hasURL {
		t.Fatal("token should take precedence over url")
	}
}
