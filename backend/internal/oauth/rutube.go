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

const rutubeAuthURL = "https://rutube.ru/api/oauth2/authorize"
const rutubeTokenURL = "https://rutube.ru/api/oauth2/token"
const rutubeAPIBase = "https://rutube.ru/api"

type RutubeClient struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
	HTTP         *http.Client
}

type RutubeTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
	Error        string `json:"error"`
	ErrorDesc    string `json:"error_description"`
}

type RutubeChannel struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	URL   string `json:"url"`
	Icon  string `json:"icon"`
}

func (c *RutubeClient) AuthorizeURL(state string) string {
	values := url.Values{}
	values.Set("client_id", c.ClientID)
	values.Set("response_type", "code")
	values.Set("redirect_uri", c.RedirectURI)
	values.Set("state", state)
	return rutubeAuthURL + "?" + values.Encode()
}

func (c *RutubeClient) ExchangeCode(ctx context.Context, code string) (*RutubeTokenResponse, error) {
	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("client_id", c.ClientID)
	form.Set("client_secret", c.ClientSecret)
	form.Set("redirect_uri", c.RedirectURI)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, rutubeTokenURL, strings.NewReader(form.Encode()))
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
		return nil, fmt.Errorf("rutube token: HTTP %d: %s", resp.StatusCode, string(body))
	}

	var out RutubeTokenResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	if out.Error != "" {
		return nil, fmt.Errorf("rutube token: %s — %s", out.Error, out.ErrorDesc)
	}
	if out.AccessToken == "" {
		return nil, fmt.Errorf("rutube token: empty access_token")
	}
	return &out, nil
}

func (c *RutubeClient) ListChannels(ctx context.Context, accessToken string) ([]RutubeChannel, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rutubeAPIBase+"/video/person/", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

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
		return nil, fmt.Errorf("rutube channels: HTTP %d: %s", resp.StatusCode, string(body))
	}

	var parsed struct {
		Results []RutubeChannel `json:"results"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	if len(parsed.Results) == 0 {
		return []RutubeChannel{}, nil
	}
	return parsed.Results, nil
}

func (c *RutubeClient) http() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return DefaultVKHTTPClient()
}

func RutubeChannelExternalID(id int) string {
	return fmt.Sprintf("%d", id)
}

func (c *RutubeClient) PostChannelText(ctx context.Context, accessToken, channelID, text string) error {
	form := url.Values{}
	form.Set("text", text)

	endpoint := fmt.Sprintf("%s/video/person/%s/feed/", rutubeAPIBase, url.PathEscape(channelID))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.http().Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode >= 400 {
		return fmt.Errorf("rutube post: HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return nil
}
