package service

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestYouTubeProxyTransportForwardsAuthorizationHeader(t *testing.T) {
	var gotAuth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"items":[]}`))
	}))
	t.Cleanup(srv.Close)

	client := NewYouTubeAPIClient(nil, "")
	httpClient := client.HTTPClient()

	req, err := http.NewRequestWithContext(
		context.Background(),
		http.MethodGet,
		srv.URL+"/youtube/v3/channels?part=snippet&mine=true",
		nil,
	)
	if err != nil {
		t.Fatalf("NewRequest: %v", err)
	}
	req.Header.Set("Authorization", "Bearer test-token")

	resp, err := httpClient.Do(req)
	if err != nil {
		t.Fatalf("Do: %v", err)
	}
	defer resp.Body.Close()
	_, _ = io.ReadAll(resp.Body)

	if gotAuth != "Bearer test-token" {
		t.Fatalf("Authorization header = %q, want Bearer test-token", gotAuth)
	}
}

func TestYouTubeProxyTransportForwardsContentType(t *testing.T) {
	var gotContentType string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotContentType = r.Header.Get("Content-Type")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"access_token":"ok"}`))
	}))
	t.Cleanup(srv.Close)

	client := NewYouTubeAPIClient(nil, "")
	httpClient := client.HTTPClient()

	req, err := http.NewRequestWithContext(
		context.Background(),
		http.MethodPost,
		srv.URL+"/token",
		strings.NewReader("grant_type=authorization_code"),
	)
	if err != nil {
		t.Fatalf("NewRequest: %v", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := httpClient.Do(req)
	if err != nil {
		t.Fatalf("Do: %v", err)
	}
	defer resp.Body.Close()
	_, _ = io.ReadAll(resp.Body)

	if gotContentType != "application/x-www-form-urlencoded" {
		t.Fatalf("Content-Type = %q, want application/x-www-form-urlencoded", gotContentType)
	}
}
