package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
)

type TelegramBotClient struct {
	providerSettings *TelegramProviderSettingsService
	localProxy       string
	client           *http.Client
}

func NewTelegramBotClient(providerSettings *TelegramProviderSettingsService, localProxy string) *TelegramBotClient {
	return &TelegramBotClient{
		providerSettings: providerSettings,
		localProxy:       strings.TrimSpace(localProxy),
		client: &http.Client{
			Timeout:   60 * time.Second,
			Transport: directHTTPTransport(),
		},
	}
}

func (c *TelegramBotClient) api(ctx context.Context, token, method string, payload any) (json.RawMessage, error) {
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

	resp, err := c.doRequest(ctx, http.MethodPost, url, "application/json", body)
	if err != nil {
		return nil, sanitizeTelegramError(err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
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
	return parsed.Result, nil
}

func (c *TelegramBotClient) doRequest(
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

	cfg, err := c.providerSettings.GetEffective(ctx)
	if err != nil || !cfg.ProxyEnabled || len(cfg.ProxyURLs) == 0 {
		return makeRequest(c.client)
	}

	var proxies []string
	if hop := strings.TrimSpace(c.localProxy); hop != "" {
		proxies = []string{hop}
	} else {
		proxies = proxyOrder(cfg.ProxyActiveURL, normalizeProxyURLs(cfg.ProxyURLs))
	}
	var lastErr error
	for idx, proxyURL := range proxies {
		proxyClient, err := httpClientForProxy(c.client, proxyURL)
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

func (c *TelegramBotClient) GetMe(ctx context.Context, token string) (*telegramUser, error) {
	raw, err := c.api(ctx, token, "getMe", nil)
	if err != nil {
		return nil, err
	}
	var user telegramUser
	if err := json.Unmarshal(raw, &user); err != nil {
		return nil, errors.New("telegram api: invalid getMe result")
	}
	return &user, nil
}

func (c *TelegramBotClient) DeleteWebhook(ctx context.Context, token string) error {
	_, err := c.api(ctx, token, "deleteWebhook", map[string]bool{
		"drop_pending_updates": false,
	})
	return sanitizeTelegramError(err)
}

func (c *TelegramBotClient) GetChat(ctx context.Context, token, chatID string) (telegramChat, error) {
	raw, err := c.api(ctx, token, "getChat", map[string]string{
		"chat_id": strings.TrimSpace(chatID),
	})
	if err != nil {
		return telegramChat{}, err
	}
	var chat telegramChat
	if err := json.Unmarshal(raw, &chat); err != nil {
		return telegramChat{}, errors.New("telegram api: invalid getChat result")
	}
	return chat, nil
}

func (c *TelegramBotClient) GetChatMember(ctx context.Context, token, chatID string, userID int64) (telegramChatMember, error) {
	raw, err := c.api(ctx, token, "getChatMember", map[string]any{
		"chat_id": strings.TrimSpace(chatID),
		"user_id": userID,
	})
	if err != nil {
		return telegramChatMember{}, err
	}
	var member telegramChatMember
	if err := json.Unmarshal(raw, &member); err != nil {
		return telegramChatMember{}, errors.New("telegram api: invalid getChatMember result")
	}
	return member, nil
}

type telegramChat struct {
	ID       int64  `json:"id"`
	Type     string `json:"type"`
	Title    string `json:"title"`
	Username string `json:"username"`
}

type telegramChatMember struct {
	Status string `json:"status"`
	User   struct {
		ID       int64  `json:"id"`
		IsBot    bool   `json:"is_bot"`
		Username string `json:"username"`
	} `json:"user"`
	CanPostMessages   bool `json:"can_post_messages"`
	CanSendMessages   bool `json:"can_send_messages"`
	IsAnonymous       bool `json:"is_anonymous"`
}

type telegramUpdate struct {
	UpdateID      int64                    `json:"update_id"`
	Message       *telegramMessageUpdate   `json:"message"`
	ChannelPost   *telegramMessageUpdate   `json:"channel_post"`
	MyChatMember  *telegramChatMemberEvent `json:"my_chat_member"`
}

type telegramMessageUpdate struct {
	Chat telegramChat `json:"chat"`
}

type telegramChatMemberEvent struct {
	Chat          telegramChat       `json:"chat"`
	NewChatMember telegramChatMember `json:"new_chat_member"`
}

func (c *TelegramBotClient) DiscoverAdminChats(ctx context.Context, token string) (*model.TelegramDiscoverResult, error) {
	bot, err := c.GetMe(ctx, token)
	if err != nil {
		return nil, err
	}
	_ = c.DeleteWebhook(ctx, token)

	raw, err := c.api(ctx, token, "getUpdates", map[string]any{
		"limit":           100,
		"timeout":         0,
		"allowed_updates": []string{"my_chat_member", "message", "channel_post", "edited_channel_post"},
	})
	if err != nil {
		return nil, err
	}

	var updates []telegramUpdate
	if err := json.Unmarshal(raw, &updates); err != nil {
		return nil, fmt.Errorf("telegram api: invalid getUpdates result")
	}

	candidates := map[string]telegramChat{}
	for _, upd := range updates {
		if upd.MyChatMember != nil {
			m := upd.MyChatMember
			if m.NewChatMember.User.ID == bot.ID && isAdminLikeStatus(m.NewChatMember.Status) {
				candidates[chatKey(m.Chat)] = m.Chat
			}
		}
		if upd.Message != nil && isGroupLike(upd.Message.Chat.Type) {
			candidates[chatKey(upd.Message.Chat)] = upd.Message.Chat
		}
		if upd.ChannelPost != nil {
			candidates[chatKey(upd.ChannelPost.Chat)] = upd.ChannelPost.Chat
		}
	}

	result := &model.TelegramDiscoverResult{
		Bot: model.TelegramDiscoverBot{
			ID:       bot.ID,
			Username: bot.Username,
		},
		Chats: []model.TelegramDiscoveredChat{},
	}

	for _, chat := range candidates {
		if chat.Type == "private" {
			continue
		}
		chatID := formatChatID(chat.ID)
		member, err := c.GetChatMember(ctx, token, chatID, bot.ID)
		if err != nil {
			continue
		}
		if !isAdminLikeStatus(member.Status) {
			continue
		}
		canPost := canPostInChat(chat.Type, member)
		title := strings.TrimSpace(chat.Title)
		if title == "" && chat.Username != "" {
			title = "@" + chat.Username
		}
		if title == "" {
			title = chatID
		}
		result.Chats = append(result.Chats, model.TelegramDiscoveredChat{
			ChatID:    chatID,
			Title:     title,
			Type:      chat.Type,
			BotStatus: member.Status,
			CanPost:   canPost,
		})
	}

	if len(result.Chats) == 0 {
		result.Hint = "Список пуст. Добавьте бота администратором в канал или группу с правом публикации, затем нажмите «Обновить»."
	}

	return result, nil
}

func (c *TelegramBotClient) VerifyBotInChat(ctx context.Context, token, chatID string) (telegramChat, telegramChatMember, error) {
	bot, err := c.GetMe(ctx, token)
	if err != nil {
		return telegramChat{}, telegramChatMember{}, err
	}
	chat, err := c.GetChat(ctx, token, chatID)
	if err != nil {
		return telegramChat{}, telegramChatMember{}, err
	}
	member, err := c.GetChatMember(ctx, token, chatID, bot.ID)
	if err != nil {
		return telegramChat{}, telegramChatMember{}, err
	}
	if !isAdminLikeStatus(member.Status) {
		return telegramChat{}, telegramChatMember{}, fmt.Errorf("бот не является администратором этого чата")
	}
	if !canPostInChat(chat.Type, member) {
		if member.IsAnonymous {
			return telegramChat{}, telegramChatMember{}, fmt.Errorf(
				"бот назначен анонимным администратором — отключите «Оставаться анонимным» в правах бота",
			)
		}
		return telegramChat{}, telegramChatMember{}, fmt.Errorf("у бота нет права публиковать сообщения")
	}
	return chat, member, nil
}

func chatKey(chat telegramChat) string {
	return fmt.Sprintf("%d", chat.ID)
}

func formatChatID(id int64) string {
	return fmt.Sprintf("%d", id)
}

func isGroupLike(chatType string) bool {
	switch chatType {
	case "group", "supergroup", "channel":
		return true
	default:
		return false
	}
}

func isAdminLikeStatus(status string) bool {
	switch status {
	case "administrator", "creator":
		return true
	default:
		return false
	}
}

func canPostInChat(chatType string, member telegramChatMember) bool {
	switch chatType {
	case "channel":
		return member.CanPostMessages
	case "group", "supergroup":
		// ChatMemberAdministrator in groups/supergroups does not include can_send_messages
		// (that field is for ChatMemberRestricted only). Admin/creator may post unless anonymous.
		if member.Status == "creator" {
			return true
		}
		if member.Status == "administrator" {
			return !member.IsAnonymous
		}
		return member.CanSendMessages
	default:
		return false
	}
}
