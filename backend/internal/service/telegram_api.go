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
	proxyEnabled := err == nil && cfg.ProxyEnabled && len(cfg.ProxyURLs) > 0
	var proxies []string
	if proxyEnabled {
		proxies = telegramOutboundProxies(s.localProxy, true, cfg.ProxyActiveURL, cfg.ProxyURLs)
	} else {
		proxies = telegramOutboundProxies(s.localProxy, false, "", nil)
	}
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

func (s *TelegramService) telegramSendMessageWithAckButton(ctx context.Context, token, chatID, text string) (string, error) {
	text = strings.TrimSpace(text)
	if text == "" {
		return "", nil
	}
	payload := map[string]any{
		"chat_id": strings.TrimSpace(chatID),
		"text":    text,
		"reply_markup": telegramInlineKeyboardMarkup{
			InlineKeyboard: [][]telegramInlineKeyboardButton{{
				{Text: "Просмотрено", CallbackData: telegramHealthAckCallback},
			}},
		},
	}
	raw, err := s.telegramAPI(ctx, token, "sendMessage", payload)
	if err != nil {
		return "", sanitizeTelegramError(err)
	}
	return telegramMessageID(raw)
}

func (s *TelegramService) telegramDeleteMessage(ctx context.Context, token, chatID, messageID string) error {
	messageID = strings.TrimSpace(messageID)
	if messageID == "" {
		return nil
	}
	_, err := s.telegramAPI(ctx, token, "deleteMessage", map[string]any{
		"chat_id":    strings.TrimSpace(chatID),
		"message_id": messageID,
	})
	return sanitizeTelegramError(err)
}

func (s *TelegramService) telegramAnswerCallback(ctx context.Context, token, callbackID, text string) error {
	callbackID = strings.TrimSpace(callbackID)
	if callbackID == "" {
		return nil
	}
	payload := map[string]any{"callback_query_id": callbackID}
	if strings.TrimSpace(text) != "" {
		payload["text"] = text
	}
	_, err := s.telegramAPI(ctx, token, "answerCallbackQuery", payload)
	return sanitizeTelegramError(err)
}

type adminBotChat struct {
	ID int64 `json:"id"`
}

type adminBotMessage struct {
	MessageID int64        `json:"message_id"`
	Chat      adminBotChat `json:"chat"`
	From      *telegramUser `json:"from"`
}

type adminBotCallback struct {
	ID      string           `json:"id"`
	Data    string           `json:"data"`
	Message *adminBotMessage `json:"message"`
}

type adminBotUpdate struct {
	UpdateID      int64             `json:"update_id"`
	Message       *adminBotMessage  `json:"message"`
	CallbackQuery *adminBotCallback `json:"callback_query"`
}

func (s *TelegramService) telegramGetAdminUpdates(ctx context.Context, token string, offset int64, timeoutSec int) ([]adminBotUpdate, error) {
	raw, err := s.telegramAPI(ctx, token, "getUpdates", map[string]any{
		"offset":          offset,
		"timeout":         timeoutSec,
		"limit":           50,
		"allowed_updates": []string{"callback_query", "message"},
	})
	if err != nil {
		return nil, sanitizeTelegramError(err)
	}
	var updates []adminBotUpdate
	if err := json.Unmarshal(raw, &updates); err != nil {
		return nil, errors.New("telegram api: invalid getUpdates result")
	}
	return updates, nil
}

func (s *TelegramService) telegramSendThreadHTML(ctx context.Context, token, chatID, text string, topicID int) error {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}
	payload := map[string]any{
		"chat_id":                  telegramChatIDParam(chatID),
		"text":                     text,
		"parse_mode":               "HTML",
		"disable_web_page_preview": true,
	}
	if topicID > 0 {
		payload["message_thread_id"] = topicID
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
