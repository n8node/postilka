package oauth

import (
	"net/url"
	"testing"
)

func TestInstagramLoginAuthorizeURL(t *testing.T) {
	redirectURI := "https://postilka.ru/app/api/v1/channels/oauth/instagram/callback"
	client := &InstagramLoginClient{AppID: "app-id", AppSecret: "app-secret", RedirectURI: redirectURI}
	raw, err := client.AuthorizeURL("state")
	if err != nil {
		t.Fatalf("AuthorizeURL() error = %v", err)
	}
	u, err := url.Parse(raw)
	if err != nil {
		t.Fatalf("parse URL: %v", err)
	}
	q := u.Query()
	if u.Scheme != "https" || u.Host != "www.instagram.com" || u.Path != "/oauth/authorize" {
		t.Fatalf("unexpected endpoint: %s", raw)
	}
	if q.Get("client_id") != "app-id" || q.Get("redirect_uri") != redirectURI || q.Get("response_type") != "code" || q.Get("state") != "state" {
		t.Fatalf("unexpected query: %v", q)
	}
	if q.Get("scope") != InstagramLoginScope {
		t.Fatalf("unexpected scopes: %q", q.Get("scope"))
	}
}
