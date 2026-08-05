package oauth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

const vkAuthURL = "https://id.vk.ru/authorize"
const vkTokenURL = "https://id.vk.ru/oauth2/auth"
const vkUserInfoURL = "https://id.vk.ru/oauth2/user_info"

type VKClient struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
	HTTP         *http.Client
}

type VKTokenResponse struct {
	AccessToken string `json:"access_token"`
	UserID      int64  `json:"user_id"`
	State       string `json:"state"`
	Error       string `json:"error"`
	ErrorDesc   string `json:"error_description"`
}

type VKUserInfo struct {
	UserID    int64  `json:"user_id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Avatar    string `json:"avatar"`
	Email     string `json:"email"`
}

type VKProfile struct {
	UserID      string
	DisplayName string
	AvatarURL   string
	Email       string
}

func (c *VKClient) AuthorizeURL(state, codeChallenge, redirectURI string) string {
	values := url.Values{}
	values.Set("response_type", "code")
	values.Set("client_id", c.ClientID)
	values.Set("redirect_uri", redirectURI)
	values.Set("state", state)
	values.Set("code_challenge", codeChallenge)
	values.Set("code_challenge_method", "S256")
	values.Set("scope", "email")
	return vkAuthURL + "?" + values.Encode()
}

func (c *VKClient) ExchangeCode(
	ctx context.Context,
	code, codeVerifier, deviceID, state, redirectURI string,
) (*VKTokenResponse, error) {
	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("code_verifier", codeVerifier)
	form.Set("redirect_uri", redirectURI)
	form.Set("client_id", c.ClientID)
	form.Set("device_id", deviceID)
	form.Set("state", state)
	if c.ClientSecret != "" {
		form.Set("client_secret", c.ClientSecret)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, vkTokenURL, strings.NewReader(form.Encode()))
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
		return nil, fmt.Errorf("vk token exchange: %s", string(body))
	}

	var out VKTokenResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	if out.Error != "" {
		return nil, fmt.Errorf("vk oauth: %s — %s", out.Error, out.ErrorDesc)
	}
	return &out, nil
}

func (c *VKClient) FetchUserInfo(ctx context.Context, accessToken string) (*VKProfile, error) {
	form := url.Values{}
	form.Set("client_id", c.ClientID)
	form.Set("access_token", accessToken)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, vkUserInfoURL, strings.NewReader(form.Encode()))
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
		return nil, fmt.Errorf("vk user_info: %s", string(body))
	}

	var parsed struct {
		User VKUserInfo `json:"user"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}

	name := strings.TrimSpace(strings.Join([]string{parsed.User.FirstName, parsed.User.LastName}, " "))
	return &VKProfile{
		UserID:      fmt.Sprintf("%d", parsed.User.UserID),
		DisplayName: name,
		AvatarURL:   parsed.User.Avatar,
		Email:       strings.TrimSpace(parsed.User.Email),
	}, nil
}

func (c *VKClient) http() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return http.DefaultClient
}
