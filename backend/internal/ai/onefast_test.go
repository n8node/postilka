package ai

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestOneFastGenerateImage(t *testing.T) {
	image := base64.StdEncoding.EncodeToString([]byte("png-data"))
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/images/generations" {
			t.Fatalf("path = %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer sk-test" {
			t.Fatalf("missing auth")
		}
		_, _ = fmt.Fprintf(w, `{"data":[{"b64_json":%q}]}`, image)
	})
	server := httptest.NewServer(handler)
	defer server.Close()

	result, err := NewOneFastClient(server.URL, "sk-test", "").GenerateImage(context.Background(), "gpt-image-2.5", "test", "1024x1024")
	if err != nil {
		t.Fatal(err)
	}
	if string(result.Data) != "png-data" {
		t.Fatalf("data = %q", result.Data)
	}
}

func TestOneFastVideoTask(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method + " " + r.URL.Path {
		case "POST /api/v3/contents/generations/tasks":
			_, _ = fmt.Fprint(w, `{"id":"task-1","status":"queued"}`)
		case "GET /api/v3/contents/generations/tasks/task-1":
			_, _ = fmt.Fprint(w, `{"id":"task-1","status":"succeeded","content":{"video_url":"https://files/video.mp4"}}`)
		default:
			http.NotFound(w, r)
		}
	})
	server := httptest.NewServer(handler)
	defer server.Close()

	client := NewOneFastClient(server.URL, "sk-test", "group-a")
	task, err := client.CreateVideo(context.Background(), "dreamina-seedance-2-0-260128", []map[string]any{{"type": "text", "text": "test"}}, "16:9", 5, "720p", false)
	if err != nil {
		t.Fatal(err)
	}
	if task.ID != "task-1" || task.Status != "queued" {
		t.Fatalf("task = %+v", task)
	}
	detail, err := client.GetVideo(context.Background(), task.ID)
	if err != nil {
		t.Fatal(err)
	}
	if detail.Status != "succeeded" || !strings.HasSuffix(detail.ResultURL, "video.mp4") {
		t.Fatalf("detail = %+v", detail)
	}
}
