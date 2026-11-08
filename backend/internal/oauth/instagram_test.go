package oauth

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func TestInstagramUnifiedAuthorizeURLAndExchangeUseSameRedirectURI(t *testing.T) {
	redirectURI := "https://postilka.ru/app/api/v1/channels/oauth/instagram/callback"
	var exchangeQuery url.Values

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		exchangeQuery = r.URL.Query()
		_, _ = io.WriteString(w, `{"access_token":"token","token_type":"bearer","expires_in":3600}`)
	}))
	t.Cleanup(server.Close)
	baseClient := server.Client()
	baseClient.Transport = instagramRoundTripFunc(func(req *http.Request) (*http.Response, error) {
		rewritten := req.Clone(req.Context())
		rewritten.URL.Scheme = "http"
		rewritten.URL.Host = strings.TrimPrefix(server.URL, "http://")
		return http.DefaultTransport.RoundTrip(rewritten)
	})

	client := &InstagramUnifiedClient{
		AppID:       "app-id",
		AppSecret:   "app-secret",
		ConfigID:    "config-id",
		RedirectURI: redirectURI,
		HTTP:        baseClient,
	}

	authURL, err := client.AuthorizeURL("state")
	if err != nil {
		t.Fatalf("AuthorizeURL() error = %v", err)
	}
	authQuery, err := url.Parse(authURL)
	if err != nil {
		t.Fatalf("parse auth URL: %v", err)
	}
	if got := authQuery.Query().Get("redirect_uri"); got != redirectURI {
		t.Fatalf("authorization redirect_uri = %q, want %q", got, redirectURI)
	}

	if _, err := client.ExchangeCode(context.Background(), "code"); err != nil {
		t.Fatalf("ExchangeCode() error = %v", err)
	}
	if got := exchangeQuery.Get("redirect_uri"); got != redirectURI {
		t.Fatalf("exchange redirect_uri = %q, want %q", got, redirectURI)
	}
	if strings.TrimSpace(exchangeQuery.Get("code")) != "code" {
		t.Fatalf("exchange code was not sent")
	}
}

type instagramRoundTripFunc func(*http.Request) (*http.Response, error)

func (f instagramRoundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) { return f(req) }
