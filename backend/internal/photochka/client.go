package photochka

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"strings"
	"time"
)

const liveTokenPrefix = "phk_live_"

var (
	ErrUnauthorized = errors.New("photochka unauthorized")
	ErrAPI          = errors.New("photochka api error")
)

type Client struct {
	baseURL    string
	httpClient *http.Client
}

func NewClient(baseURL string) *Client {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if baseURL == "" {
		baseURL = "https://photochka.ru/api/v1/integration"
	}
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

type IntegrationMe struct {
	UserID      string `json:"user_id"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	Plan        string `json:"plan"`
}

type IntegrationPost struct {
	ID          string `json:"id"`
	Status      string `json:"status"`
	ScheduledAt string `json:"scheduled_at,omitempty"`
	PublishedAt string `json:"published_at,omitempty"`
	Permalink   string `json:"permalink"`
}

type UploadView struct {
	ID string `json:"id"`
}

type PresignView struct {
	ID        string `json:"id"`
	UploadURL string `json:"upload_url"`
}

type CreatePostRequest struct {
	UploadIDs []string `json:"upload_ids"`
	Caption   string   `json:"caption"`
	Hashtags  []string `json:"hashtags"`
	Status    string   `json:"status"`
}

type apiError struct {
	Error struct {
		Message string `json:"message"`
		Code    string `json:"code"`
	} `json:"error"`
}

func (c *Client) Me(ctx context.Context, apiKey string) (IntegrationMe, error) {
	var out IntegrationMe
	err := c.doJSON(ctx, http.MethodGet, "/me", apiKey, nil, &out)
	return out, err
}

func (c *Client) UploadMedia(
	ctx context.Context,
	apiKey string,
	r io.Reader,
	filename, contentType string,
) (string, error) {
	if strings.TrimSpace(contentType) == "" {
		contentType = "application/octet-stream"
	}
	if strings.TrimSpace(filename) == "" {
		filename = "upload"
	}

	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	partHeader := make(textproto.MIMEHeader)
	partHeader.Set("Content-Disposition", fmt.Sprintf(`form-data; name="file"; filename="%s"`, multipartEscapeFilename(filename)))
	partHeader.Set("Content-Type", contentType)
	part, err := w.CreatePart(partHeader)
	if err != nil {
		return "", err
	}
	if _, err := io.Copy(part, r); err != nil {
		return "", err
	}
	if err := w.Close(); err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/posts/upload", &body)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(apiKey))
	req.Header.Set("Content-Type", w.FormDataContentType())

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode == http.StatusUnauthorized {
		return "", ErrUnauthorized
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", parseAPIError(resp.StatusCode, raw)
	}

	var view UploadView
	if err := json.Unmarshal(raw, &view); err != nil {
		return "", fmt.Errorf("decode upload response: %w", err)
	}
	if strings.TrimSpace(view.ID) == "" {
		return "", fmt.Errorf("photochka upload: empty id")
	}
	return view.ID, nil
}

func (c *Client) UploadVideo(
	ctx context.Context,
	apiKey string,
	data []byte,
	contentType, filename string,
) (string, error) {
	if len(data) == 0 {
		return "", fmt.Errorf("empty video payload")
	}
	if strings.TrimSpace(contentType) == "" {
		contentType = "video/mp4"
	}

	var presign PresignView
	err := c.doJSON(ctx, http.MethodPost, "/posts/upload/presign", apiKey, map[string]any{
		"content_type":   contentType,
		"content_length": len(data),
	}, &presign)
	if err != nil {
		return "", err
	}
	if strings.TrimSpace(presign.UploadURL) == "" || strings.TrimSpace(presign.ID) == "" {
		return "", fmt.Errorf("photochka presign: incomplete response")
	}

	putReq, err := http.NewRequestWithContext(ctx, http.MethodPut, presign.UploadURL, bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	putReq.Header.Set("Content-Type", contentType)
	putResp, err := c.httpClient.Do(putReq)
	if err != nil {
		return "", err
	}
	putResp.Body.Close()
	if putResp.StatusCode < 200 || putResp.StatusCode >= 300 {
		return "", fmt.Errorf("photochka video upload: HTTP %d", putResp.StatusCode)
	}

	var complete UploadView
	err = c.doJSON(ctx, http.MethodPost, "/posts/uploads/"+presign.ID+"/complete", apiKey, map[string]any{}, &complete)
	if err != nil {
		return "", err
	}
	if strings.TrimSpace(complete.ID) == "" {
		return presign.ID, nil
	}
	return complete.ID, nil
}

func (c *Client) CreatePost(ctx context.Context, apiKey string, req CreatePostRequest) (IntegrationPost, error) {
	var out struct {
		Post IntegrationPost `json:"post"`
	}
	err := c.doJSON(ctx, http.MethodPost, "/posts", apiKey, req, &out)
	return out.Post, err
}

func (c *Client) GetPost(ctx context.Context, apiKey, postID string) (IntegrationPost, error) {
	var out struct {
		Post IntegrationPost `json:"post"`
	}
	err := c.doJSON(ctx, http.MethodGet, "/posts/"+strings.TrimSpace(postID), apiKey, nil, &out)
	return out.Post, err
}

func (c *Client) ValidateAPIKey(apiKey string) error {
	apiKey = strings.TrimSpace(apiKey)
	if apiKey == "" {
		return fmt.Errorf("укажите API-ключ Photochka")
	}
	if !strings.HasPrefix(apiKey, liveTokenPrefix) {
		return fmt.Errorf("API-ключ Photochka должен начинаться с %s", liveTokenPrefix)
	}
	return nil
}

func (c *Client) doJSON(ctx context.Context, method, path, apiKey string, body any, out any) error {
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(raw)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(apiKey))
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode == http.StatusUnauthorized {
		return ErrUnauthorized
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return parseAPIError(resp.StatusCode, raw)
	}
	if out == nil {
		return nil
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return fmt.Errorf("decode photochka response: %w", err)
	}
	return nil
}

func parseAPIError(status int, raw []byte) error {
	var parsed apiError
	if err := json.Unmarshal(raw, &parsed); err == nil && strings.TrimSpace(parsed.Error.Message) != "" {
		return fmt.Errorf("%w: %s", ErrAPI, strings.TrimSpace(parsed.Error.Message))
	}
	return fmt.Errorf("%w: HTTP %d", ErrAPI, status)
}

func multipartEscapeFilename(name string) string {
	return strings.NewReplacer(`\`, `\\`, `"`, `\"`).Replace(name)
}
