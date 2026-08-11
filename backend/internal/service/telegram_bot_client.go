package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

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

func (c *TelegramBotClient) SendMessage(ctx context.Context, token, chatID, text string) error {
	_, err := c.SendFormattedMessage(ctx, token, chatID, TelegramMessageInput{Text: text})
	return sanitizeTelegramError(err)
}

type TelegramMessageInput struct {
	Text                string
	ParseMode           string
	Entities            []model.TelegramMessageEntity
	Buttons             [][]model.TelegramInlineButton
	LinkPreviewEnabled  *bool
	DisableNotification bool
}

const (
	TelegramMediaPhoto = "photo"
	TelegramMediaVideo = "video"
)

type TelegramMediaInput struct {
	Type string
	URL  string
}

type TelegramMediaSendOptions struct {
	Caption               string
	ParseMode             string
	Buttons               [][]model.TelegramInlineButton
	ShowCaptionAboveMedia bool
	DisableNotification   bool
}

type telegramSentMessage struct {
	MessageID int64 `json:"message_id"`
}

type telegramCopyTextButton struct {
	Text string `json:"text"`
}

type telegramWebAppInfo struct {
	URL string `json:"url"`
}

type telegramInlineKeyboardButton struct {
	Text              string                    `json:"text"`
	Style             model.TelegramButtonStyle `json:"style,omitempty"`
	IconCustomEmojiID string                    `json:"icon_custom_emoji_id,omitempty"`
	URL               string                    `json:"url,omitempty"`
	CallbackData      string                    `json:"callback_data,omitempty"`
	CopyText          *telegramCopyTextButton   `json:"copy_text,omitempty"`
	WebApp            *telegramWebAppInfo       `json:"web_app,omitempty"`
}

type telegramInlineKeyboardMarkup struct {
	InlineKeyboard [][]telegramInlineKeyboardButton `json:"inline_keyboard"`
}

func telegramReplyMarkup(rows [][]model.TelegramInlineButton) *telegramInlineKeyboardMarkup {
	if len(rows) == 0 {
		return nil
	}
	out := &telegramInlineKeyboardMarkup{InlineKeyboard: make([][]telegramInlineKeyboardButton, 0, len(rows))}
	for _, row := range rows {
		buttons := make([]telegramInlineKeyboardButton, 0, len(row))
		for _, button := range row {
			item := telegramInlineKeyboardButton{
				Text: button.Text, IconCustomEmojiID: button.IconCustomEmojiID,
				URL: button.URL, CallbackData: button.CallbackData,
			}
			if button.Style == model.TelegramButtonPrimary ||
				button.Style == model.TelegramButtonSuccess ||
				button.Style == model.TelegramButtonDanger {
				item.Style = button.Style
			}
			if button.CopyText != "" {
				item.CopyText = &telegramCopyTextButton{Text: button.CopyText}
			}
			if button.WebAppURL != "" {
				item.WebApp = &telegramWebAppInfo{URL: button.WebAppURL}
			}
			buttons = append(buttons, item)
		}
		out.InlineKeyboard = append(out.InlineKeyboard, buttons)
	}
	return out
}

func telegramMessageID(raw json.RawMessage) (string, error) {
	var sent telegramSentMessage
	if err := json.Unmarshal(raw, &sent); err != nil {
		return "", errors.New("telegram api: invalid message result")
	}
	if sent.MessageID == 0 {
		return "", nil
	}
	return strconv.FormatInt(sent.MessageID, 10), nil
}

func telegramMediaGroupMessageID(raw json.RawMessage) (string, error) {
	var sent []telegramSentMessage
	if err := json.Unmarshal(raw, &sent); err == nil {
		if len(sent) == 0 || sent[0].MessageID == 0 {
			return "", nil
		}
		return strconv.FormatInt(sent[0].MessageID, 10), nil
	}
	var messages []json.RawMessage
	if err := json.Unmarshal(raw, &messages); err == nil {
		if len(messages) == 0 {
			return "", nil
		}
		if id, err := telegramMessageID(messages[0]); err == nil {
			return id, nil
		}
	}
	if len(raw) > 0 && raw[0] == '{' {
		return telegramMessageID(raw)
	}
	return "", errors.New("telegram api: invalid media group result")
}

func TelegramImageMimeAllowed(mimeType string) bool {
	switch strings.ToLower(strings.TrimSpace(strings.Split(mimeType, ";")[0])) {
	case "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp":
		return true
	default:
		return false
	}
}

func (c *TelegramBotClient) SendFormattedMessage(
	ctx context.Context,
	token, chatID string,
	input TelegramMessageInput,
) (string, error) {
	if utf8.RuneCountInString(input.Text) > 4096 {
		return "", fmt.Errorf("%w: текст Telegram не должен превышать 4096 символов", ErrInvalidPost)
	}
	if err := ValidatePostContent(model.PostContent{
		Format: "message", Text: input.Text, ParseMode: input.ParseMode,
		Entities: input.Entities, Buttons: input.Buttons,
	}, model.PostSettings{}); err != nil {
		return "", err
	}
	payload := map[string]any{
		"chat_id": telegramChatIDParam(chatID),
		"text":    input.Text,
	}
	if input.ParseMode != "" {
		payload["parse_mode"] = input.ParseMode
	}
	if len(input.Entities) > 0 {
		payload["entities"] = input.Entities
	}
	if input.LinkPreviewEnabled != nil {
		payload["link_preview_options"] = map[string]bool{"is_disabled": !*input.LinkPreviewEnabled}
	}
	if input.DisableNotification {
		payload["disable_notification"] = true
	}
	if markup := telegramReplyMarkup(input.Buttons); markup != nil {
		payload["reply_markup"] = markup
	}
	raw, err := c.api(ctx, token, "sendMessage", payload)
	if err != nil {
		return "", sanitizeTelegramError(err)
	}
	return telegramMessageID(raw)
}

func validateTelegramMedia(media []TelegramMediaInput) error {
	if len(media) == 0 || len(media) > 10 {
		return fmt.Errorf("%w: Telegram принимает от 1 до 10 медиафайлов", ErrInvalidPost)
	}
	for _, item := range media {
		if item.Type != TelegramMediaPhoto && item.Type != TelegramMediaVideo {
			return fmt.Errorf("%w: неподдерживаемый тип медиа Telegram", ErrInvalidPost)
		}
		if validateHTTPURL(item.URL) != nil {
			return fmt.Errorf("%w: некорректная ссылка на медиа Telegram", ErrInvalidPost)
		}
	}
	if len(media) > 1 {
		firstType := media[0].Type
		for _, item := range media[1:] {
			if item.Type != firstType {
				return fmt.Errorf("%w: в альбоме Telegram должны быть только фото или только видео", ErrInvalidPost)
			}
		}
	}
	return nil
}

func telegramMediaGroupPayload(media []TelegramMediaInput, opts *TelegramMediaSendOptions) []map[string]any {
	items := make([]map[string]any, 0, len(media))
	showAbove := opts != nil && opts.ShowCaptionAboveMedia
	for i, item := range media {
		entry := map[string]any{"type": item.Type, "media": item.URL}
		if showAbove {
			entry["show_caption_above_media"] = true
		}
		if i == 0 && opts != nil && strings.TrimSpace(opts.Caption) != "" {
			entry["caption"] = opts.Caption
			if parseMode := strings.TrimSpace(opts.ParseMode); parseMode != "" {
				entry["parse_mode"] = parseMode
			}
		}
		items = append(items, entry)
	}
	return items
}

func (c *TelegramBotClient) SendMedia(
	ctx context.Context,
	token, chatID string,
	media []TelegramMediaInput,
	opts *TelegramMediaSendOptions,
) (string, error) {
	if err := validateTelegramMedia(media); err != nil {
		return "", err
	}
	if len(media) == 1 {
		method, field := "sendPhoto", "photo"
		if media[0].Type == TelegramMediaVideo {
			method, field = "sendVideo", "video"
		}
		payload := map[string]any{
			"chat_id": telegramChatIDParam(chatID),
			field:     media[0].URL,
		}
		if opts != nil && strings.TrimSpace(opts.Caption) != "" {
			payload["caption"] = opts.Caption
			if parseMode := strings.TrimSpace(opts.ParseMode); parseMode != "" {
				payload["parse_mode"] = parseMode
			}
			if opts.ShowCaptionAboveMedia {
				payload["show_caption_above_media"] = true
			}
		}
		if opts != nil {
			if markup := telegramReplyMarkup(opts.Buttons); markup != nil {
				payload["reply_markup"] = markup
			}
			if opts.DisableNotification {
				payload["disable_notification"] = true
			}
		}
		raw, err := c.api(ctx, token, method, payload)
		if err != nil {
			return "", sanitizeTelegramError(err)
		}
		return telegramMessageID(raw)
	}
	groupPayload := map[string]any{
		"chat_id": telegramChatIDParam(chatID),
		"media":   telegramMediaGroupPayload(media, opts),
	}
	if opts != nil && opts.DisableNotification {
		groupPayload["disable_notification"] = true
	}
	raw, err := c.api(ctx, token, "sendMediaGroup", groupPayload)
	if err != nil {
		return "", sanitizeTelegramError(err)
	}
	return telegramMediaGroupMessageID(raw)
}

func (c *TelegramBotClient) SendVideoNote(
	ctx context.Context,
	token, chatID, videoURL string,
	disableNotification bool,
) (string, error) {
	if validateHTTPURL(videoURL) != nil {
		return "", fmt.Errorf("%w: некорректная ссылка на видео Telegram", ErrInvalidPost)
	}
	payload := map[string]any{
		"chat_id":    telegramChatIDParam(chatID),
		"video_note": videoURL,
	}
	if disableNotification {
		payload["disable_notification"] = true
	}
	raw, err := c.api(ctx, token, "sendVideoNote", payload)
	if err != nil {
		return "", sanitizeTelegramError(err)
	}
	return telegramMessageID(raw)
}

func (c *TelegramBotClient) PinChatMessage(
	ctx context.Context,
	token, chatID, messageID string,
	disableNotification bool,
) error {
	msgID, err := strconv.ParseInt(strings.TrimSpace(messageID), 10, 64)
	if err != nil || msgID <= 0 {
		return fmt.Errorf("%w: некорректный идентификатор сообщения Telegram", ErrInvalidPost)
	}
	payload := map[string]any{
		"chat_id":    telegramChatIDParam(chatID),
		"message_id": msgID,
	}
	if disableNotification {
		payload["disable_notification"] = true
	}
	_, err = c.api(ctx, token, "pinChatMessage", payload)
	return sanitizeTelegramError(err)
}

func (c *TelegramBotClient) SendRichMessage(
	ctx context.Context,
	token, chatID string,
	message model.TelegramRichMessage,
	disableNotification bool,
) (string, error) {
	if err := ValidateTelegramRichMessage(message); err != nil {
		return "", err
	}
	blocks, err := telegramRichAPIBlocks(message)
	if err != nil {
		return "", err
	}
	payload := map[string]any{
		"chat_id": telegramChatIDParam(chatID),
		"rich_message": map[string]any{"blocks": blocks},
	}
	if markup := telegramReplyMarkup(message.Buttons); markup != nil {
		payload["reply_markup"] = markup
	}
	if disableNotification {
		payload["disable_notification"] = true
	}
	raw, err := c.api(ctx, token, "sendRichMessage", payload)
	if err != nil {
		return "", sanitizeTelegramError(err)
	}
	return telegramMessageID(raw)
}

func telegramRichAPIBlocks(message model.TelegramRichMessage) ([]any, error) {
	blocks := make([]model.TelegramRichBlock, 0, len(message.Blocks)+1)
	if title := strings.TrimSpace(message.Title); title != "" {
		blocks = append(blocks, model.TelegramRichBlock{Type: "heading", Text: title, Size: 1})
	}
	blocks = append(blocks, message.Blocks...)
	return convertTelegramRichBlocks(blocks)
}

func convertTelegramRichBlocks(blocks []model.TelegramRichBlock) ([]any, error) {
	out := make([]any, 0, len(blocks))
	for _, block := range blocks {
		var item map[string]any
		switch block.Type {
		case "paragraph", "footer":
			item = map[string]any{"type": block.Type, "text": block.Text}
		case "heading":
			item = map[string]any{"type": "heading", "text": block.Text, "size": block.Size}
		case "code":
			item = map[string]any{"type": "pre", "text": block.Text}
			if block.Language != "" {
				item["language"] = block.Language
			}
		case "quote":
			item = map[string]any{
				"type": "blockquote",
				"blocks": []any{map[string]any{"type": "paragraph", "text": block.Text}},
			}
			if block.Credit != "" {
				item["credit"] = block.Credit
			}
		case "divider":
			item = map[string]any{"type": "divider"}
		case "list":
			items := make([]any, 0, len(block.Items))
			for _, listItem := range block.Items {
				nested, err := convertTelegramRichBlocks(listItem.Blocks)
				if err != nil {
					return nil, err
				}
				items = append(items, map[string]any{"blocks": nested})
			}
			item = map[string]any{"type": "list", "items": items}
		case "pullquote":
			item = map[string]any{"type": "pullquote", "text": block.Text}
			if block.Credit != "" {
				item["credit"] = block.Credit
			}
		case "details":
			nested, err := convertTelegramRichBlocks(block.Blocks)
			if err != nil {
				return nil, err
			}
			item = map[string]any{
				"type": "details", "summary": block.Summary,
				"blocks": nested, "is_open": block.IsOpen,
			}
		case "table":
			rows := make([]any, 0, len(block.Rows))
			for _, row := range block.Rows {
				cells := make([]any, 0, len(row))
				for _, cell := range row {
					cells = append(cells, map[string]any{
						"text": cell.Text, "align": "left", "valign": "top",
					})
				}
				rows = append(rows, cells)
			}
			item = map[string]any{
				"type": "table", "cells": rows,
				"is_bordered": block.Bordered, "is_striped": block.Striped,
			}
		case "mathematical_expression":
			item = map[string]any{"type": "mathematical_expression", "expression": block.Expression}
		default:
			return nil, fmt.Errorf("%w: неподдерживаемый тип блока rich_message", ErrInvalidPost)
		}
		out = append(out, item)
	}
	return out, nil
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

func telegramPublicAvatarURL(chat telegramChat) string {
	username := strings.TrimPrefix(strings.TrimSpace(chat.Username), "@")
	if username == "" {
		return ""
	}
	return "https://t.me/i/userpic/320/" + url.PathEscape(username) + ".jpg"
}

func telegramChatIDParam(chatID string) any {
	chatID = strings.TrimSpace(chatID)
	if id, err := strconv.ParseInt(chatID, 10, 64); err == nil {
		return id
	}
	return chatID
}

func (c *TelegramBotClient) ChatPhotoDataURI(ctx context.Context, token, chatID string) (string, error) {
	body, contentType, err := c.FetchChatPhoto(ctx, token, chatID)
	if err != nil {
		return "", err
	}
	if len(body) == 0 {
		return "", nil
	}
	if contentType == "" {
		contentType = "image/jpeg"
	}
	return fmt.Sprintf("data:%s;base64,%s", contentType, base64.StdEncoding.EncodeToString(body)), nil
}

func (c *TelegramBotClient) GetChat(ctx context.Context, token, chatID string) (telegramChat, error) {
	raw, err := c.api(ctx, token, "getChat", map[string]any{
		"chat_id": telegramChatIDParam(chatID),
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

func (c *TelegramBotClient) GetChatPhotoFilePath(ctx context.Context, token, chatID string) (string, error) {
	chat, err := c.GetChat(ctx, token, chatID)
	if err != nil {
		return "", err
	}
	if path, err := c.chatPhotoPathFromChat(ctx, token, chat); err != nil {
		return "", err
	} else if path != "" {
		return path, nil
	}
	if chat.Username != "" && !strings.HasPrefix(strings.TrimSpace(chatID), "@") {
		byUsername, err := c.GetChat(ctx, token, "@"+chat.Username)
		if err == nil {
			return c.chatPhotoPathFromChat(ctx, token, byUsername)
		}
	}
	return "", nil
}

func (c *TelegramBotClient) chatPhotoPathFromChat(ctx context.Context, token string, chat telegramChat) (string, error) {
	fileID := chatPhotoFileID(chat)
	if fileID == "" {
		return "", nil
	}
	raw, err := c.api(ctx, token, "getFile", map[string]string{"file_id": fileID})
	if err != nil {
		return "", err
	}
	var file telegramFile
	if err := json.Unmarshal(raw, &file); err != nil {
		return "", errors.New("telegram api: invalid getFile result")
	}
	return strings.TrimSpace(file.FilePath), nil
}

func chatPhotoFileID(chat telegramChat) string {
	if chat.Photo == nil {
		return ""
	}
	fileID := strings.TrimSpace(chat.Photo.BigFileID)
	if fileID == "" {
		fileID = strings.TrimSpace(chat.Photo.SmallFileID)
	}
	return fileID
}

func (c *TelegramBotClient) FetchChatPhoto(ctx context.Context, token, chatID string) ([]byte, string, error) {
	path, err := c.GetChatPhotoFilePath(ctx, token, chatID)
	if err != nil {
		return nil, "", err
	}
	if path != "" {
		return c.fetchTelegramFile(ctx, token, path)
	}
	return nil, "", nil
}

func (c *TelegramBotClient) fetchTelegramFile(ctx context.Context, token, path string) ([]byte, string, error) {
	fileURL := fmt.Sprintf("https://api.telegram.org/file/bot%s/%s", strings.TrimSpace(token), path)
	resp, err := c.doRequest(ctx, http.MethodGet, fileURL, "", nil)
	if err != nil {
		return nil, "", sanitizeTelegramError(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil, "", fmt.Errorf("telegram file: HTTP %d", resp.StatusCode)
	}
	contentType := strings.TrimSpace(resp.Header.Get("Content-Type"))
	if contentType == "" {
		contentType = "image/jpeg"
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, "", err
	}
	return body, contentType, nil
}

func (c *TelegramBotClient) GetChatMember(ctx context.Context, token, chatID string, userID int64) (telegramChatMember, error) {
	raw, err := c.api(ctx, token, "getChatMember", map[string]any{
		"chat_id": telegramChatIDParam(chatID),
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

type telegramChatPhoto struct {
	SmallFileID string `json:"small_file_id"`
	BigFileID   string `json:"big_file_id"`
}

type telegramChat struct {
	ID       int64              `json:"id"`
	Type     string             `json:"type"`
	Title    string             `json:"title"`
	Username string             `json:"username"`
	Photo    *telegramChatPhoto `json:"photo"`
}

type telegramFile struct {
	FilePath string `json:"file_path"`
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
		fullChat, err := c.GetChat(ctx, token, chatID)
		if err == nil {
			chat = fullChat
			if title == chatID {
				if t := strings.TrimSpace(fullChat.Title); t != "" {
					title = t
				}
			}
		}
		avatarURL := telegramPublicAvatarURL(chat)
		if avatarURL == "" {
			avatarURL, _ = c.ChatPhotoDataURI(ctx, token, chatID)
		}
		result.Chats = append(result.Chats, model.TelegramDiscoveredChat{
			ChatID:    chatID,
			Title:     title,
			Type:      chat.Type,
			BotStatus: member.Status,
			CanPost:   canPost,
			AvatarURL: avatarURL,
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
