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

const yandexAuthURL = "https://oauth.yandex.ru/authorize"
const yandexTokenURL = "https://oauth.yandex.ru/token"
const zenAPIBase = "https://api.zen.yandex.com/v1"

type DzenClient struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
	HTTP         *http.Client
}

type DzenTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
	Error        string `json:"error"`
	ErrorDesc    string `json:"error_description"`
}

type DzenChannel struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	URL   string `json:"url"`
}

func (c *DzenClient) AuthorizeURL(state string) string {
	values := url.Values{}
	values.Set("response_type", "code")
	values.Set("client_id", c.ClientID)
	values.Set("redirect_uri", c.RedirectURI)
	values.Set("state", state)
	return yandexAuthURL + "?" + values.Encode()
}

func (c *DzenClient) ExchangeCode(ctx context.Context, code string) (*DzenTokenResponse, error) {
	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("client_id", c.ClientID)
	form.Set("client_secret", c.ClientSecret)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, yandexTokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.http().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("dzen token: HTTP %d: %s", resp.StatusCode, string(body))
	}

	var out DzenTokenResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	if out.Error != "" {
		return nil, fmt.Errorf("dzen token: %s — %s", out.Error, out.ErrorDesc)
	}
	if out.AccessToken == "" {
		return nil, fmt.Errorf("dzen token: empty access_token")
	}
	return &out, nil
}

func (c *DzenClient) ListChannels(ctx context.Context, accessToken string) ([]DzenChannel, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, zenAPIBase+"/channels", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "OAuth "+accessToken)

	resp, err := c.http().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("dzen channels: HTTP %d: %s", resp.StatusCode, string(body))
	}

	var parsed struct {
		Channels []DzenChannel `json:"channels"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	return parsed.Channels, nil
}

func (c *DzenClient) http() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return DefaultVKHTTPClient()
}
