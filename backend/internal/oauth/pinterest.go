package oauth

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

const (
	pinterestAuthorizeURL = "https://www.pinterest.com/oauth/"
	pinterestTokenURL     = "https://api.pinterest.com/v5/oauth/token"
	pinterestAPIBaseURL   = "https://api.pinterest.com/v5"
	PinterestScope        = "user_accounts:read,boards:read,pins:read,pins:write"
)

type PinterestClient struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
	HTTP         *http.Client
}

type PinterestTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

type PinterestBoard struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Privacy     string `json:"privacy"`
}

type PinterestProfile struct {
	Username    string `json:"username"`
	AccountType string `json:"account_type"`
	ProfileURL  string `json:"profile_url"`
	PinterestID string `json:"id"`
}

func (c *PinterestClient) AuthorizeURL(state string) string {
	q := url.Values{}
	q.Set("response_type", "code")
	q.Set("client_id", strings.TrimSpace(c.ClientID))
	q.Set("redirect_uri", c.RedirectURI)
	q.Set("scope", PinterestScope)
	q.Set("state", state)
	return pinterestAuthorizeURL + "?" + q.Encode()
}

func (c *PinterestClient) ExchangeCode(ctx context.Context, code string) (*PinterestTokenResponse, error) {
	form := url.Values{"grant_type": {"authorization_code"}, "code": {code}, "redirect_uri": {c.RedirectURI}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, pinterestTokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(strings.TrimSpace(c.ClientID), strings.TrimSpace(c.ClientSecret))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	return c.doToken(req)
}

func (c *PinterestClient) doToken(req *http.Request) (*PinterestTokenResponse, error) {
	resp, err := c.http().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("pinterest oauth: HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	var out PinterestTokenResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	if out.AccessToken == "" {
		return nil, fmt.Errorf("pinterest oauth: empty access token")
	}
	return &out, nil
}

func (c *PinterestClient) Profile(ctx context.Context, token string) (*PinterestProfile, error) {
	var out PinterestProfile
	if err := c.getJSON(ctx, token, "/user_account", &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *PinterestClient) Boards(ctx context.Context, token string) ([]PinterestBoard, error) {
	var all []PinterestBoard
	bookmark := ""
	for {
		q := "?page_size=250"
		if bookmark != "" {
			q += "&bookmark=" + url.QueryEscape(bookmark)
		}
		var page struct {
			Items    []PinterestBoard `json:"items"`
			Bookmark string           `json:"bookmark"`
		}
		if err := c.getJSON(ctx, token, "/boards"+q, &page); err != nil {
			return nil, err
		}
		all = append(all, page.Items...)
		if page.Bookmark == "" || len(page.Items) == 0 {
			break
		}
		bookmark = page.Bookmark
	}
	return all, nil
}

func (c *PinterestClient) CreatePin(ctx context.Context, token, boardID, title, description, link, altText string, media []struct {
	ContentType string
	Data        []byte
}) (string, error) {
	items := make([]map[string]any, 0, len(media))
	for _, item := range media {
		if item.ContentType != "image/jpeg" && item.ContentType != "image/png" {
			return "", fmt.Errorf("pinterest: поддерживаются только JPEG и PNG")
		}
		items = append(items, map[string]any{"content_type": item.ContentType, "data": base64.StdEncoding.EncodeToString(item.Data)})
	}
	var source map[string]any
	if len(items) == 1 {
		source = map[string]any{"source_type": "image_base64", "content_type": items[0]["content_type"], "data": items[0]["data"]}
	} else {
		source = map[string]any{"source_type": "multiple_image_base64", "items": items}
	}
	payload := map[string]any{"board_id": boardID, "media_source": source}
	if title != "" {
		payload["title"] = title
	}
	if description != "" {
		payload["description"] = description
	}
	if link != "" {
		payload["link"] = link
	}
	if altText != "" {
		payload["alt_text"] = altText
	}
	var out struct {
		ID string `json:"id"`
	}
	if err := c.postJSON(ctx, token, "/pins", payload, &out); err != nil {
		return "", err
	}
	if out.ID == "" {
		return "", fmt.Errorf("pinterest: empty pin id")
	}
	return out.ID, nil
}

func (c *PinterestClient) getJSON(ctx context.Context, token, path string, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, pinterestAPIBaseURL+path, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")
	resp, err := c.http().Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if resp.StatusCode >= 400 {
		return fmt.Errorf("pinterest API: HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return json.Unmarshal(body, out)
}

func (c *PinterestClient) postJSON(ctx context.Context, token, path string, payload any, out any) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, pinterestAPIBaseURL+path, bytes.NewReader(raw))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http().Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if resp.StatusCode >= 400 {
		return fmt.Errorf("pinterest API: HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return json.Unmarshal(body, out)
}

func (c *PinterestClient) http() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return &http.Client{}
}
