package oauth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
)

const instagramGraphBaseURL = "https://graph.facebook.com"

// InstagramUnifiedClient implements Meta's Instagram API with Unified Login.
// Unified Login uses a Facebook Login for Business configuration (config_id),
// then returns a Business Integration System User access token.
type InstagramUnifiedClient struct {
	AppID       string
	AppSecret   string
	ConfigID    string
	RedirectURI string
	APIVersion  string
	HTTP        *http.Client
}

type InstagramUnifiedToken struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int64  `json:"expires_in"`
}

type InstagramAccount struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Name     string `json:"name"`
}

type instagramAccountsPage struct {
	Data   []InstagramAccount `json:"data"`
	Paging struct {
		Next string `json:"next"`
	} `json:"paging"`
}

func (c *InstagramUnifiedClient) AuthorizeURL(state string) (string, error) {
	if strings.TrimSpace(c.AppID) == "" || strings.TrimSpace(c.ConfigID) == "" {
		return "", fmt.Errorf("instagram unified login: app id and config id are required")
	}
	q := url.Values{}
	q.Set("client_id", strings.TrimSpace(c.AppID))
	q.Set("config_id", strings.TrimSpace(c.ConfigID))
	q.Set("redirect_uri", strings.TrimSpace(c.RedirectURI))
	q.Set("state", strings.TrimSpace(state))
	q.Set("response_type", "code")
	return "https://www.facebook.com/" + c.version() + "/dialog/oauth?" + q.Encode(), nil
}

func (c *InstagramUnifiedClient) ExchangeCode(ctx context.Context, code string) (*InstagramUnifiedToken, error) {
	q := url.Values{}
	q.Set("client_id", strings.TrimSpace(c.AppID))
	q.Set("client_secret", strings.TrimSpace(c.AppSecret))
	q.Set("code", strings.TrimSpace(code))
	// Meta requires redirect_uri to be identical in the authorization request
	// and in the authorization-code exchange.
	q.Set("redirect_uri", strings.TrimSpace(c.RedirectURI))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.graphURL("/oauth/access_token")+"?"+q.Encode(), nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.http().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("instagram oauth: HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	var token InstagramUnifiedToken
	if err := json.Unmarshal(body, &token); err != nil {
		return nil, err
	}
	if strings.TrimSpace(token.AccessToken) == "" {
		return nil, fmt.Errorf("instagram oauth: empty access token")
	}
	return &token, nil
}

func (c *InstagramUnifiedClient) AssignedAccounts(ctx context.Context, accessToken string) ([]InstagramAccount, error) {
	endpoint := c.graphURL("/me/assigned_instagram_accounts")
	var accounts []InstagramAccount
	for endpoint != "" {
		q := url.Values{}
		q.Set("access_token", accessToken)
		q.Set("fields", "id,username")
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint+"?"+q.Encode(), nil)
		if err != nil {
			return nil, err
		}
		resp, err := c.http().Do(req)
		if err != nil {
			return nil, err
		}
		body, readErr := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
		resp.Body.Close()
		if readErr != nil {
			return nil, readErr
		}
		if resp.StatusCode >= 400 {
			return nil, fmt.Errorf("instagram accounts: HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
		}
		var page instagramAccountsPage
		if err := json.Unmarshal(body, &page); err != nil {
			return nil, err
		}
		slog.InfoContext(ctx, "instagram assigned accounts response", "status", resp.StatusCode, "accounts", len(page.Data), "has_next", strings.TrimSpace(page.Paging.Next) != "")
		accounts = append(accounts, page.Data...)
		endpoint = strings.TrimSpace(page.Paging.Next)
	}
	return accounts, nil
}

func (c *InstagramUnifiedClient) graphURL(path string) string {
	return strings.TrimRight(instagramGraphBaseURL, "/") + "/" + c.version() + "/" + strings.TrimLeft(path, "/")
}

func (c *InstagramUnifiedClient) version() string {
	if v := strings.TrimSpace(c.APIVersion); v != "" {
		return v
	}
	return "v27.0"
}

func (c *InstagramUnifiedClient) http() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return &http.Client{}
}
