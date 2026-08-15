package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"
)

const DefaultYandexGPTBaseURL = "https://llm.api.cloud.yandex.net/v1"

type YandexGPTClient struct {
	baseURL  string
	apiKey   string
	folderID string
	client   *http.Client
}

type YandexGPTConnectionResult struct {
	Models []string
}

func NewYandexGPTClient(baseURL, apiKey, folderID string) *YandexGPTClient {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if baseURL == "" {
		baseURL = DefaultYandexGPTBaseURL
	}
	return &YandexGPTClient{
		baseURL:  baseURL,
		apiKey:   strings.TrimSpace(apiKey),
		folderID: strings.TrimSpace(folderID),
		client: &http.Client{
			Timeout: 90 * time.Second,
		},
	}
}

func (c *YandexGPTClient) TestConnection(ctx context.Context) (YandexGPTConnectionResult, error) {
	if c.apiKey == "" {
		return YandexGPTConnectionResult{}, fmt.Errorf("api key not configured")
	}
	if c.folderID == "" {
		return YandexGPTConnectionResult{}, fmt.Errorf("folder id not configured")
	}

	models, err := c.ListModels(ctx)
	if err != nil {
		return YandexGPTConnectionResult{}, err
	}
	return YandexGPTConnectionResult{Models: models}, nil
}

func (c *YandexGPTClient) ListModels(ctx context.Context) ([]string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/models", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("x-folder-id", c.folderID)
	req.Header.Set("x-data-logging-enabled", "false")

	res, err := c.client.Do(req)
	if err != nil {
		return KnownYandexChatModels(c.folderID), nil
	}
	defer res.Body.Close()

	raw, err := io.ReadAll(res.Body)
	if err != nil {
		return KnownYandexChatModels(c.folderID), nil
	}
	if res.StatusCode >= 400 {
		return KnownYandexChatModels(c.folderID), nil
	}

	var parsed struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return KnownYandexChatModels(c.folderID), nil
	}

	ids := make([]string, 0, len(parsed.Data))
	seen := make(map[string]struct{})
	for _, item := range parsed.Data {
		id := strings.TrimSpace(item.ID)
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		ids = append(ids, id)
	}
	return MergeYandexChatModels(ids, c.folderID), nil
}

func KnownYandexChatModelSuffixes() []string {
	return []string{
		"yandexgpt/latest",
		"yandexgpt-lite/latest",
		"yandexgpt-5/latest",
		"yandexgpt-5-lite/latest",
		"yandexgpt-5-pro/latest",
		"yandexgpt-5.1/latest",
		"yandexgpt-pro/latest",
		"yandexgpt-pro-5/latest",
		"yandexgpt-pro-5.1/latest",
		"aliceai-llm/latest",
		"qwen3-235b-a22b-fp8/latest",
		"gpt-oss-120b/latest",
		"gpt-oss-20b/latest",
	}
}

func KnownYandexChatModels(folderID string) []string {
	folderID = strings.TrimSpace(folderID)
	suffixes := KnownYandexChatModelSuffixes()
	if folderID == "" {
		return suffixes
	}
	out := make([]string, 0, len(suffixes))
	for _, suffix := range suffixes {
		out = append(out, "gpt://"+folderID+"/"+suffix)
	}
	return out
}

func IsYandexChatModel(modelID string) bool {
	return strings.HasPrefix(strings.TrimSpace(modelID), "gpt://")
}

func FilterYandexChatModels(models []string) []string {
	out := make([]string, 0, len(models))
	seen := make(map[string]struct{})
	for _, m := range models {
		m = strings.TrimSpace(m)
		if !IsYandexChatModel(m) {
			continue
		}
		if _, ok := seen[m]; ok {
			continue
		}
		seen[m] = struct{}{}
		out = append(out, m)
	}
	return out
}

func MergeYandexChatModels(apiModels []string, folderID string) []string {
	merged := FilterYandexChatModels(apiModels)
	seen := make(map[string]struct{}, len(merged))
	for _, m := range merged {
		seen[m] = struct{}{}
	}
	for _, d := range KnownYandexChatModels(folderID) {
		if _, ok := seen[d]; ok {
			continue
		}
		seen[d] = struct{}{}
		merged = append(merged, d)
	}
	sort.Strings(merged)
	return merged
}

func YandexModelURI(folderID, modelID string) string {
	modelID = strings.TrimSpace(modelID)
	if modelID == "" {
		modelID = "yandexgpt/latest"
	}
	if strings.HasPrefix(modelID, "gpt://") {
		return modelID
	}
	folderID = strings.TrimSpace(folderID)
	if folderID == "" {
		return modelID
	}
	return "gpt://" + folderID + "/" + strings.TrimPrefix(modelID, "/")
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content any    `json:"content"`
}

type ChatCompletionResult struct {
	Content          string
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int
	Model            string
}

func (c *YandexGPTClient) Chat(ctx context.Context, model string, messages []ChatMessage) (ChatCompletionResult, error) {
	if c.apiKey == "" {
		return ChatCompletionResult{}, fmt.Errorf("api key not configured")
	}
	if c.folderID == "" {
		return ChatCompletionResult{}, fmt.Errorf("folder id not configured")
	}
	model = YandexModelURI(c.folderID, model)
	if len(messages) == 0 {
		return ChatCompletionResult{}, fmt.Errorf("messages required")
	}

	body := map[string]any{
		"model":    model,
		"messages": messages,
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return ChatCompletionResult{}, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(raw))
	if err != nil {
		return ChatCompletionResult{}, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("x-folder-id", c.folderID)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-data-logging-enabled", "false")

	res, err := c.client.Do(req)
	if err != nil {
		return ChatCompletionResult{}, err
	}
	defer res.Body.Close()

	respRaw, err := io.ReadAll(res.Body)
	if err != nil {
		return ChatCompletionResult{}, err
	}
	if res.StatusCode >= 400 {
		return ChatCompletionResult{}, fmt.Errorf("yandex gpt chat failed: %s", strings.TrimSpace(string(respRaw)))
	}

	var parsed struct {
		Model   string `json:"model"`
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
			TotalTokens      int `json:"total_tokens"`
		} `json:"usage"`
	}
	if err := json.Unmarshal(respRaw, &parsed); err != nil {
		return ChatCompletionResult{}, err
	}
	if len(parsed.Choices) == 0 {
		return ChatCompletionResult{}, fmt.Errorf("empty chat response")
	}
	content := strings.TrimSpace(parsed.Choices[0].Message.Content)
	if content == "" {
		return ChatCompletionResult{}, fmt.Errorf("empty chat content")
	}
	return ChatCompletionResult{
		Content:          content,
		PromptTokens:     parsed.Usage.PromptTokens,
		CompletionTokens: parsed.Usage.CompletionTokens,
		TotalTokens:      parsed.Usage.TotalTokens,
		Model:            parsed.Model,
	}, nil
}
