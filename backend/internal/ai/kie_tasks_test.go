package ai

import "testing"

func TestFirstResultURLSupportsSnakeCaseAndNestedValues(t *testing.T) {
	got := firstResultURL(`{"result_urls":["https://example.test/result.json"]}`)
	if got != "https://example.test/result.json" {
		t.Fatalf("got %q", got)
	}
	got = firstResultURL(`{"output":{"url":"https://example.test/nested.json"}}`)
	if got != "https://example.test/nested.json" {
		t.Fatalf("got %q", got)
	}
}
