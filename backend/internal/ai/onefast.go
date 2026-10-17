package ai

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const DefaultOneFastBaseURL = "https://api.onefast.ai"

type OneFastClient struct {
	baseURL string
	apiKey  string
	group   string
	http    *http.Client
}

func NewOneFastClient(baseURL, apiKey, group string) *OneFastClient {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if baseURL == "" {
		baseURL = DefaultOneFastBaseURL
	}
	return &OneFastClient{baseURL: baseURL, apiKey: strings.TrimSpace(apiKey), group: strings.TrimSpace(group), http: &http.Client{Timeout: 300 * time.Second}}
}

type OneFastImageResult struct {
	Data        []byte
	ContentType string
}

func (c *OneFastClient) request(ctx context.Context, method, path string, body io.Reader, contentType string) (*http.Response, []byte, error) {
	if c.apiKey == "" {
		return nil, nil, fmt.Errorf("onefast api key not configured")
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, body)
	if err != nil {
		return nil, nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	if c.group != "" {
		req.Header.Set("X-Token-Group", c.group)
	}
	res, err := c.http.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(res.Body, 64<<20))
	if err != nil {
		return nil, nil, err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return res, raw, fmt.Errorf("onefast error %d: %s", res.StatusCode, oneFastError(raw))
	}
	return res, raw, nil
}

func oneFastError(raw []byte) string {
	var p struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if json.Unmarshal(raw, &p) == nil && strings.TrimSpace(p.Error.Message) != "" {
		return p.Error.Message
	}
	s := strings.TrimSpace(string(raw))
	if len(s) > 300 {
		s = s[:300] + "…"
	}
	return s
}

func (c *OneFastClient) GenerateImage(ctx context.Context, modelID, prompt, size string) (OneFastImageResult, error) {
	body, _ := json.Marshal(map[string]any{"model": modelID, "prompt": prompt, "size": size, "n": 1})
	res, raw, err := c.request(ctx, http.MethodPost, "/v1/images/generations", bytes.NewReader(body), "application/json")
	if err != nil {
		return OneFastImageResult{}, err
	}
	var p struct {
		Data []struct {
			B64 string `json:"b64_json"`
		} `json:"data"`
	}
	if err = json.Unmarshal(raw, &p); err != nil {
		return OneFastImageResult{}, err
	}
	if len(p.Data) == 0 || strings.TrimSpace(p.Data[0].B64) == "" {
		return OneFastImageResult{}, fmt.Errorf("onefast returned empty image")
	}
	data, err := base64.StdEncoding.DecodeString(p.Data[0].B64)
	if err != nil {
		return OneFastImageResult{}, fmt.Errorf("decode onefast image: %w", err)
	}
	ct := "image/png"
	if res.Header.Get("Content-Type") != "" {
		ct = "image/png"
	}
	return OneFastImageResult{Data: data, ContentType: ct}, nil
}

func (c *OneFastClient) EditImage(ctx context.Context, modelID, prompt string, image []byte, filename, contentType string) (OneFastImageResult, error) {
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	_ = mw.WriteField("model", modelID)
	_ = mw.WriteField("prompt", prompt)
	part, err := mw.CreateFormFile("image", filename)
	if err != nil {
		return OneFastImageResult{}, err
	}
	if _, err = part.Write(image); err != nil {
		return OneFastImageResult{}, err
	}
	if err = mw.Close(); err != nil {
		return OneFastImageResult{}, err
	}
	_, raw, err := c.request(ctx, http.MethodPost, "/v1/images/edits", &buf, mw.FormDataContentType())
	if err != nil {
		return OneFastImageResult{}, err
	}
	var p struct {
		Data []struct {
			B64 string `json:"b64_json"`
		} `json:"data"`
	}
	if err = json.Unmarshal(raw, &p); err != nil {
		return OneFastImageResult{}, err
	}
	if len(p.Data) == 0 {
		return OneFastImageResult{}, fmt.Errorf("onefast returned empty edited image")
	}
	data, err := base64.StdEncoding.DecodeString(p.Data[0].B64)
	if err != nil {
		return OneFastImageResult{}, err
	}
	if contentType == "" {
		contentType = "image/png"
	}
	return OneFastImageResult{Data: data, ContentType: contentType}, nil
}

type OneFastVideoTask struct {
	ID          string
	Status      string
	ResultURL   string
	FailMessage string
	Progress    int
}

func (c *OneFastClient) CreateVideo(ctx context.Context, modelID string, content []map[string]any, ratio string, duration int, resolution string, audio bool) (OneFastVideoTask, error) {
	body, _ := json.Marshal(map[string]any{"model": modelID, "content": content, "ratio": ratio, "duration": duration, "resolution": resolution, "generate_audio": audio})
	_, raw, err := c.request(ctx, http.MethodPost, "/api/v3/contents/generations/tasks", bytes.NewReader(body), "application/json")
	if err != nil {
		return OneFastVideoTask{}, err
	}
	var p struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	if err = json.Unmarshal(raw, &p); err != nil {
		return OneFastVideoTask{}, err
	}
	if strings.TrimSpace(p.ID) == "" {
		return OneFastVideoTask{}, fmt.Errorf("onefast returned empty video task id")
	}
	return OneFastVideoTask{ID: p.ID, Status: strings.ToLower(p.Status)}, nil
}

func (c *OneFastClient) GetVideo(ctx context.Context, taskID string) (OneFastVideoTask, error) {
	path := "/api/v3/contents/generations/tasks/" + url.PathEscape(strings.TrimSpace(taskID))
	_, raw, err := c.request(ctx, http.MethodGet, path, nil, "")
	if err != nil {
		return OneFastVideoTask{}, err
	}
	var p struct {
		ID      string `json:"id"`
		Status  string `json:"status"`
		Content struct {
			VideoURL string `json:"video_url"`
		} `json:"content"`
		URL      string `json:"url"`
		VideoURL string `json:"video_url"`
		Error    struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err = json.Unmarshal(raw, &p); err != nil {
		return OneFastVideoTask{}, err
	}
	result := p.Content.VideoURL
	if result == "" {
		result = p.URL
	}
	if result == "" {
		result = p.VideoURL
	}
	return OneFastVideoTask{ID: p.ID, Status: strings.ToLower(p.Status), ResultURL: result, FailMessage: p.Error.Message}, nil
}
