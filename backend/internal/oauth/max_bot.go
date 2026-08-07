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
	"strconv"
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

type MAXBotInfo struct {
	UserID   int64  `json:"user_id"`
	Username string `json:"username"`
	Name     string `json:"name"`
}

type MAXChat struct {
	ChatID int64  `json:"chat_id"`
	Type   string `json:"type"`
	Title  string `json:"title"`
	Status string `json:"status"`
	Link   string `json:"link"`
}

type MAXBotMembership struct {
	IsAdmin     bool     `json:"is_admin"`
	IsOwner     bool     `json:"is_owner"`
	Permissions []string `json:"permissions"`
}

func NormalizeMAXChatLink(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "https://max.ru/")
	raw = strings.TrimPrefix(raw, "http://max.ru/")
	raw = strings.TrimPrefix(raw, "@")
	if idx := strings.IndexAny(raw, "?/"); idx >= 0 {
		raw = raw[:idx]
	}
	return strings.Trim(raw, "/")
}

func (c *MAXBotClient) GetChat(ctx context.Context, token string, chatID int64) (*MAXChat, error) {
	endpoint := maxAPIBase + "/chats/" + strconv.FormatInt(chatID, 10)
	respBody, status, err := c.do(ctx, http.MethodGet, endpoint, token, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("max chat: HTTP %d: %s", status, strings.TrimSpace(string(respBody)))
	}
	var chat MAXChat
	if err := json.Unmarshal(respBody, &chat); err != nil {
		return nil, err
	}
	return &chat, nil
}

func (c *MAXBotClient) GetChatByLink(ctx context.Context, token, chatLink string) (*MAXChat, error) {
	chatLink = NormalizeMAXChatLink(chatLink)
	if chatLink == "" {
		return nil, fmt.Errorf("некорректная ссылка на канал MAX")
	}
	endpoint := maxAPIBase + "/chats/" + url.PathEscape(chatLink)
	respBody, status, err := c.do(ctx, http.MethodGet, endpoint, token, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("max chat by link: HTTP %d: %s", status, strings.TrimSpace(string(respBody)))
	}
	var chat MAXChat
	if err := json.Unmarshal(respBody, &chat); err != nil {
		return nil, err
	}
	if chat.ChatID == 0 {
		return nil, fmt.Errorf("канал MAX не найден по ссылке %q", chatLink)
	}
	return &chat, nil
}

func (c *MAXBotClient) GetBotMembership(ctx context.Context, token string, chatID int64) (*MAXBotMembership, error) {
	endpoint := maxAPIBase + "/chats/" + strconv.FormatInt(chatID, 10) + "/members/me"
	respBody, status, err := c.do(ctx, http.MethodGet, endpoint, token, nil)
	if err != nil {
		return nil, err
	}
	if status == http.StatusNotFound {
		return nil, fmt.Errorf("бот не добавлен в этот канал MAX")
	}
	if status >= 400 {
		return nil, fmt.Errorf("max membership: HTTP %d: %s", status, strings.TrimSpace(string(respBody)))
	}
	var member MAXBotMembership
	if err := json.Unmarshal(respBody, &member); err != nil {
		return nil, err
	}
	return &member, nil
}

func (m *MAXBotMembership) CanPostToChannel() bool {
	if m == nil {
		return false
	}
	if m.IsOwner {
		return true
	}
	if !m.IsAdmin {
		return false
	}
	for _, p := range m.Permissions {
		switch p {
		case "write", "post_edit_delete_message":
			return true
		}
	}
	return false
}

func (c *MAXBotClient) ResolveChat(ctx context.Context, token, raw string) (*MAXChat, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, fmt.Errorf("укажите chat_id или ссылку на канал MAX")
	}
	if id, err := strconv.ParseInt(raw, 10, 64); err == nil {
		return c.GetChat(ctx, token, id)
	}
	return c.GetChatByLink(ctx, token, raw)
}

func (c *MAXBotClient) VerifyChannelPostAccess(ctx context.Context, token string, chatID int64) error {
	member, err := c.GetBotMembership(ctx, token, chatID)
	if err != nil {
		return err
	}
	if !member.CanPostToChannel() {
		return fmt.Errorf(
			"у бота нет права публиковать посты в канале — назначьте его администратором с правом «Публикация» (write)",
		)
	}
	return nil
}

func (c *MAXBotClient) GetMe(ctx context.Context, token string) (*MAXBotInfo, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, fmt.Errorf("max bot: empty token")
	}
	respBody, status, err := c.do(ctx, http.MethodGet, maxAPIBase+"/me", token, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("max bot me: HTTP %d: %s", status, strings.TrimSpace(string(respBody)))
	}
	var info MAXBotInfo
	if err := json.Unmarshal(respBody, &info); err != nil {
		return nil, err
	}
	if info.UserID == 0 && info.Username == "" {
		return nil, fmt.Errorf("max bot: invalid token")
	}
	return &info, nil
}

type maxMessageLinkRequest struct {
	Text        string           `json:"text"`
	Attachments []maxMessageAttachment `json:"attachments,omitempty"`
}

type maxMessageAttachment struct {
	Type    string              `json:"type"`
	Payload maxInlineKeyboard   `json:"payload"`
}

type maxInlineKeyboard struct {
	Buttons [][]maxInlineButton `json:"buttons"`
}

type maxInlineButton struct {
	Type string `json:"type"`
	Text string `json:"text"`
	URL  string `json:"url"`
}

func (c *MAXBotClient) SendText(ctx context.Context, botToken, chatID, text string) error {
	botToken = strings.TrimSpace(botToken)
	chatID = strings.TrimSpace(chatID)
	if botToken == "" {
		return fmt.Errorf("max message: empty bot token")
	}
	if chatID == "" {
		return fmt.Errorf("max message: empty chat_id")
	}

	chat, err := c.ResolveChat(ctx, botToken, chatID)
	if err != nil {
		return err
	}
	if err := c.VerifyChannelPostAccess(ctx, botToken, chat.ChatID); err != nil {
		return err
	}

	body := maxMessageLinkRequest{Text: text}
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}

	endpoint := maxAPIBase + "/messages?" + url.Values{
		"chat_id": {strconv.FormatInt(chat.ChatID, 10)},
	}.Encode()
	respBody, status, err := c.do(ctx, http.MethodPost, endpoint, botToken, payload)
	if err != nil {
		return err
	}
	if status >= 400 {
		msg := strings.TrimSpace(string(respBody))
		if strings.Contains(msg, "proto.payload") {
			return fmt.Errorf(
				"некорректный chat_id канала MAX — укажите числовой ID или ссылку вида channel_name, не полный URL в поле ID",
			)
		}
		return fmt.Errorf("max messages: HTTP %d: %s", status, msg)
	}
	return nil
}

func (c *MAXBotClient) SendMessageLink(
	ctx context.Context,
	botToken, userID, chatID, text, buttonText, linkURL string,
) error {
	botToken = strings.TrimSpace(botToken)
	if botToken == "" {
		return fmt.Errorf("max message: empty bot token")
	}
	q := url.Values{}
	if strings.TrimSpace(userID) != "" {
		q.Set("user_id", strings.TrimSpace(userID))
	} else if strings.TrimSpace(chatID) != "" {
		q.Set("chat_id", strings.TrimSpace(chatID))
	} else {
		return fmt.Errorf("max message: missing user_id and chat_id")
	}

	body := maxMessageLinkRequest{
		Text: text,
		Attachments: []maxMessageAttachment{
			{
				Type: "inline_keyboard",
				Payload: maxInlineKeyboard{
					Buttons: [][]maxInlineButton{
						{{Type: "link", Text: buttonText, URL: linkURL}},
					},
				},
			},
		},
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}

	endpoint := maxAPIBase + "/messages?" + q.Encode()
	respBody, status, err := c.do(ctx, http.MethodPost, endpoint, botToken, payload)
	if err != nil {
		return err
	}
	if status >= 400 {
		return fmt.Errorf("max messages: HTTP %d: %s", status, strings.TrimSpace(string(respBody)))
	}
	return nil
}
