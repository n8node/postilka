package oauth

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

func vkTestClientWithServer(t *testing.T, srv *httptest.Server) *VKCommunityClient {
	t.Helper()
	apiHost := strings.TrimPrefix(srv.URL, "http://")
	return &VKCommunityClient{
		HTTP: &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			if req.URL.Host == "api.vk.com" {
				req.URL.Scheme = "http"
				req.URL.Host = apiHost
				if !strings.HasPrefix(req.URL.Path, "/method/") {
					req.URL.Path = "/method" + req.URL.Path
				}
			}
			return http.DefaultTransport.RoundTrip(req)
		})},
	}
}

func TestPostWall_TextOnly(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/wall.post") {
			http.NotFound(w, r)
			return
		}
		body, _ := io.ReadAll(r.Body)
		if !strings.Contains(string(body), "message=hello") {
			t.Fatalf("expected message in body: %s", body)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"response":{"post_id":42}}`))
	}))
	t.Cleanup(srv.Close)
	client := vkTestClientWithServer(t, srv)

	postID, err := client.postWall(context.Background(), "token", -123, "hello", nil, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	if postID != 42 {
		t.Fatalf("post_id=%d", postID)
	}
}

func TestPostWall_PhotoWithCaption(t *testing.T) {
	var mu sync.Mutex
	uploadURL := ""
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case strings.HasSuffix(r.URL.Path, "/photos.getWallUploadServer"):
			mu.Lock()
			url := uploadURL
			mu.Unlock()
			_, _ = w.Write([]byte(`{"response":{"upload_url":"` + url + `"}}`))
		case r.URL.Path == "/upload-photo":
			_, _ = w.Write([]byte(`{"server":1,"photo":"abc","hash":"def"}`))
		case strings.HasSuffix(r.URL.Path, "/photos.saveWallPhoto"):
			_, _ = w.Write([]byte(`{"response":[{"id":99,"owner_id":-123}]}`))
		case strings.HasSuffix(r.URL.Path, "/wall.post"):
			body, _ := io.ReadAll(r.Body)
			s := string(body)
			if !strings.Contains(s, "message=caption") {
				t.Fatalf("missing caption: %s", s)
			}
			if !strings.Contains(s, "attachments=photo-123_99") {
				t.Fatalf("missing attachment: %s", s)
			}
			_, _ = w.Write([]byte(`{"response":{"post_id":7}}`))
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	mu.Lock()
	uploadURL = srv.URL + "/upload-photo"
	mu.Unlock()

	client := vkTestClientWithServer(t, srv)
	postID, err := client.PostWall(context.Background(), "token", -123, VKWallPostInput{
		Message: "caption",
		Photos:  []VKMediaSource{{Data: []byte("fake-image"), Filename: "pic.jpg"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if postID != 7 {
		t.Fatalf("post_id=%d", postID)
	}
}

func TestPostWall_VideoWithDescription(t *testing.T) {
	var mu sync.Mutex
	baseURL := ""
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case strings.HasSuffix(r.URL.Path, "/video.save"):
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), "description=desc") {
				t.Fatalf("missing description: %s", body)
			}
			mu.Lock()
			url := baseURL
			mu.Unlock()
			_, _ = w.Write([]byte(`{"response":{"upload_url":"` + url + `/upload-video","video_id":55,"owner_id":-123}}`))
		case r.URL.Path == "/upload-video":
			w.WriteHeader(http.StatusOK)
		case strings.HasSuffix(r.URL.Path, "/wall.post"):
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), "attachments=video-123_55") {
				t.Fatalf("missing video attachment: %s", body)
			}
			_, _ = w.Write([]byte(`{"response":{"post_id":9}}`))
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	mu.Lock()
	baseURL = srv.URL
	mu.Unlock()
	client := vkTestClientWithServer(t, srv)

	postID, err := client.PostWall(context.Background(), "token", -123, VKWallPostInput{
		Message: "desc",
		Video:   &VKMediaSource{Data: []byte("fake-video"), Filename: "clip.mp4"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if postID != 9 {
		t.Fatalf("post_id=%d", postID)
	}
}

func TestPostWall_WithCoordinates(t *testing.T) {
	lat, lng := 55.751244, 37.618423
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/wall.post") {
			http.NotFound(w, r)
			return
		}
		body, _ := io.ReadAll(r.Body)
		s := string(body)
		if !strings.Contains(s, "lat=55.751244") {
			t.Fatalf("missing lat: %s", s)
		}
		if !strings.Contains(s, "long=37.618423") {
			t.Fatalf("missing long: %s", s)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"response":{"post_id":11}}`))
	}))
	t.Cleanup(srv.Close)
	client := vkTestClientWithServer(t, srv)

	postID, err := client.PostWall(context.Background(), "token", -123, VKWallPostInput{
		Message:   "geo",
		Latitude:  &lat,
		Longitude: &lng,
	})
	if err != nil {
		t.Fatal(err)
	}
	if postID != 11 {
		t.Fatalf("post_id=%d", postID)
	}
}

func TestCreateComment(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/wall.createComment") {
			http.NotFound(w, r)
			return
		}
		body, _ := io.ReadAll(r.Body)
		s := string(body)
		if !strings.Contains(s, "owner_id=-123") {
			t.Fatalf("missing owner_id: %s", s)
		}
		if !strings.Contains(s, "post_id=42") {
			t.Fatalf("missing post_id: %s", s)
		}
		if !strings.Contains(s, "from_group=1") {
			t.Fatalf("missing from_group: %s", s)
		}
		if !strings.Contains(s, "message=first") {
			t.Fatalf("missing message: %s", s)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"response":{"comment_id":7}}`))
	}))
	t.Cleanup(srv.Close)
	client := vkTestClientWithServer(t, srv)
	if err := client.CreateComment(context.Background(), "token", -123, 42, "first"); err != nil {
		t.Fatal(err)
	}
}

func TestPostWall_RejectsPhotoAndVideoTogether(t *testing.T) {
	client := &VKCommunityClient{}
	_, err := client.PostWall(context.Background(), "token", -1, VKWallPostInput{
		Photos: []VKMediaSource{{Data: []byte("a")}},
		Video:  &VKMediaSource{Data: []byte("b")},
	})
	if err == nil {
		t.Fatal("expected error")
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}
