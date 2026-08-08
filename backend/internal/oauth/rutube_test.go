package oauth

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func rutubeTestClient(t *testing.T, srv *httptest.Server) *RutubeClient {
	t.Helper()
	host := strings.TrimPrefix(srv.URL, "http://")
	return &RutubeClient{
		HTTP: &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			if req.URL.Host == "rutube.ru" {
				req.URL.Scheme = "http"
				req.URL.Host = host
			}
			return http.DefaultTransport.RoundTrip(req)
		})},
		ClientID:     "client",
		ClientSecret: "secret",
	}
}

func TestRutubeRefreshToken(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/oauth2/token" {
			http.NotFound(w, r)
			return
		}
		body, _ := io.ReadAll(r.Body)
		if !strings.Contains(string(body), "grant_type=refresh_token") {
			t.Fatalf("expected refresh_token grant: %s", body)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"access_token":"new","refresh_token":"ref2","expires_in":3600}`))
	}))
	t.Cleanup(srv.Close)

	client := rutubeTestClient(t, srv)
	out, err := client.RefreshToken(context.Background(), "ref")
	if err != nil {
		t.Fatal(err)
	}
	if out.AccessToken != "new" {
		t.Fatalf("access_token=%q", out.AccessToken)
	}
}

func TestRutubePostChannelText(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/feed/") {
			http.NotFound(w, r)
			return
		}
		body, _ := io.ReadAll(r.Body)
		if !strings.Contains(string(body), "text=hello") {
			t.Fatalf("body=%s", body)
		}
		if auth := r.Header.Get("Authorization"); auth != "Bearer tok" {
			t.Fatalf("auth=%q", auth)
		}
		w.WriteHeader(http.StatusCreated)
	}))
	t.Cleanup(srv.Close)

	client := rutubeTestClient(t, srv)
	if err := client.PostChannelText(context.Background(), "tok", "42", "hello"); err != nil {
		t.Fatal(err)
	}
}

func TestRutubeUploadVideo(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/video/" || r.Method != http.MethodPost {
			http.NotFound(w, r)
			return
		}
		body, _ := io.ReadAll(r.Body)
		if !strings.Contains(string(body), "url=https%3A%2F%2Fexample.com%2Fvideo.mp4") {
			t.Fatalf("body=%s", body)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"video_id":"vid-1"}`))
	}))
	t.Cleanup(srv.Close)

	client := rutubeTestClient(t, srv)
	id, err := client.UploadVideo(context.Background(), "tok", RutubeVideoUploadInput{
		VideoURL:    "https://example.com/video.mp4",
		Title:       "Title",
		Description: "Desc",
	})
	if err != nil {
		t.Fatal(err)
	}
	if id != "vid-1" {
		t.Fatalf("video_id=%q", id)
	}
}

func TestRutubePublishVideoWithSchedule(t *testing.T) {
	var scheduled bool
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/api/video/" && r.Method == http.MethodPost:
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"video_id":"vid-2"}`))
		case r.URL.Path == "/api/video/publication/":
			scheduled = true
			w.WriteHeader(http.StatusOK)
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)

	client := rutubeTestClient(t, srv)
	publishAt := time.Now().Add(2 * time.Hour)
	id, err := client.Publish(context.Background(), "tok", RutubePublishInput{
		ChannelID:   "1",
		ContentType: RutubeContentVideo,
		Title:       "Clip",
		Text:        "Description",
		VideoURL:    "https://example.com/clip.mp4",
		PublishAt:   &publishAt,
	})
	if err != nil {
		t.Fatal(err)
	}
	if id != "vid-2" {
		t.Fatalf("video_id=%q", id)
	}
	if !scheduled {
		t.Fatal("expected schedule publication call")
	}
}

func TestRutubePublishFeed(t *testing.T) {
	var feedPosted bool
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/feed/") {
			feedPosted = true
			w.WriteHeader(http.StatusCreated)
			return
		}
		http.NotFound(w, r)
	}))
	t.Cleanup(srv.Close)

	client := rutubeTestClient(t, srv)
	id, err := client.Publish(context.Background(), "tok", RutubePublishInput{
		ChannelID:   "9",
		ContentType: RutubeContentFeed,
		Text:        "feed post",
	})
	if err != nil {
		t.Fatal(err)
	}
	if id != "" {
		t.Fatalf("expected empty id, got %q", id)
	}
	if !feedPosted {
		t.Fatal("expected feed post")
	}
}
