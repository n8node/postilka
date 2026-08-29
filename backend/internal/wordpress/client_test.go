package wordpress

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestNormalizeSiteURL(t *testing.T) {
	got, err := NormalizeSiteURL("Blog.Example.com/wp-admin/")
	if err != nil {
		t.Fatal(err)
	}
	if got != "https://blog.example.com" {
		t.Fatalf("got %q", got)
	}
	if _, err := NormalizeSiteURL("https://127.0.0.1"); err == nil {
		t.Fatal("expected localhost reject")
	}
	if _, err := NormalizeSiteURL("https://user:pass@example.com"); err == nil {
		t.Fatal("expected userinfo reject")
	}
}

func TestSiteChatIDStable(t *testing.T) {
	a := SiteChatID("https://blog.example.com")
	b := SiteChatID("https://blog.example.com")
	if a == "" || a != b || len(a) != 32 {
		t.Fatalf("chat id=%q", a)
	}
}

func TestArticleHTML(t *testing.T) {
	if got := ArticleHTML("hello\n\nworld"); !strings.Contains(got, "<p>hello</p>") || !strings.Contains(got, "<p>world</p>") {
		t.Fatalf("plain wrap: %q", got)
	}
	if got := ArticleHTML("<p>already</p>"); got != "<p>already</p>" {
		t.Fatalf("html passthrough: %q", got)
	}
}

func TestCreatePostPayloadAndAuth(t *testing.T) {
	var gotAuth string
	var payload map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		raw, _ := io.ReadAll(r.Body)
		if err := json.Unmarshal(raw, &payload); err != nil {
			t.Errorf("payload: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":42,"link":"https://blog.example.com/?p=42","status":"publish"}`))
	}))
	defer srv.Close()

	client := NewClient()
	post, err := client.CreatePost(context.Background(), srv.URL, "editor", "abcd efgh ijkl mnop", CreatePostInput{
		Title:         "Заголовок",
		Content:       "<p>Текст</p>",
		Status:        "publish",
		FeaturedMedia: 7,
	})
	if err != nil {
		t.Fatal(err)
	}
	if post.ID != 42 {
		t.Fatalf("id=%d", post.ID)
	}
	if !strings.HasPrefix(gotAuth, "Basic ") {
		t.Fatalf("auth=%q", gotAuth)
	}
	if payload["title"] != "Заголовок" || payload["status"] != "publish" {
		t.Fatalf("payload=%#v", payload)
	}
	if featured, ok := payload["featured_media"].(float64); !ok || featured != 7 {
		t.Fatalf("featured=%#v", payload["featured_media"])
	}
}

func TestUnauthorized(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"code":"rest_not_logged_in","message":"Вы не авторизованы.","data":{"status":401}}`))
	}))
	defer srv.Close()

	_, err := NewClient().Me(context.Background(), srv.URL, "editor", "bad")
	if !errors.Is(err, ErrUnauthorized) {
		t.Fatalf("err=%v", err)
	}
}
