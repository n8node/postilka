package oauth

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
)

const okAuthURL = "https://connect.ok.ru/oauth/authorize"
const okTokenURL = "https://api.ok.ru/oauth/token.do"
const okAPIBase = "https://api.ok.ru/fb.do"
const okScope = "VALUABLE_ACCESS;LONG_ACCESS_TOKEN;GROUP_CONTENT"

type OKClient struct {
	AppID       string
	AppSecret   string
	RedirectURI string
	HTTP        *http.Client
}

type OKTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	Error        string `json:"error"`
	ErrorDesc    string `json:"error_description"`
}

type OKGroup struct {
	GroupID   string `json:"groupId"`
	GroupName string `json:"name"`
	PhotoURL  string `json:"picAvatar"`
}

func (c *OKClient) AuthorizeURL(state string) string {
	values := url.Values{}
	values.Set("client_id", c.AppID)
	values.Set("scope", okScope)
	values.Set("response_type", "code")
	values.Set("redirect_uri", c.RedirectURI)
	values.Set("state", state)
	values.Set("layout", "w")
	return okAuthURL + "?" + values.Encode()
}

func (c *OKClient) ExchangeCode(ctx context.Context, code string) (*OKTokenResponse, error) {
	values := url.Values{}
	values.Set("code", code)
	values.Set("client_id", c.AppID)
	values.Set("client_secret", c.AppSecret)
	values.Set("redirect_uri", c.RedirectURI)
	values.Set("grant_type", "authorization_code")

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, okTokenURL, strings.NewReader(values.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

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
		return nil, fmt.Errorf("ok token: HTTP %d: %s", resp.StatusCode, string(body))
	}

	var out OKTokenResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	if out.Error != "" {
		return nil, fmt.Errorf("ok token: %s — %s", out.Error, out.ErrorDesc)
	}
	if out.AccessToken == "" {
		return nil, fmt.Errorf("ok token: empty access_token")
	}
	return &out, nil
}

func (c *OKClient) ListManagedGroups(ctx context.Context, accessToken string) ([]OKGroup, error) {
	sig := okSign(accessToken, c.AppSecret, map[string]string{
		"method":       "group.getUserGroupsV2",
		"access_token": accessToken,
		"statuses":     "ADMIN,MODERATOR",
	})
	values := url.Values{}
	values.Set("method", "group.getUserGroupsV2")
	values.Set("access_token", accessToken)
	values.Set("statuses", "ADMIN,MODERATOR")
	values.Set("sig", sig)
	values.Set("application_key", c.AppID)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, okAPIBase+"?"+values.Encode(), nil)
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
		Groups []OKGroup `json:"groups"`
		Error  *struct {
			ErrorMsg string `json:"error_msg"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	if parsed.Error != nil {
		return nil, fmt.Errorf("ok group.getUserGroupsV2: %s", parsed.Error.ErrorMsg)
	}
	return parsed.Groups, nil
}

func okSign(accessToken, secret string, params map[string]string) string {
	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var b strings.Builder
	for _, k := range keys {
		b.WriteString(k)
		b.WriteString("=")
		b.WriteString(params[k])
	}
	sessionSecret := md5Sum(accessToken + secret)
	return md5Sum(b.String() + sessionSecret)
}

func md5Sum(s string) string {
	h := md5.Sum([]byte(s))
	return hex.EncodeToString(h[:])
}

func (c *OKClient) http() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return DefaultVKHTTPClient()
}

func OKGroupExternalID(groupID string) string {
	return strings.TrimSpace(groupID)
}

func ParseOKGroupID(externalID string) (int64, error) {
	return strconv.ParseInt(strings.TrimSpace(externalID), 10, 64)
}
