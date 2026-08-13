package oauth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	youtubeAuthURL        = "https://accounts.google.com/o/oauth2/v2/auth"
	youtubeTokenURL       = "https://oauth2.googleapis.com/token"
	youtubeAPIBase        = "https://www.googleapis.com/youtube/v3"
	youtubeUploadBase     = "https://www.googleapis.com/upload/youtube/v3"
	youtubeDefaultCategory = "22"
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

type YouTubeVideoUploadInput struct {
	Title         string
	Description   string
	CategoryID    string
	PrivacyStatus string
	PublishAt     *time.Time
	MIMEType      string
	Filename      string
	Data          []byte
	Short         bool
}

type youtubeVideoInsertResponse struct {
	ID    string `json:"id"`
	Error struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
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

func (c *YouTubeClient) UploadVideo(ctx context.Context, accessToken string, input YouTubeVideoUploadInput) (string, error) {
	accessToken = strings.TrimSpace(accessToken)
	if accessToken == "" {
		return "", fmt.Errorf("youtube upload: empty access token")
	}
	if len(input.Data) == 0 {
		return "", fmt.Errorf("youtube upload: empty video data")
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return "", fmt.Errorf("youtube upload: title required")
	}
	if utf8RuneCount(title) > 100 {
		return "", fmt.Errorf("youtube upload: title must be at most 100 characters")
	}
	description := strings.TrimSpace(input.Description)
	if input.Short {
		title, description = applyYouTubeShortsTags(title, description)
	}
	if utf8RuneCount(description) > 5000 {
		return "", fmt.Errorf("youtube upload: description must be at most 5000 characters")
	}

	privacy := strings.ToLower(strings.TrimSpace(input.PrivacyStatus))
	if privacy == "" {
		privacy = "public"
	}
	if privacy != "public" && privacy != "private" && privacy != "unlisted" {
		return "", fmt.Errorf("youtube upload: invalid privacy status %q", privacy)
	}

	categoryID := strings.TrimSpace(input.CategoryID)
	if categoryID == "" {
		categoryID = youtubeDefaultCategory
	}

	status := map[string]any{"privacyStatus": privacy}
	if input.PublishAt != nil && input.PublishAt.After(time.Now().UTC()) {
		status["privacyStatus"] = "private"
		status["publishAt"] = input.PublishAt.UTC().Format(time.RFC3339)
	}

	metadata := map[string]any{
		"snippet": map[string]any{
			"title":       title,
			"description": description,
			"categoryId":  categoryID,
		},
		"status": status,
	}
	metaBytes, err := json.Marshal(metadata)
	if err != nil {
		return "", err
	}

	mimeType := strings.TrimSpace(input.MIMEType)
	if mimeType == "" {
		mimeType = "video/mp4"
	}

	initURL := youtubeUploadBase + "/videos?uploadType=resumable&part=snippet,status"
	initReq, err := http.NewRequestWithContext(ctx, http.MethodPost, initURL, bytes.NewReader(metaBytes))
	if err != nil {
		return "", err
	}
	initReq.Header.Set("Authorization", "Bearer "+accessToken)
	initReq.Header.Set("Content-Type", "application/json; charset=UTF-8")
	initReq.Header.Set("X-Upload-Content-Type", mimeType)
	initReq.Header.Set("X-Upload-Content-Length", fmt.Sprintf("%d", len(input.Data)))

	initResp, err := c.http().Do(initReq)
	if err != nil {
		return "", err
	}
	defer initResp.Body.Close()
	if initResp.StatusCode >= 400 {
		body, _ := io.ReadAll(io.LimitReader(initResp.Body, 1<<20))
		return "", fmt.Errorf("youtube upload init: HTTP %d: %s", initResp.StatusCode, strings.TrimSpace(string(body)))
	}
	uploadURL := strings.TrimSpace(initResp.Header.Get("Location"))
	if uploadURL == "" {
		return "", fmt.Errorf("youtube upload init: missing Location header")
	}

	uploadReq, err := http.NewRequestWithContext(ctx, http.MethodPut, uploadURL, bytes.NewReader(input.Data))
	if err != nil {
		return "", err
	}
	uploadReq.Header.Set("Content-Type", mimeType)
	uploadReq.ContentLength = int64(len(input.Data))

	uploadClient := c.uploadHTTPClient()
	uploadResp, err := uploadClient.Do(uploadReq)
	if err != nil {
		return "", err
	}
	defer uploadResp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(uploadResp.Body, 1<<20))
	if err != nil {
		return "", err
	}
	if uploadResp.StatusCode >= 400 {
		return "", fmt.Errorf("youtube upload: HTTP %d: %s", uploadResp.StatusCode, strings.TrimSpace(string(body)))
	}

	var parsed youtubeVideoInsertResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", fmt.Errorf("youtube upload: parse response: %w", err)
	}
	if parsed.Error.Message != "" {
		return "", fmt.Errorf("youtube upload: %s", parsed.Error.Message)
	}
	videoID := strings.TrimSpace(parsed.ID)
	if videoID == "" {
		return "", fmt.Errorf("youtube upload: empty video id in response")
	}
	return videoID, nil
}

func (c *YouTubeClient) uploadHTTPClient() *http.Client {
	base := c.http()
	if base == nil {
		base = DefaultVKHTTPClient()
	}
	transport := base.Transport
	if transport == nil {
		transport = http.DefaultTransport
	}
	return &http.Client{
		Timeout:   30 * time.Minute,
		Transport: transport,
	}
}

func utf8RuneCount(s string) int {
	return len([]rune(s))
}

func applyYouTubeShortsTags(title, description string) (string, string) {
	if strings.Contains(strings.ToLower(title), "#shorts") ||
		strings.Contains(strings.ToLower(description), "#shorts") {
		return title, description
	}
	if utf8RuneCount(title)+len(" #Shorts") <= 100 {
		title = strings.TrimSpace(title) + " #Shorts"
		return title, description
	}
	description = strings.TrimSpace(description)
	if description != "" {
		description += "\n\n"
	}
	description += "#Shorts"
	return title, description
}

func (c *YouTubeClient) http() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return DefaultVKHTTPClient()
}
