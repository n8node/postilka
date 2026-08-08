package oauth

import (
	"encoding/json"
	"testing"
)

func TestDzenPublicationPayloadBrief(t *testing.T) {
	payload, err := json.Marshal(map[string]any{
		"channel_id": "ch-1",
		"content": map[string]any{
			"type": string(DzenContentBrief),
			"brief": map[string]string{
				"text":      "hello",
				"image_url": "https://example.com/a.jpg",
			},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	var parsed map[string]any
	if err := json.Unmarshal(payload, &parsed); err != nil {
		t.Fatal(err)
	}
	content, ok := parsed["content"].(map[string]any)
	if !ok || content["type"] != "brief" {
		t.Fatalf("unexpected content: %#v", parsed["content"])
	}
}

func TestDzenPublicationPayloadArticle(t *testing.T) {
	payload, err := json.Marshal(map[string]any{
		"channel_id": "ch-1",
		"content": map[string]any{
			"type": string(DzenContentArticle),
			"article": map[string]string{
				"title":     "Title",
				"text":      "Body",
				"cover_url": "https://example.com/cover.jpg",
			},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	var parsed map[string]any
	if err := json.Unmarshal(payload, &parsed); err != nil {
		t.Fatal(err)
	}
	content, ok := parsed["content"].(map[string]any)
	if !ok || content["type"] != "article" {
		t.Fatalf("unexpected content: %#v", parsed["content"])
	}
}
