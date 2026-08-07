package oauth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

const vkCommunityAuthURL = "https://oauth.vk.com/authorize"
const vkCommunityTokenURL = "https://oauth.vk.com/access_token"
const vkAPIBase = "https://api.vk.com/method"
const vkCommunityScope = "wall,photos,groups,offline"
const vkAPIVersion = "5.199"

type VKCommunityClient struct {
	AppID       string
	AppSecret   string
	RedirectURI string
	HTTP        *http.Client
}

type VKCommunityTokenResponse struct {
	AccessToken  string `json:"access_token"`
	ExpiresIn    int    `json:"expires_in"`
	UserID       int64  `json:"user_id"`
	Error        string `json:"error"`
	ErrorDesc    string `json:"error_description"`
}

type VKAdminGroup struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	ScreenName string `json:"screen_name"`
	Type       string `json:"type"`
	Photo50    string `json:"photo_50"`
}

func (c *VKCommunityClient) AuthorizeURL(state string) string {
	values := url.Values{}
	values.Set("client_id", c.AppID)
	values.Set("display", "page")
	values.Set("redirect_uri", c.RedirectURI)
	values.Set("scope", vkCommunityScope)
	values.Set("response_type", "code")
	values.Set("state", state)
	values.Set("v", vkAPIVersion)
	return vkCommunityAuthURL + "?" + values.Encode()
}

func (c *VKCommunityClient) ExchangeCode(ctx context.Context, code string) (*VKCommunityTokenResponse, error) {
	values := url.Values{}
	values.Set("client_id", c.AppID)
	values.Set("client_secret", c.AppSecret)
	values.Set("redirect_uri", c.RedirectURI)
	values.Set("code", code)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, vkCommunityTokenURL+"?"+values.Encode(), nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.http().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("vk token: HTTP %d: %s", resp.StatusCode, string(body))
	}

	var out VKCommunityTokenResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	if out.Error != "" {
		return nil, fmt.Errorf("vk token: %s — %s", out.Error, out.ErrorDesc)
	}
	if out.AccessToken == "" {
		return nil, fmt.Errorf("vk token: empty access_token")
	}
	return &out, nil
}

func (c *VKCommunityClient) ListAdminGroups(ctx context.Context, accessToken string) ([]VKAdminGroup, error) {
	values := url.Values{}
	values.Set("access_token", accessToken)
	values.Set("v", vkAPIVersion)
	values.Set("filter", "admin")
	values.Set("extended", "1")
	values.Set("fields", "screen_name,photo_50")

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, vkAPIBase+"/groups.get?"+values.Encode(), nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.http().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}

	var parsed struct {
		Response struct {
			Items []VKAdminGroup `json:"items"`
		} `json:"response"`
		Error *struct {
			ErrorMsg string `json:"error_msg"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	if parsed.Error != nil {
		return nil, fmt.Errorf("vk groups.get: %s", parsed.Error.ErrorMsg)
	}
	return parsed.Response.Items, nil
}

func (c *VKCommunityClient) VerifyGroupAccess(ctx context.Context, accessToken string, groupID int64) error {
	values := url.Values{}
	values.Set("access_token", accessToken)
	values.Set("v", vkAPIVersion)
	values.Set("group_id", strconv.FormatInt(groupID, 10))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, vkAPIBase+"/groups.getById?"+values.Encode(), nil)
	if err != nil {
		return err
	}
	resp, err := c.http().Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}

	var parsed struct {
		Response []struct {
			ID int64 `json:"id"`
		} `json:"response"`
		Error *struct {
			ErrorMsg string `json:"error_msg"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return err
	}
	if parsed.Error != nil {
		return fmt.Errorf("vk groups.getById: %s", parsed.Error.ErrorMsg)
	}
	if len(parsed.Response) == 0 {
		return fmt.Errorf("сообщество VK не найдено")
	}
	return nil
}

func VKGroupExternalID(groupID int64) string {
	return strconv.FormatInt(-groupID, 10)
}

func ParseVKGroupExternalID(externalID string) (int64, error) {
	externalID = strings.TrimSpace(externalID)
	n, err := strconv.ParseInt(externalID, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("некорректный ID сообщества VK")
	}
	if n > 0 {
		n = -n
	}
	return -n, nil
}

func (c *VKCommunityClient) PostWallMessage(ctx context.Context, accessToken string, ownerID int64, message string) (int64, error) {
	values := url.Values{}
	values.Set("access_token", accessToken)
	values.Set("v", vkAPIVersion)
	values.Set("owner_id", strconv.FormatInt(ownerID, 10))
	values.Set("message", message)
	values.Set("from_group", "1")

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, vkAPIBase+"/wall.post", strings.NewReader(values.Encode()))
	if err != nil {
		return 0, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.http().Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return 0, err
	}

	var parsed struct {
		Response struct {
			PostID int64 `json:"post_id"`
		} `json:"response"`
		Error *struct {
			ErrorMsg string `json:"error_msg"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return 0, err
	}
	if parsed.Error != nil {
		return 0, fmt.Errorf("vk wall.post: %s", parsed.Error.ErrorMsg)
	}
	return parsed.Response.PostID, nil
}

func (c *VKCommunityClient) http() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return DefaultVKHTTPClient()
}
