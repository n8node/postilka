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

// dzenScope is configured in the Yandex OAuth app; empty means default app scopes.
const dzenScope = ""

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
	ID      string `json:"id"`
	Title   string `json:"title"`
	URL     string `json:"url"`
	IconURL string `json:"icon_url"`
}

type DzenContentType string

const (
	DzenContentBrief   DzenContentType = "brief"
	DzenContentArticle DzenContentType = "article"
)

type DzenPublicationInput struct {
	ChannelID   string
	ContentType DzenContentType
	Text        string
	Title       string
	CoverURL    string
	ImageURL    string
}

func (c *DzenClient) AuthorizeURL(state string) string {
	values := url.Values{}
	values.Set("response_type", "code")
	values.Set("client_id", c.ClientID)
	values.Set("redirect_uri", c.RedirectURI)
	values.Set("state", state)
	if dzenScope != "" {
		values.Set("scope", dzenScope)
	}
	return yandexAuthURL + "?" + values.Encode()
}

func (c *DzenClient) ExchangeCode(ctx context.Context, code string) (*DzenTokenResponse, error) {
	return c.requestToken(ctx, url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"client_id":     {c.ClientID},
		"client_secret": {c.ClientSecret},
	})
}

func (c *DzenClient) RefreshToken(ctx context.Context, refreshToken string) (*DzenTokenResponse, error) {
	refreshToken = strings.TrimSpace(refreshToken)
	if refreshToken == "" {
		return nil, fmt.Errorf("dzen refresh: empty refresh_token")
	}
	return c.requestToken(ctx, url.Values{
		"grant_type":    {"refresh_token"},
		"refresh_token": {refreshToken},
		"client_id":     {c.ClientID},
		"client_secret": {c.ClientSecret},
	})
}

func (c *DzenClient) requestToken(ctx context.Context, form url.Values) (*DzenTokenResponse, error) {
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

func (c *DzenClient) PostBrief(ctx context.Context, accessToken, channelID, text string) (string, error) {
	return c.Publish(ctx, accessToken, DzenPublicationInput{
		ChannelID:   channelID,
		ContentType: DzenContentBrief,
		Text:        text,
	})
}

func (c *DzenClient) PostArticle(ctx context.Context, accessToken string, input DzenPublicationInput) (string, error) {
	input.ContentType = DzenContentArticle
	return c.Publish(ctx, accessToken, input)
}

func (c *DzenClient) Publish(ctx context.Context, accessToken string, input DzenPublicationInput) (string, error) {
	channelID := strings.TrimSpace(input.ChannelID)
	if channelID == "" {
		return "", fmt.Errorf("dzen publish: channel_id required")
	}

	contentType := input.ContentType
	if contentType == "" {
		contentType = DzenContentBrief
	}

	var content map[string]any
	switch contentType {
	case DzenContentArticle:
		title := strings.TrimSpace(input.Title)
		text := strings.TrimSpace(input.Text)
		if title == "" {
			return "", fmt.Errorf("dzen publish: title required for article")
		}
		if text == "" {
			return "", fmt.Errorf("dzen publish: text required for article")
		}
		article := map[string]string{
			"title": title,
			"text":  text,
		}
		if cover := strings.TrimSpace(input.CoverURL); cover != "" {
			article["cover_url"] = cover
		}
		content = map[string]any{
			"type":    string(DzenContentArticle),
			"article": article,
		}
	default:
		text := strings.TrimSpace(input.Text)
		if text == "" {
			return "", fmt.Errorf("dzen publish: text required for brief")
		}
		brief := map[string]string{"text": text}
		if imageURL := strings.TrimSpace(input.ImageURL); imageURL != "" {
			brief["image_url"] = imageURL
		}
		content = map[string]any{
			"type":  string(DzenContentBrief),
			"brief": brief,
		}
	}

	payload, err := json.Marshal(map[string]any{
		"channel_id": channelID,
		"content":    content,
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, zenAPIBase+"/publications", strings.NewReader(string(payload)))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "OAuth "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http().Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", err
	}
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("dzen publications: HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var parsed struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", nil
	}
	return parsed.ID, nil
}

func (c *DzenClient) http() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return DefaultVKHTTPClient()
}
