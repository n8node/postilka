package oauth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const rutubeAuthURL = "https://rutube.ru/api/oauth2/authorize"
const rutubeTokenURL = "https://rutube.ru/api/oauth2/token"
const rutubeAPIBase = "https://rutube.ru/api"

const RutubeDefaultCategoryID = 13

type RutubeContentType string

const (
	RutubeContentFeed  RutubeContentType = "feed"
	RutubeContentVideo RutubeContentType = "video"
)

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
	ID   int    `json:"id"`
	Name string `json:"name"`
	URL  string `json:"url"`
	Icon string `json:"icon"`
}

type RutubeVideoUploadInput struct {
	VideoURL     string
	Title        string
	Description  string
	IsHidden     bool
	CategoryID   int
	ThumbnailURL string
	CallbackURL  string
	ErrbackURL   string
	PublishAt    *time.Time
}

type RutubePublishInput struct {
	ChannelID   string
	ContentType RutubeContentType
	Text        string
	Title       string
	VideoURL    string
	PhotoURL    string
	PublishAt   *time.Time
	CallbackURL string
	ErrbackURL  string
}

type rutubeUploadResponse struct {
	VideoID string `json:"video_id"`
	ID      string `json:"id"`
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
	return c.requestToken(ctx, form)
}

func (c *RutubeClient) RefreshToken(ctx context.Context, refreshToken string) (*RutubeTokenResponse, error) {
	refreshToken = strings.TrimSpace(refreshToken)
	if refreshToken == "" {
		return nil, fmt.Errorf("rutube refresh: empty refresh_token")
	}
	return c.requestToken(ctx, url.Values{
		"grant_type":    {"refresh_token"},
		"refresh_token": {refreshToken},
		"client_id":     {c.ClientID},
		"client_secret": {c.ClientSecret},
	})
}

func (c *RutubeClient) requestToken(ctx context.Context, form url.Values) (*RutubeTokenResponse, error) {
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

func (c *RutubeClient) UploadVideo(ctx context.Context, accessToken string, input RutubeVideoUploadInput) (string, error) {
	videoURL := strings.TrimSpace(input.VideoURL)
	if videoURL == "" {
		return "", fmt.Errorf("rutube upload: video URL обязателен")
	}

	form := url.Values{}
	form.Set("url", videoURL)
	form.Set("title", strings.TrimSpace(input.Title))
	form.Set("description", strings.TrimSpace(input.Description))
	if input.IsHidden {
		form.Set("is_hidden", "1")
	} else {
		form.Set("is_hidden", "0")
	}
	categoryID := input.CategoryID
	if categoryID <= 0 {
		categoryID = RutubeDefaultCategoryID
	}
	form.Set("category_id", fmt.Sprintf("%d", categoryID))
	if callbackURL := strings.TrimSpace(input.CallbackURL); callbackURL != "" {
		form.Set("callback_url", callbackURL)
	}
	if errbackURL := strings.TrimSpace(input.ErrbackURL); errbackURL != "" {
		form.Set("errback_url", errbackURL)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, rutubeAPIBase+"/video/", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

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
		return "", fmt.Errorf("rutube upload: HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var out rutubeUploadResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return "", fmt.Errorf("rutube upload: parse response: %w", err)
	}
	videoID := strings.TrimSpace(out.VideoID)
	if videoID == "" {
		videoID = strings.TrimSpace(out.ID)
	}
	if videoID == "" {
		return "", fmt.Errorf("rutube upload: empty video_id in response")
	}
	return videoID, nil
}

func (c *RutubeClient) AddThumbFromURL(ctx context.Context, accessToken, videoID, imageURL string) error {
	imageURL = strings.TrimSpace(imageURL)
	if imageURL == "" {
		return nil
	}

	imgReq, err := http.NewRequestWithContext(ctx, http.MethodGet, imageURL, nil)
	if err != nil {
		return err
	}
	imgResp, err := c.http().Do(imgReq)
	if err != nil {
		return fmt.Errorf("rutube thumb: download image: %w", err)
	}
	defer imgResp.Body.Close()
	if imgResp.StatusCode >= 400 {
		return fmt.Errorf("rutube thumb: download HTTP %d", imgResp.StatusCode)
	}

	imageData, err := io.ReadAll(io.LimitReader(imgResp.Body, 10<<20))
	if err != nil {
		return err
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "thumbnail.jpg")
	if err != nil {
		return err
	}
	if _, err := part.Write(imageData); err != nil {
		return err
	}
	if err := writer.Close(); err != nil {
		return err
	}

	endpoint := fmt.Sprintf("%s/video/%s/thumbnail/", rutubeAPIBase, url.PathEscape(videoID))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, &body)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := c.http().Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode >= 400 {
		return fmt.Errorf("rutube thumb: HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}
	return nil
}

func (c *RutubeClient) SchedulePublication(ctx context.Context, accessToken, videoID string, publishAt time.Time) error {
	videoID = strings.TrimSpace(videoID)
	if videoID == "" {
		return fmt.Errorf("rutube schedule: empty video_id")
	}

	form := url.Values{}
	form.Set("video", videoID)
	form.Set("timestamp", publishAt.Format("2006-01-02 15:04:05"))

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, rutubeAPIBase+"/video/publication/", strings.NewReader(form.Encode()))
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
		return fmt.Errorf("rutube schedule: HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return nil
}

func (c *RutubeClient) Publish(ctx context.Context, accessToken string, input RutubePublishInput) (string, error) {
	contentType := input.ContentType
	if contentType == "" {
		contentType = RutubeContentFeed
	}

	switch contentType {
	case RutubeContentFeed:
		text := strings.TrimSpace(input.Text)
		if text == "" {
			return "", fmt.Errorf("rutube: для поста в ленту нужен текст")
		}
		if err := c.PostChannelText(ctx, accessToken, input.ChannelID, text); err != nil {
			return "", err
		}
		return "", nil

	case RutubeContentVideo:
		videoURL := strings.TrimSpace(input.VideoURL)
		if videoURL == "" {
			return "", fmt.Errorf("rutube: для видео укажите video_url")
		}
		title := strings.TrimSpace(input.Title)
		if title == "" {
			title = "Видео от Postilka"
		}

		isHidden := input.PublishAt != nil && input.PublishAt.After(time.Now().Add(time.Minute))
		videoID, err := c.UploadVideo(ctx, accessToken, RutubeVideoUploadInput{
			VideoURL:    videoURL,
			Title:       title,
			Description: strings.TrimSpace(input.Text),
			IsHidden:    isHidden,
			ThumbnailURL: strings.TrimSpace(input.PhotoURL),
			CallbackURL: strings.TrimSpace(input.CallbackURL),
			ErrbackURL:  strings.TrimSpace(input.ErrbackURL),
		})
		if err != nil {
			return "", err
		}

		if thumbURL := strings.TrimSpace(input.PhotoURL); thumbURL != "" {
			if err := c.AddThumbFromURL(ctx, accessToken, videoID, thumbURL); err != nil {
				return videoID, fmt.Errorf("видео загружено (%s), но обложка не установлена: %w", videoID, err)
			}
		}

		if input.PublishAt != nil && input.PublishAt.After(time.Now()) {
			if err := c.SchedulePublication(ctx, accessToken, videoID, *input.PublishAt); err != nil {
				return videoID, fmt.Errorf("видео загружено (%s), но отложенная публикация не настроена: %w", videoID, err)
			}
		}

		return videoID, nil

	default:
		return "", fmt.Errorf("rutube: неподдерживаемый content_type %q", contentType)
	}
}
