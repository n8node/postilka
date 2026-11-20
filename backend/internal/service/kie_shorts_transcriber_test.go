package service

import "testing"

func TestParseKieTranscriptWords(t *testing.T) {
	got, err := parseKieTranscript([]byte(`{"language":"ru","words":[{"word":"Привет","start":0.1,"end":0.5},{"word":"мир","start":0.6,"end":1.0}]}`))
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Segments) != 1 || got.Segments[0].StartSeconds != 0.1 || got.Segments[0].EndSeconds != 1 {
		t.Fatalf("unexpected segments: %+v", got.Segments)
	}
	if got.Text != "Привет мир" {
		t.Fatalf("unexpected text: %q", got.Text)
	}
}

func TestParseKieTranscriptRejectsUntimedText(t *testing.T) {
	if _, err := parseKieTranscript([]byte(`{"text":"только текст"}`)); err == nil {
		t.Fatal("expected timed words error")
	}
}
