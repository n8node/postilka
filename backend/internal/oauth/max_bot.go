package oauth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const maxAPIBase = "https://platform-api2.max.ru"

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

func (c *MAXBotClient) RegisterWebhook(ctx context.Context, token, webhookURL, secret string) error {
	token = strings.TrimSpace(token)
	webhookURL = strings.TrimSpace(webhookURL)
	if token == "" || webhookURL == "" {
		return fmt.Errorf("max bot token and webhook url are required")
	}

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

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, maxAPIBase+"/subscriptions", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", token)

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
		return fmt.Errorf("max subscriptions: HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}
	return nil
}
