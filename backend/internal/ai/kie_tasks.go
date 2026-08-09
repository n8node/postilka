package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"
)

const (
	KieFileUploadBaseURL = "https://kieai.redpandaai.co"
	defaultPollInterval  = 2 * time.Second
	defaultMaxWait       = 5 * time.Minute
)

type KieCreateTaskRequest struct {
	Model       string
	Input       map[string]any
	CallBackURL string
}

type KieTaskDetail struct {
	TaskID       string
	Model        string
	State        string
	FailMsg      string
	ResultURL    string
	Progress     int
	CostTime     int
	CreateTime   int64
	CompleteTime int64
}

// ProcessingDurationMs returns KIE processing time when available, else create→complete span.
func (d KieTaskDetail) ProcessingDurationMs() int {
	if d.CostTime > 0 {
		return d.CostTime
	}
	if d.CompleteTime > d.CreateTime && d.CreateTime > 0 {
		return int(d.CompleteTime - d.CreateTime)
	}
	return 0
}

func (c *KieClient) taskHTTPClient() *http.Client {
	return &http.Client{Timeout: 90 * time.Second}
}

func (c *KieClient) CreateTask(ctx context.Context, req KieCreateTaskRequest) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("kie api key not configured")
	}
	model := NormalizeKieModelID(req.Model)
	if model == "" {
		return "", fmt.Errorf("kie model is required")
	}

	body := map[string]any{
		"model": model,
		"input": req.Input,
	}
	if u := strings.TrimSpace(req.CallBackURL); u != "" {
		body["callBackUrl"] = u
	}

	raw, err := json.Marshal(body)
	if err != nil {
		return "", err
	}

	httpReq, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+"/api/v1/jobs/createTask",
		bytes.NewReader(raw),
	)
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	res, err := c.taskHTTPClient().Do(httpReq)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	respRaw, err := io.ReadAll(res.Body)
	if err != nil {
		return "", err
	}

	var payload struct {
		Code int    `json:"code"`
		Msg  string `json:"msg"`
		Data struct {
			TaskID string `json:"taskId"`
		} `json:"data"`
	}
	if err := json.Unmarshal(respRaw, &payload); err != nil {
		return "", err
	}
	if payload.Code != 200 {
		return "", parseKieAPIError(res.StatusCode, payload.Code, payload.Msg, respRaw)
	}
	taskID := strings.TrimSpace(payload.Data.TaskID)
	if taskID == "" {
		return "", fmt.Errorf("kie returned empty task id")
	}
	return taskID, nil
}

func (c *KieClient) GetTask(ctx context.Context, taskID string) (KieTaskDetail, error) {
	if c.apiKey == "" {
		return KieTaskDetail{}, fmt.Errorf("kie api key not configured")
	}
	taskID = strings.TrimSpace(taskID)
	if taskID == "" {
		return KieTaskDetail{}, fmt.Errorf("task id is required")
	}

	url := c.baseURL + "/api/v1/jobs/recordInfo?taskId=" + taskID
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return KieTaskDetail{}, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	res, err := c.taskHTTPClient().Do(httpReq)
	if err != nil {
		return KieTaskDetail{}, err
	}
	defer res.Body.Close()

	raw, err := io.ReadAll(res.Body)
	if err != nil {
		return KieTaskDetail{}, err
	}

	var payload struct {
		Code int    `json:"code"`
		Msg  string `json:"msg"`
		Data struct {
			TaskID       string `json:"taskId"`
			Model        string `json:"model"`
			State        string `json:"state"`
			FailMsg      string `json:"failMsg"`
			ResultJSON   string `json:"resultJson"`
			Progress     int    `json:"progress"`
			CostTime     int    `json:"costTime"`
			CreateTime   int64  `json:"createTime"`
			CompleteTime int64  `json:"completeTime"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return KieTaskDetail{}, err
	}
	if payload.Code != 200 {
		return KieTaskDetail{}, parseKieAPIError(res.StatusCode, payload.Code, payload.Msg, raw)
	}

	out := KieTaskDetail{
		TaskID:       payload.Data.TaskID,
		Model:        payload.Data.Model,
		State:        strings.ToLower(strings.TrimSpace(payload.Data.State)),
		FailMsg:      strings.TrimSpace(payload.Data.FailMsg),
		Progress:     payload.Data.Progress,
		CostTime:     payload.Data.CostTime,
		CreateTime:   payload.Data.CreateTime,
		CompleteTime: payload.Data.CompleteTime,
	}
	out.ResultURL = firstResultURL(payload.Data.ResultJSON)
	return out, nil
}

func firstResultURL(resultJSON string) string {
	resultJSON = strings.TrimSpace(resultJSON)
	if resultJSON == "" {
		return ""
	}
	var parsed struct {
		ResultURLs []string `json:"resultUrls"`
	}
	if err := json.Unmarshal([]byte(resultJSON), &parsed); err != nil {
		return ""
	}
	for _, u := range parsed.ResultURLs {
		if u = strings.TrimSpace(u); u != "" {
			return u
		}
	}
	return ""
}

func (c *KieClient) WaitForTask(ctx context.Context, taskID string) (KieTaskDetail, error) {
	deadline := time.Now().Add(defaultMaxWait)
	for {
		if ctx.Err() != nil {
			return KieTaskDetail{}, ctx.Err()
		}
		if time.Now().After(deadline) {
			return KieTaskDetail{}, fmt.Errorf("kie task timed out")
		}

		detail, err := c.GetTask(ctx, taskID)
		if err != nil {
			return KieTaskDetail{}, err
		}

		switch detail.State {
		case "success":
			if detail.ResultURL == "" {
				return KieTaskDetail{}, fmt.Errorf("kie task succeeded without result url")
			}
			return detail, nil
		case "fail":
			msg := detail.FailMsg
			if msg == "" {
				msg = "generation failed"
			}
			return KieTaskDetail{}, fmt.Errorf("%s", msg)
		case "waiting", "queuing", "generating", "":
		default:
		}

		select {
		case <-ctx.Done():
			return KieTaskDetail{}, ctx.Err()
		case <-time.After(defaultPollInterval):
		}
	}
}

func (c *KieClient) UploadFileFromURL(ctx context.Context, sourceURL, fileName string) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("kie api key not configured")
	}
	sourceURL = strings.TrimSpace(sourceURL)
	if sourceURL == "" {
		return "", fmt.Errorf("source url is required")
	}

	body := map[string]any{
		"fileUrl":    sourceURL,
		"uploadPath": "postilka/generation",
	}
	if fileName = strings.TrimSpace(fileName); fileName != "" {
		body["fileName"] = fileName
	}

	raw, err := json.Marshal(body)
	if err != nil {
		return "", err
	}

	httpReq, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		KieFileUploadBaseURL+"/api/file-url-upload",
		bytes.NewReader(raw),
	)
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	return c.doKieFileUpload(httpReq)
}

func (c *KieClient) UploadFileStream(ctx context.Context, data []byte, contentType, fileName string) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("kie api key not configured")
	}
	if len(data) == 0 {
		return "", fmt.Errorf("file is empty")
	}
	fileName = strings.TrimSpace(fileName)
	if fileName == "" {
		fileName = "source.jpg"
	}
	if contentType = strings.TrimSpace(contentType); contentType == "" {
		contentType = "application/octet-stream"
	}

	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	part, err := w.CreateFormFile("file", fileName)
	if err != nil {
		return "", err
	}
	if _, err := part.Write(data); err != nil {
		return "", err
	}
	_ = w.WriteField("uploadPath", "postilka/generation")
	_ = w.WriteField("fileName", fileName)
	if err := w.Close(); err != nil {
		return "", err
	}

	httpReq, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		KieFileUploadBaseURL+"/api/file-stream-upload",
		&buf,
	)
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	httpReq.Header.Set("Content-Type", w.FormDataContentType())

	return c.doKieFileUpload(httpReq)
}

func (c *KieClient) doKieFileUpload(httpReq *http.Request) (string, error) {
	res, err := c.taskHTTPClient().Do(httpReq)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	respRaw, err := io.ReadAll(res.Body)
	if err != nil {
		return "", err
	}

	var payload struct {
		Code    int    `json:"code"`
		Msg     string `json:"msg"`
		Success bool   `json:"success"`
		Data    struct {
			FileURL     string `json:"fileUrl"`
			DownloadURL string `json:"downloadUrl"`
		} `json:"data"`
	}
	if err := json.Unmarshal(respRaw, &payload); err != nil {
		return "", err
	}
	if payload.Code != 200 && payload.Code != 0 && !payload.Success {
		return "", parseKieAPIError(res.StatusCode, payload.Code, payload.Msg, respRaw)
	}
	fileURL := strings.TrimSpace(payload.Data.FileURL)
	if fileURL == "" {
		fileURL = strings.TrimSpace(payload.Data.DownloadURL)
	}
	if fileURL == "" {
		return "", fmt.Errorf("kie file upload returned no url")
	}
	return fileURL, nil
}

func prefixImageRefs(prompt string, imageCount int) string {
	if imageCount <= 0 {
		return prompt
	}
	var b strings.Builder
	for i := 1; i <= imageCount; i++ {
		b.WriteString(fmt.Sprintf("@image%d ", i))
	}
	b.WriteString(strings.TrimSpace(prompt))
	return b.String()
}

func mapGrokAspectRatio(ratio string) string {
	switch ratio {
	case "4:5":
		return "3:2"
	case "2:3", "3:2", "1:1", "16:9", "9:16":
		return ratio
	default:
		return "1:1"
	}
}

func mapGPTAspectRatio(ratio string) string {
	switch ratio {
	case "1:1", "3:2", "2:3", "4:3", "3:4", "5:4", "4:5", "16:9", "9:16":
		return ratio
	default:
		return "auto"
	}
}

func mapFluxAspectRatio(ratio string) string {
	switch ratio {
	case "4:5":
		return "3:4"
	case "1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3":
		return ratio
	default:
		return "1:1"
	}
}

func mapSeedreamImageSize(ratio string) string {
	switch ratio {
	case "9:16":
		return "portrait_16_9"
	case "16:9":
		return "landscape_16_9"
	case "4:5", "3:4":
		return "portrait_4_3"
	case "3:2", "4:3":
		return "landscape_4_3"
	default:
		return "square_hd"
	}
}

func DefaultModelForMode(mode string) string {
	switch strings.TrimSpace(mode) {
	case "image-to-image":
		return "grok-imagine/image-to-image"
	case "combine":
		return "grok-imagine/image-to-image"
	default:
		return "grok-imagine/text-to-image"
	}
}

func DefaultModelForFilter() string {
	return "google/nano-banana-edit"
}
