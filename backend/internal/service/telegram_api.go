package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
)

type telegramUser struct {
	ID        int64  `json:"id"`
	IsBot     bool   `json:"is_bot"`
	Username  string `json:"username"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

type telegramAPIResponse struct {
	OK          bool            `json:"ok"`
	Description string          `json:"description"`
	Result      json.RawMessage `json:"result"`
}

func (s *TelegramService) doTelegramRequest(
	ctx context.Context,
	method string,
	endpoint string,
	contentType string,
	body []byte,
) (*http.Response, error) {
	reqBody := body
	if reqBody == nil {
		reqBody = []byte{}
	}
	makeRequest := func(client *http.Client) (*http.Response, error) {
		req, err := http.NewRequestWithContext(ctx, method, endpoint, bytes.NewReader(reqBody))
		if err != nil {
			return nil, err
		}
		if contentType != "" {
			req.Header.Set("Content-Type", contentType)
		}
		return client.Do(req)
	}

	client := s.client
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil || !cfg.ProxyEnabled || len(cfg.ProxyURLs) == 0 {
		return makeRequest(client)
	}

	proxies := buildProxyChain(s.localProxy, cfg.ProxyActiveURL, cfg.ProxyURLs)
	if len(proxies) == 0 {
		return makeRequest(client)
	}
	var lastErr error
	for idx, proxyURL := range proxies {
		proxyClient, err := httpClientForProxy(client, proxyURL)
		if err != nil {
			lastErr = fmt.Errorf("proxy %s: %w", maskProxyURLForError(proxyURL), err)
			if !cfg.ProxyAutoFailover {
				return nil, lastErr
			}
			continue
		}
		resp, reqErr := makeRequest(proxyClient)
		if reqErr == nil {
			return resp, nil
		}
		lastErr = fmt.Errorf("proxy %s: %w", maskProxyURLForError(proxyURL), sanitizeTelegramError(reqErr))
		if !cfg.ProxyAutoFailover || idx == len(proxies)-1 {
			return nil, lastErr
		}
	}
	if lastErr != nil {
		return nil, lastErr
	}
	return nil, errors.New("proxy request failed")
}

func (s *TelegramService) telegramAPI(ctx context.Context, token, method string, payload any) (json.RawMessage, error) {
	url := fmt.Sprintf("https://api.telegram.org/bot%s/%s", strings.TrimSpace(token), method)

	var body []byte
	var err error
	if payload != nil {
		body, err = json.Marshal(payload)
		if err != nil {
			return nil, err
		}
	} else {
		body = []byte("{}")
	}

	resp, err := s.doTelegramRequest(ctx, http.MethodPost, url, "application/json", body)
	if err != nil {
		return nil, sanitizeTelegramError(err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 8192))
	var parsed telegramAPIResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return nil, fmt.Errorf("telegram api: invalid response")
	}
	if !parsed.OK {
		if parsed.Description != "" {
			return nil, fmt.Errorf("telegram api: %s", parsed.Description)
		}
		return nil, fmt.Errorf("telegram api: request failed")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("telegram api: status %d", resp.StatusCode)
	}
	return parsed.Result, nil
}

func (s *TelegramService) telegramGetMe(ctx context.Context, token string) (*telegramUser, error) {
	raw, err := s.telegramAPI(ctx, token, "getMe", nil)
	if err != nil {
		return nil, err
	}
	var user telegramUser
	if err := json.Unmarshal(raw, &user); err != nil {
		return nil, errors.New("telegram api: invalid getMe result")
	}
	return &user, nil
}

func (s *TelegramService) telegramGetChat(ctx context.Context, token, chatID string) error {
	_, err := s.telegramAPI(ctx, token, "getChat", map[string]string{
		"chat_id": strings.TrimSpace(chatID),
	})
	return err
}

func (s *TelegramService) telegramSendMessage(ctx context.Context, token, chatID, text string) error {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}
	payload := map[string]string{
		"chat_id": strings.TrimSpace(chatID),
		"text":    text,
	}
	_, err := s.telegramAPI(ctx, token, "sendMessage", payload)
	return sanitizeTelegramError(err)
}

var telegramTokenInError = regexp.MustCompile(`bot\d+:[A-Za-z0-9_-]+`)

func sanitizeTelegramError(err error) error {
	if err == nil {
		return nil
	}
	msg := telegramTokenInError.ReplaceAllString(err.Error(), "bot***")
	return errors.New(msg)
}
