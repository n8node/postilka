package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const DefaultKieBaseURL = "https://api.kie.ai"

type KieClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

type KieModelInfo struct {
	ID       string
	Name     string
	Category string
}

type KieConnectionResult struct {
	CreditsRemaining float64
	Models           []KieModelInfo
}

func NewKieClient(baseURL, apiKey string) *KieClient {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if baseURL == "" {
		baseURL = DefaultKieBaseURL
	}
	return &KieClient{
		baseURL: baseURL,
		apiKey:  strings.TrimSpace(apiKey),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *KieClient) TestConnection(ctx context.Context) (KieConnectionResult, error) {
	if c.apiKey == "" {
		return KieConnectionResult{}, fmt.Errorf("kie api key not configured")
	}

	credits, err := c.fetchCredits(ctx)
	if err != nil {
		return KieConnectionResult{}, err
	}

	return KieConnectionResult{
		CreditsRemaining: credits,
		Models:           KieMarketModels(),
	}, nil
}

func (c *KieClient) fetchCredits(ctx context.Context) (float64, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/api/v1/chat/credit", nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	res, err := c.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer res.Body.Close()

	raw, err := io.ReadAll(res.Body)
	if err != nil {
		return 0, err
	}

	var payload struct {
		Code int     `json:"code"`
		Msg  string  `json:"msg"`
		Data float64 `json:"data"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return 0, err
	}
	if payload.Code != 200 {
		return 0, parseKieAPIError(res.StatusCode, payload.Code, payload.Msg, raw)
	}
	return payload.Data, nil
}

func parseKieAPIError(httpStatus, code int, msg string, raw []byte) error {
	msg = strings.TrimSpace(msg)
	if msg == "" {
		body := strings.TrimSpace(string(raw))
		if len(body) > 240 {
			body = body[:240] + "…"
		}
		msg = body
	}
	if msg == "" {
		msg = "request failed"
	}
	if code != 0 {
		return fmt.Errorf("kie error %d: %s", code, msg)
	}
	return fmt.Errorf("kie error %d: %s", httpStatus, msg)
}
