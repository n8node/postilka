package oauth

import (
	"net/url"
	"strings"
	"testing"
)

func TestVKCommunityAuthorizeURLUsesVKIDAndPKCE(t *testing.T) {
	client := &VKClient{ClientID: "54712143"}
	redirectURI := "https://postilka.ru/app/api/v1/channels/oauth/vk/callback"
	urlString := client.AuthorizeURLWithScope(
		"state-token",
		CodeChallenge("code-verifier"),
		redirectURI,
		VKCommunityIDScope,
	)

	parsed, err := url.Parse(urlString)
	if err != nil {
		t.Fatal(err)
	}
	if parsed.Scheme != "https" || parsed.Host != "id.vk.ru" || parsed.Path != "/authorize" {
		t.Fatalf("unexpected VK authorize endpoint: %s", urlString)
	}
	query := parsed.Query()
	if query.Get("client_id") != "54712143" {
		t.Fatalf("unexpected client_id: %q", query.Get("client_id"))
	}
	if query.Get("redirect_uri") != redirectURI {
		t.Fatalf("unexpected redirect_uri: %q", query.Get("redirect_uri"))
	}
	if query.Get("code_challenge_method") != "S256" || query.Get("code_challenge") == "" {
		t.Fatalf("PKCE parameters are missing: %s", urlString)
	}
	if query.Get("scope") != VKCommunityIDScope {
		t.Fatalf("unexpected scope: %q", query.Get("scope"))
	}
	if strings.Contains(urlString, "oauth.vk.com") || query.Get("v") != "" {
		t.Fatalf("legacy VK OAuth parameters must not be used: %s", urlString)
	}
}
