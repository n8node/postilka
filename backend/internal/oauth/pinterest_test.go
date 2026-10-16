package oauth

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPinterestCreatePinSendsImageBase64Payload(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/pins" {
			t.Fatalf("unexpected request: %s %s", r.Method, r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer access-token" {
			t.Fatalf("unexpected authorization header: %q", got)
		}
		var payload struct {
			BoardID     string `json:"board_id"`
			MediaSource struct {
				SourceType  string `json:"source_type"`
				ContentType string `json:"content_type"`
				Data        string `json:"data"`
			} `json:"media_source"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		if payload.BoardID != "123" || payload.MediaSource.SourceType != "image_base64" || payload.MediaSource.ContentType != "image/jpeg" {
			t.Fatalf("unexpected payload: %+v", payload)
		}
		decoded, err := base64.StdEncoding.DecodeString(payload.MediaSource.Data)
		if err != nil || string(decoded) != "image-bytes" {
			t.Fatalf("unexpected image data: %q, error: %v", decoded, err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"pin-1"}`))
	}))
	defer srv.Close()

	client := &PinterestClient{BaseURL: srv.URL, HTTP: srv.Client()}
	media := []struct {
		ContentType string
		Data        []byte
	}{{ContentType: "image/jpeg", Data: []byte("image-bytes")}}
	id, err := client.CreatePin(context.Background(), "access-token", "123", "title", "description", "", "", media)
	if err != nil {
		t.Fatalf("CreatePin returned error: %v", err)
	}
	if id != "pin-1" {
		t.Fatalf("unexpected pin id: %q", id)
	}
}
