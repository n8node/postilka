package wordpress

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net"
	"net/http"
	"net/textproto"
	"net/url"
	"strings"
	"time"
	"unicode"
)

var (
	ErrUnauthorized = errors.New("wordpress unauthorized")
	ErrAPI          = errors.New("wordpress api error")
)

type Client struct {
	httpClient *http.Client
}

func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 90 * time.Second},
	}
}

type SiteInfo struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	URL         string `json:"url"`
	Home        string `json:"home"`
	SiteIconURL string `json:"site_icon_url"`
}

type UserMe struct {
	ID           int64             `json:"id"`
	Name         string            `json:"name"`
	Slug         string            `json:"slug"`
	Link         string            `json:"link"`
	AvatarURLs   map[string]string `json:"avatar_urls"`
	Capabilities map[string]bool   `json:"capabilities"`
}

type Media struct {
	ID        int64  `json:"id"`
	SourceURL string `json:"source_url"`
}

type Post struct {
	ID     int64  `json:"id"`
	Link   string `json:"link"`
	Status string `json:"status"`
}

type CreatePostInput struct {
	Title         string
	Content       string
	Excerpt       string
	Status        string
	FeaturedMedia int64
}

type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Data    struct {
		Status int `json:"status"`
	} `json:"data"`
}

func NormalizeSiteURL(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", fmt.Errorf("укажите адрес сайта WordPress")
	}
	if !strings.Contains(raw, "://") {
		raw = "https://" + raw
	}
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Host == "" {
		return "", fmt.Errorf("некорректный адрес сайта WordPress")
	}
	scheme := strings.ToLower(parsed.Scheme)
	if scheme != "http" && scheme != "https" {
		return "", fmt.Errorf("сайт WordPress должен быть по http или https")
	}
	if parsed.User != nil {
		return "", fmt.Errorf("адрес сайта не должен содержать логин или пароль")
	}
	host := strings.ToLower(parsed.Hostname())
	if host == "" {
		return "", fmt.Errorf("некорректный адрес сайта WordPress")
	}
	if err := rejectBlockedHost(host); err != nil {
		return "", err
	}
	path := strings.TrimRight(parsed.EscapedPath(), "/")
	path = strings.TrimSuffix(path, "/wp-admin")
	path = strings.TrimSuffix(path, "/wp-login.php")
	path = strings.TrimSuffix(path, "/wp-json")
	path = strings.TrimRight(path, "/")
	out := &url.URL{Scheme: scheme, Host: strings.ToLower(parsed.Host), Path: path}
	return strings.TrimRight(out.String(), "/"), nil
}

func rejectBlockedHost(host string) error {
	if host == "localhost" || strings.HasSuffix(host, ".localhost") {
		return fmt.Errorf("локальный адрес WordPress недоступен с сервера Postilka")
	}
	if ip := net.ParseIP(host); ip != nil {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsUnspecified() {
			return fmt.Errorf("локальный адрес WordPress недоступен с сервера Postilka")
		}
	}
	return nil
}

func SiteChatID(siteURL string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(siteURL)))
	return hex.EncodeToString(sum[:16])
}

func NormalizeApplicationPassword(raw string) string {
	var b strings.Builder
	for _, r := range raw {
		if unicode.IsSpace(r) {
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}

func (c *Client) SiteInfo(ctx context.Context, siteURL string) (SiteInfo, error) {
	var out SiteInfo
	err := c.doJSON(ctx, http.MethodGet, siteURL, "/wp-json", "", "", nil, &out)
	if err != nil {
		return SiteInfo{}, err
	}
	if strings.TrimSpace(out.Name) == "" && strings.TrimSpace(out.URL) == "" && strings.TrimSpace(out.Home) == "" {
		return SiteInfo{}, fmt.Errorf("%w: сайт не отвечает как WordPress REST API", ErrAPI)
	}
	return out, nil
}

func (c *Client) Me(ctx context.Context, siteURL, username, applicationPassword string) (UserMe, error) {
	var out UserMe
	err := c.doJSON(ctx, http.MethodGet, siteURL, "/wp-json/wp/v2/users/me?context=edit", username, applicationPassword, nil, &out)
	return out, err
}

func (c *Client) CreatePost(ctx context.Context, siteURL, username, applicationPassword string, input CreatePostInput) (Post, error) {
	status := strings.TrimSpace(input.Status)
	if status == "" {
		status = "publish"
	}
	body := map[string]any{
		"title":   input.Title,
		"content": input.Content,
		"status":  status,
	}
	if excerpt := strings.TrimSpace(input.Excerpt); excerpt != "" {
		body["excerpt"] = excerpt
	}
	if input.FeaturedMedia > 0 {
		body["featured_media"] = input.FeaturedMedia
	}
	var out Post
	err := c.doJSON(ctx, http.MethodPost, siteURL, "/wp-json/wp/v2/posts", username, applicationPassword, body, &out)
	if err != nil {
		return Post{}, err
	}
	if out.ID == 0 {
		return Post{}, fmt.Errorf("%w: WordPress не вернула id записи", ErrAPI)
	}
	return out, nil
}

func (c *Client) UploadMedia(
	ctx context.Context,
	siteURL, username, applicationPassword string,
	r io.Reader,
	filename, contentType string,
) (Media, error) {
	if strings.TrimSpace(filename) == "" {
		filename = "upload"
	}
	if strings.TrimSpace(contentType) == "" {
		contentType = "application/octet-stream"
	}

	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	header := make(textproto.MIMEHeader)
	header.Set("Content-Disposition", fmt.Sprintf(`form-data; name="file"; filename="%s"`, multipartEscapeFilename(filename)))
	header.Set("Content-Type", contentType)
	part, err := w.CreatePart(header)
	if err != nil {
		return Media{}, err
	}
	if _, err := io.Copy(part, r); err != nil {
		return Media{}, err
	}
	if err := w.Close(); err != nil {
		return Media{}, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, restURL(siteURL, "/wp-json/wp/v2/media"), &body)
	if err != nil {
		return Media{}, err
	}
	req.Header.Set("Authorization", basicAuth(username, applicationPassword))
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, multipartEscapeFilename(filename)))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return Media{}, fmt.Errorf("не удалось загрузить медиа в WordPress: %w", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err := mapStatusError(resp.StatusCode, raw); err != nil {
		return Media{}, err
	}
	var out Media
	if err := json.Unmarshal(raw, &out); err != nil {
		return Media{}, fmt.Errorf("decode wordpress media: %w", err)
	}
	if out.ID == 0 {
		return Media{}, fmt.Errorf("%w: WordPress не вернула id медиа", ErrAPI)
	}
	return out, nil
}

func (u UserMe) CanEditPosts() bool {
	if len(u.Capabilities) == 0 {
		return true
	}
	return u.Capabilities["edit_posts"] || u.Capabilities["publish_posts"] || u.Capabilities["edit_pages"]
}

func (u UserMe) AvatarURL() string {
	for _, key := range []string{"96", "48", "24"} {
		if url := strings.TrimSpace(u.AvatarURLs[key]); url != "" {
			return url
		}
	}
	for _, url := range u.AvatarURLs {
		if strings.TrimSpace(url) != "" {
			return url
		}
	}
	return ""
}

func ArticleHTML(text string) string {
	text = strings.TrimSpace(text)
	if text == "" {
		return ""
	}
	if strings.Contains(text, "<") && strings.Contains(text, ">") {
		return text
	}
	parts := strings.Split(text, "\n\n")
	var b strings.Builder
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		escaped := htmlEscape(part)
		escaped = strings.ReplaceAll(escaped, "\n", "<br />")
		b.WriteString("<p>")
		b.WriteString(escaped)
		b.WriteString("</p>")
	}
	return b.String()
}

func htmlEscape(s string) string {
	replacer := strings.NewReplacer(
		"&", "&amp;",
		"<", "&lt;",
		">", "&gt;",
		`"`, "&quot;",
	)
	return replacer.Replace(s)
}

func (c *Client) doJSON(
	ctx context.Context,
	method, siteURL, path, username, applicationPassword string,
	body any,
	out any,
) error {
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(raw)
	}
	req, err := http.NewRequestWithContext(ctx, method, restURL(siteURL, path), reader)
	if err != nil {
		return err
	}
	if username != "" {
		req.Header.Set("Authorization", basicAuth(username, applicationPassword))
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("не удалось связаться с WordPress: %w", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err := mapStatusError(resp.StatusCode, raw); err != nil {
		return err
	}
	if out == nil || len(bytes.TrimSpace(raw)) == 0 {
		return nil
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return fmt.Errorf("decode wordpress response: %w", err)
	}
	return nil
}

func restURL(siteURL, path string) string {
	return strings.TrimRight(strings.TrimSpace(siteURL), "/") + path
}

func basicAuth(username, password string) string {
	token := strings.TrimSpace(username) + ":" + NormalizeApplicationPassword(password)
	return "Basic " + base64.StdEncoding.EncodeToString([]byte(token))
}

func mapStatusError(status int, raw []byte) error {
	if status == http.StatusUnauthorized || status == http.StatusForbidden {
		msg := parseMessage(raw)
		if msg == "" {
			msg = "неверный логин или пароль приложения WordPress"
		}
		return fmt.Errorf("%w: %s", ErrUnauthorized, msg)
	}
	if status < 200 || status >= 300 {
		msg := parseMessage(raw)
		if msg == "" {
			return fmt.Errorf("%w: HTTP %d", ErrAPI, status)
		}
		return fmt.Errorf("%w: %s", ErrAPI, msg)
	}
	return nil
}

func parseMessage(raw []byte) string {
	var parsed apiError
	if err := json.Unmarshal(raw, &parsed); err == nil && strings.TrimSpace(parsed.Message) != "" {
		return strings.TrimSpace(parsed.Message)
	}
	return ""
}

func multipartEscapeFilename(name string) string {
	return strings.NewReplacer(`\`, `\\`, `"`, `\"`).Replace(name)
}
