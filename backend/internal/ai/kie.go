package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

const DefaultKieBaseURL = "https://api.kie.ai"

type KieClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

var kieRequestLimiter = make(chan struct{}, 8)

var kieSubmitLimiter = struct {
	sync.Mutex
	limit  int
	window time.Duration
	hits   []time.Time
}{limit: 18, window: 10 * time.Second}

func ConfigureKieSubmitRate(limit int, window time.Duration) {
	if limit < 1 {
		limit = 18
	}
	if window <= 0 {
		window = 10 * time.Second
	}
	kieSubmitLimiter.Lock()
	kieSubmitLimiter.limit = limit
	kieSubmitLimiter.window = window
	kieSubmitLimiter.hits = nil
	kieSubmitLimiter.Unlock()
}

func waitForKieSubmit(ctx context.Context) error {
	for {
		now := time.Now()
		kieSubmitLimiter.Lock()
		cutoff := now.Add(-kieSubmitLimiter.window)
		keep := 0
		for keep < len(kieSubmitLimiter.hits) && kieSubmitLimiter.hits[keep].After(cutoff) {
			keep++
		}
		kieSubmitLimiter.hits = kieSubmitLimiter.hits[:keep]
		if len(kieSubmitLimiter.hits) < kieSubmitLimiter.limit {
			kieSubmitLimiter.hits = append(kieSubmitLimiter.hits, now)
			kieSubmitLimiter.Unlock()
			return nil
		}
		wait := time.Until(kieSubmitLimiter.hits[0].Add(kieSubmitLimiter.window))
		kieSubmitLimiter.Unlock()
		if wait < time.Millisecond {
			wait = time.Millisecond
		}
		timer := time.NewTimer(wait)
		select {
		case <-ctx.Done():
			timer.Stop()
			return ctx.Err()
		case <-timer.C:
		}
	}
}

func withKieRequest(ctx context.Context, fn func() error) error {
	select {
	case kieRequestLimiter <- struct{}{}:
		defer func() { <-kieRequestLimiter }()
		return fn()
	case <-ctx.Done():
		return ctx.Err()
	}
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

func (c *KieClient) TestConnectionVideo(ctx context.Context) (KieConnectionResult, error) {
	if c.apiKey == "" {
		return KieConnectionResult{}, fmt.Errorf("kie api key not configured")
	}

	credits, err := c.fetchCredits(ctx)
	if err != nil {
		return KieConnectionResult{}, err
	}

	return KieConnectionResult{
		CreditsRemaining: credits,
		Models:           KieVideoMarketModels(),
	}, nil
}

func (c *KieClient) fetchCredits(ctx context.Context) (float64, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/api/v1/chat/credit", nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	var res *http.Response
	err = withKieRequest(ctx, func() error {
		var requestErr error
		res, requestErr = c.httpClient.Do(req)
		return requestErr
	})
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
