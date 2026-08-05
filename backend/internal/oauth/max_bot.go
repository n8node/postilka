package oauth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
)

const maxAPIBase = "https://platform-api2.max.ru"

var maxWebhookSecretPattern = regexp.MustCompile(`^[a-zA-Z0-9_-]{5,256}$`)

type MAXBotClient struct {
	HTTP *http.Client
}

func NewMAXBotClient() *MAXBotClient {
	return &MAXBotClient{HTTP: DefaultVKHTTPClient()}
}

func (c *MAXBotClient) http() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return DefaultVKHTTPClient()
}

type maxWebhookRegisterRequest struct {
	URL         string   `json:"url"`
	UpdateTypes []string `json:"update_types"`
	Secret      string   `json:"secret,omitempty"`
}

type maxSubscription struct {
	URL string `json:"url"`
}

type maxSubscriptionsResponse struct {
	Subscriptions []maxSubscription `json:"subscriptions"`
}

func ValidateMAXWebhookSecret(secret string) error {
	secret = strings.TrimSpace(secret)
	if secret == "" {
		return nil
	}
	if !maxWebhookSecretPattern.MatchString(secret) {
		return fmt.Errorf("webhook secret: только A-Z, a-z, 0-9, _ и -, от 5 до 256 символов")
	}
	return nil
}

func NormalizeMAXBotUsername(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "@")
	raw = strings.TrimPrefix(raw, "https://max.ru/")
	raw = strings.TrimPrefix(raw, "http://max.ru/")
	if idx := strings.IndexAny(raw, "?/"); idx >= 0 {
		raw = raw[:idx]
	}
	return strings.Trim(raw, "/")
}

func (c *MAXBotClient) ReplaceWebhook(ctx context.Context, token, webhookURL, secret string) error {
	token = strings.TrimSpace(token)
	webhookURL = strings.TrimSpace(webhookURL)
	if token == "" || webhookURL == "" {
		return fmt.Errorf("max bot token and webhook url are required")
	}
	if err := ValidateMAXWebhookSecret(secret); err != nil {
		return err
	}

	subs, err := c.ListSubscriptions(ctx, token)
	if err == nil {
		for _, sub := range subs {
			if strings.TrimSpace(sub.URL) == "" {
				continue
			}
			_ = c.DeleteSubscription(ctx, token, sub.URL)
		}
	}

	return c.RegisterWebhook(ctx, token, webhookURL, secret)
}

func (c *MAXBotClient) ListSubscriptions(ctx context.Context, token string) ([]maxSubscription, error) {
	respBody, status, err := c.do(ctx, http.MethodGet, maxAPIBase+"/subscriptions", token, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("max subscriptions list: HTTP %d: %s", status, strings.TrimSpace(string(respBody)))
	}
	var parsed maxSubscriptionsResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, err
	}
	return parsed.Subscriptions, nil
}

func (c *MAXBotClient) DeleteSubscription(ctx context.Context, token, webhookURL string) error {
	webhookURL = strings.TrimSpace(webhookURL)
	if webhookURL == "" {
		return nil
	}
	endpoint := maxAPIBase + "/subscriptions?url=" + url.QueryEscape(webhookURL)
	respBody, status, err := c.do(ctx, http.MethodDelete, endpoint, token, nil)
	if err != nil {
		return err
	}
	if status >= 400 {
		return fmt.Errorf("max subscriptions delete: HTTP %d: %s", status, strings.TrimSpace(string(respBody)))
	}
	return nil
}

func (c *MAXBotClient) RegisterWebhook(ctx context.Context, token, webhookURL, secret string) error {
	body := maxWebhookRegisterRequest{
		URL:         webhookURL,
		UpdateTypes: []string{"bot_started"},
	}
	if strings.TrimSpace(secret) != "" {
		body.Secret = strings.TrimSpace(secret)
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}

	respBody, status, err := c.do(ctx, http.MethodPost, maxAPIBase+"/subscriptions", token, payload)
	if err != nil {
		if IsNetworkError(err) {
			return fmt.Errorf("не удалось связаться с platform-api2.max.ru: %w", err)
		}
		return err
	}
	if status >= 400 {
		return fmt.Errorf("max subscriptions: HTTP %d: %s", status, strings.TrimSpace(string(respBody)))
	}
	return nil
}

func (c *MAXBotClient) do(ctx context.Context, method, endpoint, token string, body []byte) ([]byte, int, error) {
	var reader io.Reader
	if len(body) > 0 {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, endpoint, reader)
	if err != nil {
		return nil, 0, err
	}
	if len(body) > 0 {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Authorization", strings.TrimSpace(token))

	resp, err := c.http().Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, resp.StatusCode, err
	}
	return respBody, resp.StatusCode, nil
}
