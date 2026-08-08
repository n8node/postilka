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
	youtubeAuthURL  = "https://accounts.google.com/o/oauth2/v2/auth"
	youtubeTokenURL = "https://oauth2.googleapis.com/token"
	youtubeAPIBase  = "https://www.googleapis.com/youtube/v3"
)

const YouTubeOAuthScope = "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl"

type YouTubeClient struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
	HTTP         *http.Client
}

type YouTubeTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
	Error        string `json:"error"`
	ErrorDesc    string `json:"error_description"`
}

type YouTubeChannel struct {
	ID          string
	Title       string
	ThumbnailURL string
	CustomURL   string
}

type youtubeChannelsResponse struct {
	Items []struct {
		ID      string `json:"id"`
		Snippet struct {
			Title      string `json:"title"`
			CustomURL  string `json:"customUrl"`
			Thumbnails struct {
				Default struct {
					URL string `json:"url"`
				} `json:"default"`
				Medium struct {
					URL string `json:"url"`
				} `json:"medium"`
				High struct {
					URL string `json:"url"`
				} `json:"high"`
			} `json:"thumbnails"`
		} `json:"snippet"`
	} `json:"items"`
	Error struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func (c *YouTubeClient) AuthorizeURL(state string) string {
	values := url.Values{}
	values.Set("client_id", c.ClientID)
	values.Set("response_type", "code")
	values.Set("redirect_uri", c.RedirectURI)
	values.Set("scope", YouTubeOAuthScope)
	values.Set("state", state)
	values.Set("access_type", "offline")
	values.Set("prompt", "consent")
	values.Set("include_granted_scopes", "true")
	return youtubeAuthURL + "?" + values.Encode()
}

func (c *YouTubeClient) ExchangeCode(ctx context.Context, code string) (*YouTubeTokenResponse, error) {
	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("client_id", c.ClientID)
	form.Set("client_secret", c.ClientSecret)
	form.Set("redirect_uri", c.RedirectURI)
	return c.requestToken(ctx, form)
}

func (c *YouTubeClient) RefreshToken(ctx context.Context, refreshToken string) (*YouTubeTokenResponse, error) {
	refreshToken = strings.TrimSpace(refreshToken)
	if refreshToken == "" {
		return nil, fmt.Errorf("youtube refresh: empty refresh_token")
	}
	return c.requestToken(ctx, url.Values{
		"grant_type":    {"refresh_token"},
		"refresh_token": {refreshToken},
		"client_id":     {c.ClientID},
		"client_secret": {c.ClientSecret},
	})
}

func (c *YouTubeClient) requestToken(ctx context.Context, form url.Values) (*YouTubeTokenResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, youtubeTokenURL, strings.NewReader(form.Encode()))
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
		return nil, fmt.Errorf("youtube token: HTTP %d: %s", resp.StatusCode, string(body))
	}

	var out YouTubeTokenResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	if out.Error != "" {
		return nil, fmt.Errorf("youtube token: %s — %s", out.Error, out.ErrorDesc)
	}
	if out.AccessToken == "" {
		return nil, fmt.Errorf("youtube token: empty access_token")
	}
	return &out, nil
}

func youTubeChannelThumbnailURL(high, medium, defaultURL string) string {
	for _, url := range []string{high, medium, defaultURL} {
		if u := strings.TrimSpace(url); u != "" {
			return u
		}
	}
	return ""
}

func (c *YouTubeClient) ListMyChannels(ctx context.Context, accessToken string) ([]YouTubeChannel, error) {
	values := url.Values{}
	values.Set("part", "snippet")
	values.Set("mine", "true")
	values.Set("maxResults", "50")

	endpoint := youtubeAPIBase + "/channels?" + values.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
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
		return nil, fmt.Errorf("youtube channels: HTTP %d: %s", resp.StatusCode, string(body))
	}

	var parsed youtubeChannelsResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	if parsed.Error.Message != "" {
		return nil, fmt.Errorf("youtube channels: %s", parsed.Error.Message)
	}

	out := make([]YouTubeChannel, 0, len(parsed.Items))
	for _, item := range parsed.Items {
		id := strings.TrimSpace(item.ID)
		if id == "" {
			continue
		}
		thumb := youTubeChannelThumbnailURL(
			item.Snippet.Thumbnails.High.URL,
			item.Snippet.Thumbnails.Medium.URL,
			item.Snippet.Thumbnails.Default.URL,
		)
		out = append(out, YouTubeChannel{
			ID:           id,
			Title:        strings.TrimSpace(item.Snippet.Title),
			ThumbnailURL: thumb,
			CustomURL:    strings.TrimSpace(item.Snippet.CustomURL),
		})
	}
	return out, nil
}

func (c *YouTubeClient) VerifyChannelAccess(ctx context.Context, accessToken, channelID string) (*YouTubeChannel, error) {
	channelID = strings.TrimSpace(channelID)
	if channelID == "" {
		return nil, fmt.Errorf("youtube: channel id required")
	}
	values := url.Values{}
	values.Set("part", "snippet")
	values.Set("id", channelID)

	endpoint := youtubeAPIBase + "/channels?" + values.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
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
		return nil, fmt.Errorf("youtube verify: HTTP %d: %s", resp.StatusCode, string(body))
	}

	var parsed youtubeChannelsResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	if len(parsed.Items) == 0 {
		return nil, fmt.Errorf("youtube: канал недоступен или нет прав")
	}
	item := parsed.Items[0]
	return &YouTubeChannel{
		ID:           item.ID,
		Title:        strings.TrimSpace(item.Snippet.Title),
		ThumbnailURL: youTubeChannelThumbnailURL(
			item.Snippet.Thumbnails.High.URL,
			item.Snippet.Thumbnails.Medium.URL,
			item.Snippet.Thumbnails.Default.URL,
		),
		CustomURL:    strings.TrimSpace(item.Snippet.CustomURL),
	}, nil
}

func YouTubeChannelExternalID(id string) string {
	return strings.TrimSpace(id)
}

func YouTubeChannelPublicURL(ch YouTubeChannel) string {
	if custom := strings.TrimPrefix(strings.TrimSpace(ch.CustomURL), "@"); custom != "" {
		return "https://www.youtube.com/@" + url.PathEscape(custom)
	}
	if id := strings.TrimSpace(ch.ID); id != "" {
		return "https://www.youtube.com/channel/" + url.PathEscape(id)
	}
	return ""
}

func (c *YouTubeClient) http() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return DefaultVKHTTPClient()
}
