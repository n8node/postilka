package oauth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func youtubeTestClient(t *testing.T, srv *httptest.Server) *YouTubeClient {
	t.Helper()
	host := strings.TrimPrefix(srv.URL, "http://")
	return &YouTubeClient{
		HTTP: &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			switch req.URL.Host {
			case "oauth2.googleapis.com", "www.googleapis.com":
				req.URL.Scheme = "http"
				req.URL.Host = host
			}
			return http.DefaultTransport.RoundTrip(req)
		})},
		ClientID:     "id",
		ClientSecret: "secret",
		RedirectURI:  "https://example/callback",
	}
}

func TestYouTubeClientAuthorizeURL(t *testing.T) {
	client := &YouTubeClient{
		ClientID:    "client-id",
		RedirectURI: "https://postilka.ru/app/api/v1/channels/oauth/youtube/callback",
	}
	url := client.AuthorizeURL("state-token")
	if !strings.Contains(url, "accounts.google.com/o/oauth2/v2/auth") {
		t.Fatalf("unexpected auth url: %s", url)
	}
	if !strings.Contains(url, "client_id=client-id") {
		t.Fatalf("missing client_id: %s", url)
	}
	if !strings.Contains(url, "state=state-token") {
		t.Fatalf("missing state: %s", url)
	}
	if !strings.Contains(url, "access_type=offline") {
		t.Fatalf("missing offline access: %s", url)
	}
}

func TestYouTubeClientExchangeCode(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/token" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		_ = r.ParseForm()
		if r.Form.Get("grant_type") != "authorization_code" {
			t.Fatalf("grant_type: %s", r.Form.Get("grant_type"))
		}
		_ = json.NewEncoder(w).Encode(YouTubeTokenResponse{
			AccessToken:  "access",
			RefreshToken: "refresh",
			ExpiresIn:    3600,
			TokenType:    "Bearer",
		})
	}))
	defer srv.Close()

	client := youtubeTestClient(t, srv)
	token, err := client.ExchangeCode(context.Background(), "code")
	if err != nil {
		t.Fatalf("ExchangeCode: %v", err)
	}
	if token.AccessToken != "access" || token.RefreshToken != "refresh" {
		t.Fatalf("unexpected token: %+v", token)
	}
}

func TestYouTubeClientListMyChannels(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/youtube/v3/channels") {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer token" {
			t.Fatalf("auth header: %s", r.Header.Get("Authorization"))
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"items": []map[string]any{
				{
					"id": "UC123",
					"snippet": map[string]any{
						"title":     "My Channel",
						"customUrl": "@mychannel",
						"thumbnails": map[string]any{
							"default": map[string]string{"url": "https://img/1.jpg"},
						},
					},
				},
			},
		})
	}))
	defer srv.Close()

	client := youtubeTestClient(t, srv)
	channels, err := client.ListMyChannels(context.Background(), "token")
	if err != nil {
		t.Fatalf("ListMyChannels: %v", err)
	}
	if len(channels) != 1 || channels[0].ID != "UC123" {
		t.Fatalf("unexpected channels: %+v", channels)
	}
	if got := YouTubeChannelPublicURL(channels[0]); got != "https://www.youtube.com/@mychannel" {
		t.Fatalf("public url: %s", got)
	}
}
