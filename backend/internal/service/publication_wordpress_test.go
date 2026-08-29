package service

import (
	"context"
	"testing"

	"github.com/postilka/postilka/internal/model"
)

func TestPublishWordPressIdempotent(t *testing.T) {
	s := &PublicationService{}
	id, err := s.publishWordPress(context.Background(), &model.Post{}, model.PostTarget{
		ProviderPostID: "42",
	}, &model.Channel{Provider: model.ChannelProviderWordPress}, model.PostContent{}, "")
	if err != nil {
		t.Fatal(err)
	}
	if id != "42" {
		t.Fatalf("id=%s", id)
	}
}

func TestWordPressArticlePayload(t *testing.T) {
	title, html, err := wordpressArticlePayload(model.PostContent{
		Title: "Заголовок",
		Text:  "абзац один\n\nабзац два",
	})
	if err != nil {
		t.Fatal(err)
	}
	if title != "Заголовок" {
		t.Fatalf("title=%q", title)
	}
	if html == "" || html == "абзац один" {
		t.Fatalf("html=%q", html)
	}
}
