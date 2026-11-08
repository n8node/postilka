package oauth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

const (
	instagramAuthorizeURL = "https://www.instagram.com/oauth/authorize"
	instagramTokenURL     = "https://api.instagram.com/oauth/access_token"
	instagramGraphURL     = "https://graph.instagram.com"
	InstagramLoginScope   = "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights"
)

// InstagramLoginClient implements Instagram API with Instagram Login.
type InstagramLoginClient struct {
	AppID       string
	AppSecret   string
	RedirectURI string
	APIVersion  string
	HTTP        *http.Client
}

type InstagramLoginToken struct {
	AccessToken string `json:"access_token"`
	UserID      string `json:"user_id"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int64  `json:"expires_in"`
}

type InstagramAccount struct {
	ID             string `json:"id"`
	UserID         string `json:"user_id,omitempty"`
	Username       string `json:"username"`
	Name           string `json:"name"`
	AccountType    string `json:"account_type,omitempty"`
	ProfilePicture string `json:"profile_picture_url,omitempty"`
}

func (c *InstagramLoginClient) AuthorizeURL(state string) (string, error) {
	if strings.TrimSpace(c.AppID) == "" {
		return "", fmt.Errorf("instagram login: app id is required")
	}
	q := url.Values{}
	q.Set("client_id", strings.TrimSpace(c.AppID))
	q.Set("redirect_uri", strings.TrimSpace(c.RedirectURI))
	q.Set("response_type", "code")
	q.Set("scope", InstagramLoginScope)
	q.Set("state", strings.TrimSpace(state))
	return instagramAuthorizeURL + "?" + q.Encode(), nil
}

func (c *InstagramLoginClient) ExchangeCode(ctx context.Context, code string) (*InstagramLoginToken, error) {
	form := url.Values{
		"client_id":     {strings.TrimSpace(c.AppID)},
		"client_secret": {strings.TrimSpace(c.AppSecret)},
		"grant_type":    {"authorization_code"},
		"redirect_uri":  {strings.TrimSpace(c.RedirectURI)},
		"code":          {strings.TrimSpace(code)},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, instagramTokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := c.http().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("instagram oauth: HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	var short InstagramLoginToken
	if err := json.Unmarshal(body, &short); err != nil {
		return nil, err
	}
	if short.AccessToken == "" {
		return nil, fmt.Errorf("instagram oauth: empty access token")
	}
	return c.exchangeLongLivedToken(ctx, short.AccessToken)
}

func (c *InstagramLoginClient) exchangeLongLivedToken(ctx context.Context, shortToken string) (*InstagramLoginToken, error) {
	q := url.Values{"grant_type": {"ig_exchange_token"}, "client_secret": {strings.TrimSpace(c.AppSecret)}, "access_token": {strings.TrimSpace(shortToken)}}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.graphURL("/access_token")+"?"+q.Encode(), nil)
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
		return nil, fmt.Errorf("instagram long-lived token: HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	var token InstagramLoginToken
	if err := json.Unmarshal(body, &token); err != nil {
		return nil, err
	}
	if token.AccessToken == "" {
		return nil, fmt.Errorf("instagram long-lived token: empty access token")
	}
	return &token, nil
}

func (c *InstagramLoginClient) Profile(ctx context.Context, accessToken string) (*InstagramAccount, error) {
	q := url.Values{"fields": {"id,user_id,username,name,account_type,profile_picture_url"}, "access_token": {accessToken}}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.graphURL("/me")+"?"+q.Encode(), nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.http().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("instagram profile: HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	var profile InstagramAccount
	if err := json.Unmarshal(body, &profile); err != nil {
		return nil, err
	}
	if profile.ID == "" {
		return nil, fmt.Errorf("instagram profile: empty account id")
	}
	return &profile, nil
}

func (c *InstagramLoginClient) graphURL(path string) string {
	version := strings.TrimSpace(c.APIVersion)
	if version == "" {
		version = "v27.0"
	}
	return strings.TrimRight(instagramGraphURL, "/") + "/" + version + "/" + strings.TrimLeft(path, "/")
}

func (c *InstagramLoginClient) http() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return &http.Client{}
}
