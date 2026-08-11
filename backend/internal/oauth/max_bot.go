package oauth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"path"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
)

const maxAPIBase = "https://platform-api2.max.ru"

const (
	MaxMAXMediaAttachments = 12
	MaxMAXImageBytes       = 50 << 20
	MaxMAXVideoBytes       = 250 << 20
)

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

type MAXImage struct {
	URL string `json:"url"`
}

type MAXChat struct {
	ChatID  int64     `json:"chat_id"`
	Type    string    `json:"type"`
	Title   string    `json:"title"`
	Status  string    `json:"status"`
	Link    string    `json:"link"`
	Icon    *MAXImage `json:"icon"`
	IconURL string    `json:"icon_url"`
}

func MAXChatAvatarURL(chat *MAXChat) string {
	if chat == nil {
		return ""
	}
	if chat.Icon != nil {
		if url := strings.TrimSpace(chat.Icon.URL); url != "" {
			return url
		}
	}
	return strings.TrimSpace(chat.IconURL)
}

func (c *MAXBotClient) FetchChatIcon(ctx context.Context, token string, chatID int64) ([]byte, string, error) {
	chat, err := c.GetChat(ctx, token, chatID)
	if err != nil {
		return nil, "", err
	}
	iconURL := MAXChatAvatarURL(chat)
	if iconURL == "" {
		return nil, "", nil
	}
	respBody, status, err := c.do(ctx, http.MethodGet, iconURL, token, nil)
	if err != nil {
		return nil, "", err
	}
	if status >= 400 {
		return nil, "", fmt.Errorf("max icon: HTTP %d: %s", status, strings.TrimSpace(string(respBody)))
	}
	contentType := "image/jpeg"
	if len(respBody) > 0 && respBody[0] == 0x89 {
		contentType = "image/png"
	}
	return respBody, contentType, nil
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
	endpoint := maxAPIBase + "/chats/" + chatLink
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

type maxChatsListResponse struct {
	Chats  []MAXChat `json:"chats"`
	Marker *int64    `json:"marker"`
}

type maxUpdatesResponse struct {
	Updates []maxUpdate `json:"updates"`
	Marker  *int64      `json:"marker"`
}

type maxUpdate struct {
	UpdateType string `json:"update_type"`
	ChatID     int64  `json:"chat_id"`
	IsChannel  bool   `json:"is_channel"`
}

func maxChatLinkMatches(chat *MAXChat, raw string) bool {
	if chat == nil {
		return false
	}
	want := NormalizeMAXChatLink(raw)
	if want == "" {
		return false
	}
	if NormalizeMAXChatLink(chat.Link) == want {
		return true
	}
	link := strings.ToLower(strings.TrimSpace(chat.Link))
	if link != "" && (strings.HasSuffix(link, "/"+want) || strings.Contains(link, want)) {
		return true
	}
	return false
}

func (c *MAXBotClient) ListChats(ctx context.Context, token string, count int, marker *int64) (*maxChatsListResponse, error) {
	if count <= 0 {
		count = 100
	}
	q := url.Values{}
	q.Set("count", strconv.Itoa(count))
	if marker != nil {
		q.Set("marker", strconv.FormatInt(*marker, 10))
	}
	endpoint := maxAPIBase + "/chats?" + q.Encode()
	respBody, status, err := c.do(ctx, http.MethodGet, endpoint, token, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("max chats list: HTTP %d: %s", status, strings.TrimSpace(string(respBody)))
	}
	var parsed maxChatsListResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, err
	}
	return &parsed, nil
}

func (c *MAXBotClient) GetUpdates(
	ctx context.Context,
	token string,
	limit int,
	timeoutSec int,
	marker *int64,
	types []string,
) (*maxUpdatesResponse, error) {
	if limit <= 0 {
		limit = 100
	}
	if timeoutSec < 0 {
		timeoutSec = 0
	}
	q := url.Values{}
	q.Set("limit", strconv.Itoa(limit))
	q.Set("timeout", strconv.Itoa(timeoutSec))
	if marker != nil {
		q.Set("marker", strconv.FormatInt(*marker, 10))
	}
	if len(types) > 0 {
		q.Set("types", strings.Join(types, ","))
	}
	endpoint := maxAPIBase + "/updates?" + q.Encode()
	respBody, status, err := c.do(ctx, http.MethodGet, endpoint, token, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("max updates: HTTP %d: %s", status, strings.TrimSpace(string(respBody)))
	}
	var parsed maxUpdatesResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, err
	}
	return &parsed, nil
}

func (c *MAXBotClient) DiscoverMemberChats(ctx context.Context, token string) ([]MAXChat, error) {
	seen := map[int64]struct{}{}
	var result []MAXChat

	var marker *int64
	for page := 0; page < 10; page++ {
		list, err := c.ListChats(ctx, token, 100, marker)
		if err != nil {
			break
		}
		for _, chat := range list.Chats {
			if chat.ChatID == 0 {
				continue
			}
			if _, ok := seen[chat.ChatID]; ok {
				continue
			}
			seen[chat.ChatID] = struct{}{}
			result = append(result, chat)
		}
		if list.Marker == nil {
			break
		}
		marker = list.Marker
	}

	upd, err := c.GetUpdates(ctx, token, 100, 0, nil, []string{
		"bot_added",
		"bot_removed",
		"message_created",
		"message_edited",
		"chat_title_changed",
		"user_added",
	})
	if err == nil {
		for _, update := range upd.Updates {
			if update.ChatID == 0 {
				continue
			}
			if _, ok := seen[update.ChatID]; ok {
				continue
			}
			chat, chatErr := c.GetChat(ctx, token, update.ChatID)
			if chatErr != nil {
				continue
			}
			seen[update.ChatID] = struct{}{}
			result = append(result, *chat)
		}
	}

	return result, nil
}

func (c *MAXBotClient) resolveChatFromMembership(ctx context.Context, token, raw string) (*MAXChat, error) {
	want := NormalizeMAXChatLink(raw)
	if want == "" {
		return nil, fmt.Errorf("некорректная ссылка на канал MAX")
	}

	chats, err := c.DiscoverMemberChats(ctx, token)
	if err != nil {
		return nil, err
	}
	if len(chats) == 0 {
		return nil, fmt.Errorf(
			"канал %q не найден: MAX не ищет каналы по публичной ссылке. "+
				"Добавьте бота администратором с правом «Публикация», затем укажите числовой chat_id",
			want,
		)
	}

	var matches []MAXChat
	for _, chat := range chats {
		if maxChatLinkMatches(&chat, want) {
			matches = append(matches, chat)
		}
	}
	switch len(matches) {
	case 1:
		return &matches[0], nil
	case 0:
		if len(chats) == 1 {
			return &chats[0], nil
		}
		return nil, fmt.Errorf(
			"канал %q не найден среди %d каналов бота — выберите chat_id из списка или заново добавьте бота в канал",
			want,
			len(chats),
		)
	default:
		return nil, fmt.Errorf(
			"найдено несколько каналов по ссылке %q — укажите числовой chat_id",
			want,
		)
	}
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
	if chat, err := c.GetChatByLink(ctx, token, raw); err == nil {
		return chat, nil
	}
	return c.resolveChatFromMembership(ctx, token, raw)
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

// MAXOutgoingAttachment is a media item ready to attach to a MAX channel message.
type MAXOutgoingAttachment struct {
	Type     string // "image" or "video"
	ImageURL string // public URL for images
	Token    string // upload token for video (or image upload flow)
}

func MAXImageMimeAllowed(mimeType string) bool {
	switch strings.ToLower(strings.TrimSpace(mimeType)) {
	case "image/jpeg", "image/jpg", "image/png", "image/gif",
		"image/tiff", "image/bmp", "image/heic", "image/heif":
		return true
	default:
		return false
	}
}

func MAXVideoMimeAllowed(mimeType string) bool {
	mimeType = strings.ToLower(strings.TrimSpace(mimeType))
	switch mimeType {
	case "video/mp4", "video/quicktime", "video/x-matroska", "video/webm", "video/mkv":
		return true
	default:
		return strings.HasPrefix(mimeType, "video/")
	}
}

type maxUploadEndpoint struct {
	URL   string `json:"url"`
	Token string `json:"token"`
}

func (c *MAXBotClient) CreateUpload(ctx context.Context, botToken, uploadType string) (*maxUploadEndpoint, error) {
	uploadType = strings.TrimSpace(uploadType)
	if uploadType == "" {
		return nil, fmt.Errorf("max upload: empty type")
	}
	endpoint := maxAPIBase + "/uploads?" + url.Values{"type": {uploadType}}.Encode()
	respBody, status, err := c.do(ctx, http.MethodPost, endpoint, botToken, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("max upload init: HTTP %d: %s", status, strings.TrimSpace(string(respBody)))
	}
	var parsed maxUploadEndpoint
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, err
	}
	if strings.TrimSpace(parsed.URL) == "" {
		return nil, fmt.Errorf("max upload init: empty upload url")
	}
	return &parsed, nil
}

func (c *MAXBotClient) uploadMultipartFile(ctx context.Context, uploadURL string, data []byte, filename string) error {
	if strings.TrimSpace(filename) == "" {
		filename = "upload.bin"
	}
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	part, err := writer.CreateFormFile("data", filename)
	if err != nil {
		return err
	}
	if _, err := part.Write(data); err != nil {
		return err
	}
	if err := writer.Close(); err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, uploadURL, &buf)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

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
		return fmt.Errorf("max upload file: HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}
	return nil
}

func (c *MAXBotClient) UploadVideo(ctx context.Context, botToken string, data []byte, filename string) (string, error) {
	if int64(len(data)) > MaxMAXVideoBytes {
		return "", fmt.Errorf("видео MAX не должно превышать %d МБ", MaxMAXVideoBytes>>20)
	}
	upload, err := c.CreateUpload(ctx, botToken, "video")
	if err != nil {
		return "", err
	}
	token := strings.TrimSpace(upload.Token)
	if token == "" {
		return "", fmt.Errorf("max upload video: token not returned")
	}
	if err := c.uploadMultipartFile(ctx, upload.URL, data, filename); err != nil {
		return "", err
	}
	time.Sleep(500 * time.Millisecond)
	return token, nil
}

func (c *MAXBotClient) DownloadHTTPMedia(
	ctx context.Context,
	rawURL string,
	maxBytes int64,
	defaultName string,
) ([]byte, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimSpace(rawURL), nil)
	if err != nil {
		return nil, "", err
	}
	resp, err := c.http().Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil, "", fmt.Errorf("загрузка медиа: HTTP %d", resp.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, maxBytes+1))
	if err != nil {
		return nil, "", err
	}
	if int64(len(data)) > maxBytes {
		return nil, "", fmt.Errorf("медиафайл слишком большой (лимит %d МБ)", maxBytes>>20)
	}
	name := strings.TrimSpace(path.Base(req.URL.Path))
	if name == "" || name == "." || name == "/" {
		name = defaultName
	}
	return data, name, nil
}

func buildMAXMessageAttachments(items []MAXOutgoingAttachment) []map[string]any {
	if len(items) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		payload := map[string]any{}
		switch item.Type {
		case "image":
			if url := strings.TrimSpace(item.ImageURL); url != "" {
				payload["url"] = url
			} else if token := strings.TrimSpace(item.Token); token != "" {
				payload["token"] = token
			}
		case "video":
			if token := strings.TrimSpace(item.Token); token != "" {
				payload["token"] = token
			}
		}
		if len(payload) == 0 {
			continue
		}
		out = append(out, map[string]any{
			"type":    item.Type,
			"payload": payload,
		})
	}
	return out
}

func appendMAXInlineKeyboard(
	attachments []map[string]any,
	buttons [][]model.TelegramInlineButton,
) []map[string]any {
	if len(buttons) == 0 {
		return attachments
	}
	rows := make([][]maxInlineButton, 0, len(buttons))
	for _, row := range buttons {
		btnRow := make([]maxInlineButton, 0, len(row))
		for _, button := range row {
			text := strings.TrimSpace(button.Text)
			link := strings.TrimSpace(button.URL)
			if text == "" || link == "" {
				continue
			}
			btnRow = append(btnRow, maxInlineButton{Type: "link", Text: text, URL: link})
		}
		if len(btnRow) > 0 {
			rows = append(rows, btnRow)
		}
	}
	if len(rows) == 0 {
		return attachments
	}
	out := attachments
	if out == nil {
		out = make([]map[string]any, 0, 1)
	}
	out = append(out, map[string]any{
		"type":    "inline_keyboard",
		"payload": maxInlineKeyboard{Buttons: rows},
	})
	return out
}

func (c *MAXBotClient) SendChannelMessage(
	ctx context.Context,
	botToken, chatID, text string,
	attachments []MAXOutgoingAttachment,
	buttons [][]model.TelegramInlineButton,
) error {
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

	body := map[string]any{}
	if strings.TrimSpace(text) != "" {
		body["text"] = text
	}
	atts := buildMAXMessageAttachments(attachments)
	atts = appendMAXInlineKeyboard(atts, buttons)
	if len(atts) > 0 {
		body["attachments"] = atts
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}

	endpoint := maxAPIBase + "/messages?" + url.Values{
		"chat_id": {strconv.FormatInt(chat.ChatID, 10)},
	}.Encode()

	var lastErr error
	for attempt := 0; attempt < 5; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(attempt) * 500 * time.Millisecond)
		}
		respBody, status, err := c.do(ctx, http.MethodPost, endpoint, botToken, payload)
		if err != nil {
			return err
		}
		if status < 400 {
			return nil
		}
		msg := strings.TrimSpace(string(respBody))
		lastErr = fmt.Errorf("max messages: HTTP %d: %s", status, msg)
		if strings.Contains(msg, "proto.payload") {
			return fmt.Errorf(
				"некорректный chat_id канала MAX — укажите числовой ID или ссылку вида channel_name, не полный URL в поле ID",
			)
		}
		if !strings.Contains(msg, "attachment.not.ready") {
			return lastErr
		}
	}
	return lastErr
}

func (c *MAXBotClient) SendText(ctx context.Context, botToken, chatID, text string) error {
	return c.SendChannelMessage(ctx, botToken, chatID, text, nil, nil)
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
