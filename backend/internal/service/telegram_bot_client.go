package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/postilka/postilka/internal/model"
)

const maxTelegramVideoNoteBytes = 50 << 20

const telegramProxyHopTimeout = 22 * time.Second

func isProxyRetryableError(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
		return true
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "deadline exceeded") ||
		strings.Contains(msg, "timeout") ||
		strings.Contains(msg, "503") ||
		strings.Contains(msg, "connection refused") ||
		strings.Contains(msg, "connection reset") ||
		strings.Contains(msg, "no such host") ||
		strings.Contains(msg, "i/o timeout")
}

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

func (c *TelegramBotClient) apiMultipart(
	ctx context.Context,
	token, method string,
	fields map[string]string,
	fileField, filename string,
	fileData []byte,
) (json.RawMessage, error) {
	endpoint := fmt.Sprintf("https://api.telegram.org/bot%s/%s", strings.TrimSpace(token), method)

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			return nil, err
		}
	}
	fileHeader := make(textproto.MIMEHeader)
	fileHeader.Set("Content-Disposition", fmt.Sprintf(`form-data; name="%s"; filename="%s"`, fileField, filename))
	fileHeader.Set("Content-Type", "video/mp4")
	part, err := writer.CreatePart(fileHeader)
	if err != nil {
		return nil, err
	}
	if _, err := part.Write(fileData); err != nil {
		return nil, err
	}
	contentType := writer.FormDataContentType()
	if err := writer.Close(); err != nil {
		return nil, err
	}

	uploadClient := &http.Client{
		Timeout:   5 * time.Minute,
		Transport: c.client.Transport,
	}
	resp, err := c.doRequestWithClient(ctx, uploadClient, http.MethodPost, endpoint, contentType, buf.Bytes())
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

func telegramVideoNoteFilename(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return "video.mp4"
	}
	if !strings.Contains(name, ".") {
		return name + ".mp4"
	}
	return name
}

func (c *TelegramBotClient) doRequest(
	ctx context.Context,
	method string,
	endpoint string,
	contentType string,
	body []byte,
) (*http.Response, error) {
	return c.doRequestWithClient(ctx, c.client, method, endpoint, contentType, body)
}

func (c *TelegramBotClient) doRequestWithClient(
	ctx context.Context,
	client *http.Client,
	method string,
	endpoint string,
	contentType string,
	body []byte,
) (*http.Response, error) {
	reqBody := body
	if reqBody == nil {
		reqBody = []byte{}
	}
	makeRequest := func(reqCtx context.Context, client *http.Client) (*http.Response, error) {
		req, err := http.NewRequestWithContext(reqCtx, method, endpoint, bytes.NewReader(reqBody))
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
		return makeRequest(ctx, client)
	}

	var proxies []string
	proxies = buildProxyChain(c.localProxy, cfg.ProxyActiveURL, cfg.ProxyURLs)
	if len(proxies) == 0 {
		return makeRequest(ctx, client)
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
		hopTimeout := telegramProxyHopTimeout
		if len(proxies) == 1 {
			hopTimeout = 45 * time.Second
		}
		hopCtx, cancel := context.WithTimeout(ctx, hopTimeout)
		resp, reqErr := makeRequest(hopCtx, proxyClient)
		cancel()
		if reqErr == nil {
			return resp, nil
		}
		lastErr = fmt.Errorf("proxy %s: %w", maskProxyURLForError(proxyURL), sanitizeTelegramError(reqErr))
		if !cfg.ProxyAutoFailover || idx == len(proxies)-1 || !isProxyRetryableError(reqErr) {
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
	Type        string
	URL         string
	Data        []byte
	Filename    string
	ContentType string
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

func telegramMediaGroupMessageIDs(raw json.RawMessage) ([]string, error) {
	var sent []telegramSentMessage
	if err := json.Unmarshal(raw, &sent); err == nil {
		if len(sent) == 0 {
			return nil, nil
		}
		ids := make([]string, 0, len(sent))
		for _, msg := range sent {
			if msg.MessageID != 0 {
				ids = append(ids, strconv.FormatInt(msg.MessageID, 10))
			}
		}
		if len(ids) > 0 {
			return ids, nil
		}
		return nil, nil
	}
	var messages []json.RawMessage
	if err := json.Unmarshal(raw, &messages); err == nil && len(messages) > 0 {
		ids := make([]string, 0, len(messages))
		for _, message := range messages {
			id, err := telegramMessageID(message)
			if err != nil {
				return nil, err
			}
			if id != "" {
				ids = append(ids, id)
			}
		}
		if len(ids) > 0 {
			return ids, nil
		}
	}
	if len(raw) > 0 && raw[0] == '{' {
		id, err := telegramMessageID(raw)
		if err != nil {
			return nil, err
		}
		if id == "" {
			return nil, nil
		}
		return []string{id}, nil
	}
	return nil, errors.New("telegram api: invalid media group result")
}

func telegramMediaGroupMessageID(raw json.RawMessage) (string, error) {
	ids, err := telegramMediaGroupMessageIDs(raw)
	if err != nil {
		return "", err
	}
	if len(ids) == 0 {
		return "", nil
	}
	return ids[0], nil
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
	text := input.Text
	if strings.ToUpper(strings.TrimSpace(input.ParseMode)) == "HTML" {
		text = normalizeTelegramHTML(text)
	}
	payload := map[string]any{
		"chat_id": telegramChatIDParam(chatID),
		"text":    text,
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

func validateTelegramMediaItem(item TelegramMediaInput) error {
	if item.Type != TelegramMediaPhoto && item.Type != TelegramMediaVideo {
		return fmt.Errorf("%w: неподдерживаемый тип медиа Telegram", ErrInvalidPost)
	}
	if len(item.Data) == 0 && validateHTTPURL(item.URL) != nil {
		return fmt.Errorf("%w: некорректная ссылка на медиа Telegram", ErrInvalidPost)
	}
	if len(item.Data) == 0 && strings.TrimSpace(item.URL) == "" {
		return fmt.Errorf("%w: медиафайл Telegram пуст", ErrInvalidPost)
	}
	return nil
}

func validateTelegramMediaBatch(media []TelegramMediaInput) error {
	if len(media) == 0 || len(media) > 10 {
		return fmt.Errorf("%w: Telegram принимает от 1 до 10 медиафайлов", ErrInvalidPost)
	}
	for _, item := range media {
		if err := validateTelegramMediaItem(item); err != nil {
			return err
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

func splitTelegramMediaBatches(media []TelegramMediaInput) [][]TelegramMediaInput {
	var photos, videos []TelegramMediaInput
	for _, item := range media {
		if item.Type == TelegramMediaVideo {
			videos = append(videos, item)
		} else {
			photos = append(photos, item)
		}
	}
	var batches [][]TelegramMediaInput
	for _, group := range [][]TelegramMediaInput{photos, videos} {
		for i := 0; i < len(group); i += 10 {
			end := i + 10
			if end > len(group) {
				end = len(group)
			}
			batches = append(batches, group[i:end])
		}
	}
	return batches
}

func telegramMediaAttachRef(item TelegramMediaInput, index int) string {
	if len(item.Data) > 0 {
		return fmt.Sprintf("attach://file%d", index)
	}
	return item.URL
}

func telegramMediaUsesUpload(media []TelegramMediaInput) bool {
	for _, item := range media {
		if len(item.Data) > 0 {
			return true
		}
	}
	return false
}

func telegramMediaCaption(text, parseMode string) string {
	if strings.ToUpper(strings.TrimSpace(parseMode)) == "HTML" {
		return normalizeTelegramHTML(text)
	}
	return text
}

func telegramMediaGroupPayload(media []TelegramMediaInput, opts *TelegramMediaSendOptions) []map[string]any {
	items := make([]map[string]any, 0, len(media))
	showAbove := opts != nil && opts.ShowCaptionAboveMedia
	for i, item := range media {
		entry := map[string]any{"type": item.Type, "media": telegramMediaAttachRef(item, i)}
		if showAbove {
			entry["show_caption_above_media"] = true
		}
		if i == 0 && opts != nil && strings.TrimSpace(opts.Caption) != "" {
			entry["caption"] = telegramMediaCaption(opts.Caption, opts.ParseMode)
			if parseMode := strings.TrimSpace(opts.ParseMode); parseMode != "" {
				entry["parse_mode"] = parseMode
			}
		}
		items = append(items, entry)
	}
	return items
}

func (c *TelegramBotClient) DeleteMessage(ctx context.Context, token, chatID, messageID string) error {
	messageID = strings.TrimSpace(messageID)
	if messageID == "" {
		return nil
	}
	_, err := c.api(ctx, token, "deleteMessage", map[string]any{
		"chat_id":    telegramChatIDParam(chatID),
		"message_id": messageID,
	})
	return sanitizeTelegramError(err)
}

func (c *TelegramBotClient) DeleteMessages(ctx context.Context, token, chatID string, messageIDs []string) {
	for _, messageID := range messageIDs {
		if err := c.DeleteMessage(ctx, token, chatID, messageID); err != nil {
			slog.Warn(
				"telegram publish: rollback delete message failed",
				"chat_id", chatID,
				"message_id", messageID,
				"error", err,
			)
		}
	}
}

func (c *TelegramBotClient) SendMedia(
	ctx context.Context,
	token, chatID string,
	media []TelegramMediaInput,
	opts *TelegramMediaSendOptions,
) (string, []string, error) {
	if len(media) == 0 {
		return "", nil, fmt.Errorf("%w: Telegram принимает от 1 до 10 медиафайлов", ErrInvalidPost)
	}
	for _, item := range media {
		if err := validateTelegramMediaItem(item); err != nil {
			return "", nil, err
		}
	}
	batches := splitTelegramMediaBatches(media)
	var msgID string
	var allIDs []string
	for i, batch := range batches {
		batchOpts := opts
		if i > 0 && opts != nil {
			batchOpts = &TelegramMediaSendOptions{
				DisableNotification: opts.DisableNotification,
			}
		}
		id, ids, err := c.sendMediaBatch(ctx, token, chatID, batch, batchOpts)
		if err != nil {
			return "", allIDs, err
		}
		allIDs = append(allIDs, ids...)
		if msgID == "" {
			msgID = id
		}
	}
	return msgID, allIDs, nil
}

func (c *TelegramBotClient) sendMediaBatch(
	ctx context.Context,
	token, chatID string,
	media []TelegramMediaInput,
	opts *TelegramMediaSendOptions,
) (string, []string, error) {
	if err := validateTelegramMediaBatch(media); err != nil {
		return "", nil, err
	}
	upload := telegramMediaUsesUpload(media)
	if len(media) == 1 {
		var raw json.RawMessage
		var err error
		if upload {
			raw, err = c.sendSingleTelegramMediaUploadRaw(ctx, token, chatID, media[0], opts)
		} else {
			raw, err = c.sendSingleTelegramMediaURLRaw(ctx, token, chatID, media[0], opts)
		}
		if err != nil {
			return "", nil, sanitizeTelegramError(err)
		}
		id, err := telegramMessageID(raw)
		if err != nil {
			return "", nil, err
		}
		if id == "" {
			return "", nil, nil
		}
		return id, []string{id}, nil
	}
	var raw json.RawMessage
	var err error
	if upload {
		raw, err = c.sendTelegramMediaGroupUploadRaw(ctx, token, chatID, media, opts)
	} else {
		raw, err = c.sendTelegramMediaGroupURLRaw(ctx, token, chatID, media, opts)
	}
	if err != nil {
		return "", nil, sanitizeTelegramError(err)
	}
	ids, err := telegramMediaGroupMessageIDs(raw)
	if err != nil {
		return "", nil, err
	}
	if len(ids) == 0 {
		return "", nil, nil
	}
	return ids[0], ids, nil
}

func (c *TelegramBotClient) sendSingleTelegramMediaUploadRaw(
	ctx context.Context,
	token, chatID string,
	item TelegramMediaInput,
	opts *TelegramMediaSendOptions,
) (json.RawMessage, error) {
	method, field := "sendPhoto", "photo"
	if item.Type == TelegramMediaVideo {
		method, field = "sendVideo", "video"
	}
	fields := map[string]string{
		"chat_id": fmt.Sprint(telegramChatIDParam(chatID)),
	}
	if opts != nil && strings.TrimSpace(opts.Caption) != "" {
		fields["caption"] = telegramMediaCaption(opts.Caption, opts.ParseMode)
		if parseMode := strings.TrimSpace(opts.ParseMode); parseMode != "" {
			fields["parse_mode"] = parseMode
		}
		if opts.ShowCaptionAboveMedia {
			fields["show_caption_above_media"] = "true"
		}
	}
	if opts != nil && opts.DisableNotification {
		fields["disable_notification"] = "true"
	}
	if opts != nil {
		if markup := telegramReplyMarkup(opts.Buttons); markup != nil {
			markupJSON, err := json.Marshal(markup)
			if err != nil {
				return nil, err
			}
			fields["reply_markup"] = string(markupJSON)
		}
	}
	raw, err := c.apiMultipartTyped(
		ctx,
		token,
		method,
		fields,
		field,
		item.Filename,
		item.Data,
		item.ContentType,
	)
	if err != nil {
		return nil, err
	}
	return raw, nil
}

func (c *TelegramBotClient) sendSingleTelegramMediaURLRaw(
	ctx context.Context,
	token, chatID string,
	item TelegramMediaInput,
	opts *TelegramMediaSendOptions,
) (json.RawMessage, error) {
	method, field := "sendPhoto", "photo"
	if item.Type == TelegramMediaVideo {
		method, field = "sendVideo", "video"
	}
	payload := map[string]any{
		"chat_id": telegramChatIDParam(chatID),
		field:     item.URL,
	}
	if opts != nil && strings.TrimSpace(opts.Caption) != "" {
		payload["caption"] = telegramMediaCaption(opts.Caption, opts.ParseMode)
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
	return c.api(ctx, token, method, payload)
}

func (c *TelegramBotClient) sendTelegramMediaGroupUploadRaw(
	ctx context.Context,
	token, chatID string,
	media []TelegramMediaInput,
	opts *TelegramMediaSendOptions,
) (json.RawMessage, error) {
	items := telegramMediaGroupPayload(media, opts)
	mediaJSON, err := json.Marshal(items)
	if err != nil {
		return nil, err
	}
	fields := map[string]string{
		"chat_id": fmt.Sprint(telegramChatIDParam(chatID)),
		"media":   string(mediaJSON),
	}
	if opts != nil && opts.DisableNotification {
		fields["disable_notification"] = "true"
	}
	files := make([]telegramMultipartFile, 0, len(media))
	for i, item := range media {
		if len(item.Data) == 0 {
			continue
		}
		files = append(files, telegramMultipartFile{
			FieldName:   fmt.Sprintf("file%d", i),
			Filename:    item.Filename,
			ContentType: item.ContentType,
			Data:        item.Data,
		})
	}
	return c.apiMultipartForm(ctx, token, "sendMediaGroup", fields, files)
}

func (c *TelegramBotClient) sendTelegramMediaGroupURLRaw(
	ctx context.Context,
	token, chatID string,
	media []TelegramMediaInput,
	opts *TelegramMediaSendOptions,
) (json.RawMessage, error) {
	groupPayload := map[string]any{
		"chat_id": telegramChatIDParam(chatID),
		"media":   telegramMediaGroupPayload(media, opts),
	}
	if opts != nil && opts.DisableNotification {
		groupPayload["disable_notification"] = true
	}
	return c.api(ctx, token, "sendMediaGroup", groupPayload)
}

func (c *TelegramBotClient) sendSingleTelegramMediaUpload(
	ctx context.Context,
	token, chatID string,
	item TelegramMediaInput,
	opts *TelegramMediaSendOptions,
) (string, error) {
	raw, err := c.sendSingleTelegramMediaUploadRaw(ctx, token, chatID, item, opts)
	if err != nil {
		return "", sanitizeTelegramError(err)
	}
	return telegramMessageID(raw)
}

func (c *TelegramBotClient) sendTelegramMediaGroupUpload(
	ctx context.Context,
	token, chatID string,
	media []TelegramMediaInput,
	opts *TelegramMediaSendOptions,
) (string, error) {
	raw, err := c.sendTelegramMediaGroupUploadRaw(ctx, token, chatID, media, opts)
	if err != nil {
		return "", sanitizeTelegramError(err)
	}
	return telegramMediaGroupMessageID(raw)
}

type telegramMultipartFile struct {
	FieldName   string
	Filename    string
	ContentType string
	Data        []byte
}

func (c *TelegramBotClient) apiMultipartForm(
	ctx context.Context,
	token, method string,
	fields map[string]string,
	files []telegramMultipartFile,
) (json.RawMessage, error) {
	endpoint := fmt.Sprintf("https://api.telegram.org/bot%s/%s", strings.TrimSpace(token), method)
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			return nil, err
		}
	}
	for _, file := range files {
		contentType := strings.TrimSpace(file.ContentType)
		if contentType == "" {
			contentType = "application/octet-stream"
		}
		fileHeader := make(textproto.MIMEHeader)
		fileHeader.Set(
			"Content-Disposition",
			fmt.Sprintf(`form-data; name="%s"; filename="%s"`, file.FieldName, file.Filename),
		)
		fileHeader.Set("Content-Type", contentType)
		part, err := writer.CreatePart(fileHeader)
		if err != nil {
			return nil, err
		}
		if _, err := part.Write(file.Data); err != nil {
			return nil, err
		}
	}
	contentType := writer.FormDataContentType()
	if err := writer.Close(); err != nil {
		return nil, err
	}
	uploadClient := &http.Client{Timeout: 5 * time.Minute, Transport: c.client.Transport}
	resp, err := c.doRequestWithClient(ctx, uploadClient, http.MethodPost, endpoint, contentType, buf.Bytes())
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

func (c *TelegramBotClient) SendVideoNote(
	ctx context.Context,
	token, chatID, filename string,
	videoData []byte,
	disableNotification bool,
) (string, error) {
	if len(videoData) == 0 {
		return "", fmt.Errorf("%w: пустой видеофайл для кружка Telegram", ErrInvalidPost)
	}
	if len(videoData) > maxTelegramVideoNoteBytes {
		return "", fmt.Errorf(
			"%w: видео для кружка Telegram не должно превышать %d МБ",
			ErrInvalidPost,
			maxTelegramVideoNoteBytes>>20,
		)
	}
	fields := map[string]string{
		"chat_id": fmt.Sprint(telegramChatIDParam(chatID)),
		"length":  strconv.Itoa(telegramVideoNoteDiameter),
	}
	if disableNotification {
		fields["disable_notification"] = "true"
	}
	raw, err := c.apiMultipart(
		ctx,
		token,
		"sendVideoNote",
		fields,
		"video_note",
		telegramVideoNoteFilename(filename),
		videoData,
	)
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

func (c *TelegramBotClient) clearWebhookForPolling(ctx context.Context, token string) error {
	var lastErr error
	for attempt := 0; attempt < 2; attempt++ {
		if err := c.DeleteWebhook(ctx, token); err == nil {
			return nil
		} else {
			lastErr = err
			if !isProxyRetryableError(err) {
				break
			}
		}
		if attempt == 0 {
			time.Sleep(300 * time.Millisecond)
		}
	}
	if lastErr == nil {
		return errors.New("telegram api: deleteWebhook failed")
	}
	if !isProxyRetryableError(lastErr) {
		return lastErr
	}
	_, err := c.api(ctx, token, "setWebhook", map[string]any{"url": ""})
	if err == nil {
		return nil
	}
	return fmt.Errorf("%w; fallback setWebhook: %s", lastErr, sanitizeTelegramError(err).Error())
}

func telegramPublicAvatarURL(chat telegramChat) string {
	return telegramUsernameAvatarURL(chat.Username)
}

func telegramUsernameAvatarURL(username string) string {
	username = strings.TrimPrefix(strings.TrimSpace(username), "@")
	if username == "" {
		return ""
	}
	return "https://t.me/i/userpic/320/" + url.PathEscape(username) + ".jpg"
}

func telegramChatIDParam(chatID string) any {
	chatID = strings.TrimSpace(chatID)
	if id, err := strconv.ParseInt(chatID, 10, 64); err == nil {
		return telegramAPIIntParam(id)
	}
	return chatID
}

func telegramAPIIntParam(id int64) any {
	if id > 2147483647 || id < -2147483648 {
		return strconv.FormatInt(id, 10)
	}
	return id
}

func (c *TelegramBotClient) ChatPhotoDataURI(ctx context.Context, token, chatID string) (string, error) {
	body, contentType, err := c.FetchChatPhoto(ctx, token, chatID)
	if err != nil {
		return "", err
	}
	return bytesToDataURI(body, contentType), nil
}

func (c *TelegramBotClient) UserProfilePhotoDataURI(ctx context.Context, token string, userID int64) (string, error) {
	body, contentType, err := c.FetchUserProfilePhoto(ctx, token, userID)
	if err != nil {
		return "", err
	}
	return bytesToDataURI(body, contentType), nil
}

func bytesToDataURI(body []byte, contentType string) string {
	if len(body) == 0 {
		return ""
	}
	if contentType == "" {
		contentType = "image/jpeg"
	}
	return fmt.Sprintf("data:%s;base64,%s", contentType, base64.StdEncoding.EncodeToString(body))
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

func (c *TelegramBotClient) GetChatMemberCount(ctx context.Context, token, chatID string) (int, error) {
	raw, err := c.api(ctx, token, "getChatMemberCount", map[string]any{
		"chat_id": telegramChatIDParam(chatID),
	})
	if err != nil {
		return 0, err
	}
	var parsed struct {
		Result int `json:"result"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return 0, errors.New("telegram api: invalid getChatMemberCount result")
	}
	return parsed.Result, nil
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

type telegramPhotoSize struct {
	FileID string `json:"file_id"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

type telegramUserProfilePhotos struct {
	TotalCount int                   `json:"total_count"`
	Photos     [][]telegramPhotoSize `json:"photos"`
}

func (c *TelegramBotClient) FetchUserProfilePhoto(ctx context.Context, token string, userID int64) ([]byte, string, error) {
	if userID == 0 {
		return nil, "", nil
	}
	raw, err := c.api(ctx, token, "getUserProfilePhotos", map[string]any{
		"user_id": telegramAPIIntParam(userID),
		"limit":   1,
	})
	if err != nil {
		return nil, "", sanitizeTelegramError(err)
	}
	var photos telegramUserProfilePhotos
	if err := json.Unmarshal(raw, &photos); err != nil {
		return nil, "", errors.New("telegram api: invalid getUserProfilePhotos result")
	}
	if photos.TotalCount == 0 || len(photos.Photos) == 0 || len(photos.Photos[0]) == 0 {
		return nil, "", nil
	}
	sizes := photos.Photos[0]
	fileID := strings.TrimSpace(sizes[len(sizes)-1].FileID)
	if fileID == "" {
		return nil, "", nil
	}
	fileRaw, err := c.api(ctx, token, "getFile", map[string]string{"file_id": fileID})
	if err != nil {
		return nil, "", sanitizeTelegramError(err)
	}
	var file telegramFile
	if err := json.Unmarshal(fileRaw, &file); err != nil {
		return nil, "", errors.New("telegram api: invalid getFile result")
	}
	path := strings.TrimSpace(file.FilePath)
	if path == "" {
		return nil, "", nil
	}
	return c.fetchTelegramFile(ctx, token, path)
}

func (c *TelegramBotClient) FetchBusinessUserAvatar(
	ctx context.Context,
	token string,
	userChatID, userID int64,
	username string,
) ([]byte, string, error) {
	if userChatID <= 0 && userID > 0 {
		userChatID = userID
	}
	if userID <= 0 && userChatID > 0 {
		userID = userChatID
	}

	profileIDs := []int64{}
	if userChatID > 0 {
		profileIDs = append(profileIDs, userChatID)
	}
	if userID > 0 && userID != userChatID {
		profileIDs = append(profileIDs, userID)
	}
	for _, id := range profileIDs {
		if body, contentType, err := c.FetchUserProfilePhoto(ctx, token, id); err == nil && len(body) > 0 {
			return body, contentType, nil
		}
	}
	for _, id := range profileIDs {
		if body, contentType, err := c.FetchChatPhoto(ctx, token, strconv.FormatInt(id, 10)); err == nil && len(body) > 0 {
			return body, contentType, nil
		}
	}

	username = strings.TrimPrefix(strings.TrimSpace(username), "@")
	if username != "" {
		if body, contentType, err := c.FetchChatPhoto(ctx, token, "@"+username); err == nil && len(body) > 0 {
			return body, contentType, nil
		}
		for _, size := range []string{"320", "160"} {
			publicURL := "https://t.me/i/userpic/" + size + "/" + url.PathEscape(username) + ".jpg"
			if body, contentType, err := fetchRemoteAvatar(ctx, publicURL); err == nil && len(body) > 0 {
				return body, contentType, nil
			}
		}
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

type TelegramBusinessConnectionRights struct {
	CanManageStories bool `json:"can_manage_stories"`
}

type TelegramBusinessConnection struct {
	ID         string                            `json:"id"`
	User       telegramUser                      `json:"user"`
	UserChatID int64                             `json:"user_chat_id"`
	IsEnabled  bool                              `json:"is_enabled"`
	Rights     *TelegramBusinessConnectionRights `json:"rights"`
}

func (c TelegramBusinessConnection) CanManageStories() bool {
	return c.Rights != nil && c.Rights.CanManageStories
}

type telegramBusinessUpdate struct {
	UpdateID           int64                       `json:"update_id"`
	BusinessConnection *TelegramBusinessConnection `json:"business_connection"`
}

func (c *TelegramBotClient) SetBusinessWebhook(ctx context.Context, token, webhookURL, secretToken string) error {
	payload := map[string]any{
		"url":                  strings.TrimSpace(webhookURL),
		"secret_token":         strings.TrimSpace(secretToken),
		"allowed_updates":      []string{"business_connection"},
		"drop_pending_updates": false,
	}
	_, err := c.api(ctx, token, "setWebhook", payload)
	return sanitizeTelegramError(err)
}

type TelegramWebhookInfo struct {
	URL                string `json:"url"`
	PendingUpdateCount int    `json:"pending_update_count"`
	LastErrorDate      int    `json:"last_error_date"`
	LastErrorMessage   string `json:"last_error_message"`
}

func (c *TelegramBotClient) GetWebhookInfo(ctx context.Context, token string) (*TelegramWebhookInfo, error) {
	raw, err := c.api(ctx, token, "getWebhookInfo", nil)
	if err != nil {
		return nil, sanitizeTelegramError(err)
	}
	var info TelegramWebhookInfo
	if err := json.Unmarshal(raw, &info); err != nil {
		return nil, errors.New("telegram api: invalid getWebhookInfo result")
	}
	return &info, nil
}

func (c *TelegramBotClient) PollBusinessConnectionsOnce(ctx context.Context, token string) ([]TelegramBusinessConnection, error) {
	if err := c.clearWebhookForPolling(ctx, token); err != nil {
		return nil, fmt.Errorf("deleteWebhook: %w", sanitizeTelegramError(err))
	}
	time.Sleep(400 * time.Millisecond)

	raw, err := c.api(ctx, token, "getUpdates", map[string]any{
		"limit":           100,
		"timeout":         0,
		"offset":          -100,
		"allowed_updates": []string{"business_connection"},
	})
	if err != nil {
		return nil, err
	}

	var updates []telegramBusinessUpdate
	if err := json.Unmarshal(raw, &updates); err != nil {
		return nil, fmt.Errorf("telegram api: invalid getUpdates result")
	}
	latest := map[string]TelegramBusinessConnection{}
	for _, upd := range updates {
		if upd.BusinessConnection == nil || upd.BusinessConnection.ID == "" {
			continue
		}
		latest[upd.BusinessConnection.ID] = *upd.BusinessConnection
	}
	out := make([]TelegramBusinessConnection, 0, len(latest))
	for _, conn := range latest {
		out = append(out, conn)
	}
	return out, nil
}

func (c *TelegramBotClient) GetBusinessConnection(
	ctx context.Context,
	token, businessConnectionID string,
) (*TelegramBusinessConnection, error) {
	raw, err := c.api(ctx, token, "getBusinessConnection", map[string]string{
		"business_connection_id": strings.TrimSpace(businessConnectionID),
	})
	if err != nil {
		return nil, sanitizeTelegramError(err)
	}
	var conn TelegramBusinessConnection
	if err := json.Unmarshal(raw, &conn); err != nil {
		return nil, errors.New("telegram api: invalid getBusinessConnection result")
	}
	return &conn, nil
}

type TelegramPostStoryOptions struct {
	BusinessConnectionID string
	Caption              string
	ParseMode            string
	ActivePeriod         int
	MediaType            string
	MediaURL             string
	MediaBytes           []byte
	MediaFilename        string
	MediaContentType     string
	AreasJSON            string
	PostToChatPage       bool
	ProtectContent       bool
}

func (c *TelegramBotClient) PostStory(ctx context.Context, token string, opts TelegramPostStoryOptions) (string, error) {
	if strings.TrimSpace(opts.BusinessConnectionID) == "" {
		return "", fmt.Errorf("%w: не указан business_connection_id", ErrInvalidPost)
	}
	period := opts.ActivePeriod
	if period <= 0 {
		period = 86400
	}
	var (
		mediaBytes  []byte
		filename    string
		contentType string
		err         error
	)
	if len(opts.MediaBytes) > 0 {
		mediaBytes = opts.MediaBytes
		filename = strings.TrimSpace(opts.MediaFilename)
		contentType = strings.TrimSpace(opts.MediaContentType)
	} else {
		mediaBytes, filename, contentType, err = fetchURLBytes(ctx, c.client, opts.MediaURL)
		if err != nil {
			return "", err
		}
	}
	if len(mediaBytes) == 0 {
		return "", fmt.Errorf("%w: пустой медиафайл", ErrInvalidPost)
	}
	contentJSON := `{"type":"photo","photo":"attach://story_media"}`
	if opts.MediaType == TelegramMediaVideo {
		contentJSON = `{"type":"video","video":"attach://story_media"}`
	}
	fields := map[string]string{
		"business_connection_id": opts.BusinessConnectionID,
		"content":                contentJSON,
		"active_period":          strconv.Itoa(period),
	}
	if caption := strings.TrimSpace(opts.Caption); caption != "" {
		fields["caption"] = caption
		if parseMode := strings.TrimSpace(opts.ParseMode); parseMode != "" {
			fields["parse_mode"] = parseMode
		}
	}
	if strings.TrimSpace(opts.AreasJSON) != "" {
		fields["areas"] = opts.AreasJSON
	}
	if opts.PostToChatPage {
		fields["post_to_chat_page"] = "true"
	}
	if opts.ProtectContent {
		fields["protect_content"] = "true"
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	if filename == "" {
		switch {
		case strings.HasPrefix(strings.ToLower(contentType), "video/"):
			filename = "story.mp4"
		case strings.HasPrefix(strings.ToLower(contentType), "image/"):
			filename = "story.jpg"
		default:
			filename = "story.bin"
		}
	}
	raw, err := c.apiMultipartTyped(ctx, token, "postStory", fields, "story_media", filename, mediaBytes, contentType)
	if err != nil {
		return "", sanitizeTelegramError(err)
	}
	var story struct {
		ID int `json:"id"`
	}
	if err := json.Unmarshal(raw, &story); err != nil {
		return "", errors.New("telegram api: invalid postStory result")
	}
	if story.ID == 0 {
		return "", nil
	}
	return strconv.Itoa(story.ID), nil
}

type TelegramEditStoryOptions struct {
	BusinessConnectionID string
	StoryID              int
	MediaType            string
	MediaBytes           []byte
	MediaFilename        string
	MediaContentType     string
	Caption              string
	ParseMode            string
	AreasJSON            string
}

func (c *TelegramBotClient) EditStory(ctx context.Context, token string, opts TelegramEditStoryOptions) error {
	if opts.StoryID <= 0 {
		return fmt.Errorf("%w: не указан story_id", ErrInvalidPost)
	}
	if strings.TrimSpace(opts.BusinessConnectionID) == "" {
		return fmt.Errorf("%w: не указан business_connection_id", ErrInvalidPost)
	}
	if len(opts.MediaBytes) == 0 {
		return fmt.Errorf("%w: пустой медиафайл", ErrInvalidPost)
	}
	contentJSON := `{"type":"photo","photo":"attach://story_media"}`
	if opts.MediaType == TelegramMediaVideo {
		contentJSON = `{"type":"video","video":"attach://story_media"}`
	}
	fields := map[string]string{
		"business_connection_id": opts.BusinessConnectionID,
		"story_id":               strconv.Itoa(opts.StoryID),
		"content":                contentJSON,
	}
	if caption := strings.TrimSpace(opts.Caption); caption != "" {
		fields["caption"] = caption
		if parseMode := strings.TrimSpace(opts.ParseMode); parseMode != "" {
			fields["parse_mode"] = parseMode
		}
	}
	if strings.TrimSpace(opts.AreasJSON) != "" {
		fields["areas"] = opts.AreasJSON
	}
	filename := strings.TrimSpace(opts.MediaFilename)
	contentType := strings.TrimSpace(opts.MediaContentType)
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	if filename == "" {
		switch {
		case strings.HasPrefix(strings.ToLower(contentType), "video/"):
			filename = "story.mp4"
		case strings.HasPrefix(strings.ToLower(contentType), "image/"):
			filename = "story.jpg"
		default:
			filename = "story.bin"
		}
	}
	_, err := c.apiMultipartTyped(ctx, token, "editStory", fields, "story_media", filename, opts.MediaBytes, contentType)
	if err != nil {
		return sanitizeTelegramError(err)
	}
	return nil
}

func (c *TelegramBotClient) DeleteStory(ctx context.Context, token, businessConnectionID string, storyID int) error {
	if storyID <= 0 {
		return fmt.Errorf("%w: не указан story_id", ErrInvalidPost)
	}
	if strings.TrimSpace(businessConnectionID) == "" {
		return fmt.Errorf("%w: не указан business_connection_id", ErrInvalidPost)
	}
	_, err := c.api(ctx, token, "deleteStory", map[string]any{
		"business_connection_id": businessConnectionID,
		"story_id":               storyID,
	})
	if err != nil {
		return sanitizeTelegramError(err)
	}
	return nil
}

func fetchURLBytes(ctx context.Context, client *http.Client, rawURL string) ([]byte, string, string, error) {
	rawURL = strings.TrimSpace(rawURL)
	if err := validateHTTPURL(rawURL); err != nil {
		return nil, "", "", fmt.Errorf("%w: некорректная ссылка на медиа", ErrInvalidPost)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, "", "", err
	}
	httpClient := client
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, "", "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, "", "", fmt.Errorf("download media: HTTP %d", resp.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 50<<20))
	if err != nil {
		return nil, "", "", err
	}
	if len(body) == 0 {
		return nil, "", "", fmt.Errorf("%w: пустой медиафайл", ErrInvalidPost)
	}
	filename := "story.bin"
	if parts := strings.Split(resp.Header.Get("Content-Type"), ";"); len(parts) > 0 {
		switch strings.TrimSpace(strings.ToLower(parts[0])) {
		case "image/jpeg", "image/jpg":
			filename = "story.jpg"
		case "image/png":
			filename = "story.png"
		case "video/mp4":
			filename = "story.mp4"
		}
	}
	return body, filename, resp.Header.Get("Content-Type"), nil
}

func (c *TelegramBotClient) apiMultipartTyped(
	ctx context.Context,
	token, method string,
	fields map[string]string,
	fileField, filename string,
	fileData []byte,
	fileContentType string,
) (json.RawMessage, error) {
	endpoint := fmt.Sprintf("https://api.telegram.org/bot%s/%s", strings.TrimSpace(token), method)
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			return nil, err
		}
	}
	if fileContentType == "" {
		fileContentType = "application/octet-stream"
	}
	fileHeader := make(textproto.MIMEHeader)
	fileHeader.Set("Content-Disposition", fmt.Sprintf(`form-data; name="%s"; filename="%s"`, fileField, filename))
	fileHeader.Set("Content-Type", fileContentType)
	part, err := writer.CreatePart(fileHeader)
	if err != nil {
		return nil, err
	}
	if _, err := part.Write(fileData); err != nil {
		return nil, err
	}
	contentType := writer.FormDataContentType()
	if err := writer.Close(); err != nil {
		return nil, err
	}
	uploadClient := &http.Client{Timeout: 5 * time.Minute, Transport: c.client.Transport}
	resp, err := c.doRequestWithClient(ctx, uploadClient, http.MethodPost, endpoint, contentType, buf.Bytes())
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
