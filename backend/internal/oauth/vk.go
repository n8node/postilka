package oauth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const vkAuthURL = "https://id.vk.ru/authorize"
const vkTokenURL = "https://id.vk.ru/oauth2/auth"
const vkUserInfoURL = "https://id.vk.ru/oauth2/user_info"
const vkIDScope = "email vkid.personal_info"

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
	Email       string `json:"email"`
	Error       string `json:"error"`
	ErrorDesc   string `json:"error_description"`
}

type VKUserInfo struct {
	UserID    string `json:"user_id"`
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
	values.Set("scope", vkIDScope)
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
	if strings.TrimSpace(c.ClientSecret) != "" {
		form.Set("client_secret", strings.TrimSpace(c.ClientSecret))
	}

	var lastErr error
	for attempt := 0; attempt < 2; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(2 * time.Second):
			}
		}
		out, err := c.doTokenExchange(ctx, form)
		if err == nil {
			return out, nil
		}
		lastErr = err
		if !IsNetworkError(err) {
			return nil, err
		}
	}
	return nil, lastErr
}

func (c *VKClient) doTokenExchange(ctx context.Context, form url.Values) (*VKTokenResponse, error) {
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
		return nil, ClassifyVKAPIFailure(resp.StatusCode, string(body))
	}

	var out VKTokenResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, ClassifyVKAPIFailure(resp.StatusCode, string(body))
	}
	if out.Error != "" {
		return nil, ClassifyVKAPIFailure(resp.StatusCode, string(body))
	}
	if out.AccessToken == "" {
		return nil, ClassifyVKAPIFailure(resp.StatusCode, string(body))
	}
	return &out, nil
}

func (c *VKClient) FetchUserInfo(ctx context.Context, accessToken string) (*VKProfile, error) {
	form := url.Values{}
	form.Set("client_id", c.ClientID)
	form.Set("access_token", accessToken)

	var lastErr error
	for attempt := 0; attempt < 2; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(2 * time.Second):
			}
		}
		profile, err := c.doFetchUserInfo(ctx, form)
		if err == nil {
			return profile, nil
		}
		lastErr = err
		if !IsNetworkError(err) {
			return nil, err
		}
	}
	return nil, lastErr
}

func (c *VKClient) doFetchUserInfo(ctx context.Context, form url.Values) (*VKProfile, error) {
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
		return nil, ClassifyVKAPIFailure(resp.StatusCode, string(body))
	}

	var parsed struct {
		User VKUserInfo `json:"user"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}

	name := strings.TrimSpace(strings.Join([]string{parsed.User.FirstName, parsed.User.LastName}, " "))
	userID := strings.TrimSpace(parsed.User.UserID)
	if userID == "" {
		return nil, fmt.Errorf("vk user_info: empty user_id")
	}
	email := strings.TrimSpace(parsed.User.Email)
	return &VKProfile{
		UserID:      userID,
		DisplayName: name,
		AvatarURL:   parsed.User.Avatar,
		Email:       email,
	}, nil
}

func (c *VKClient) http() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return DefaultVKHTTPClient()
}

func ProfileFromToken(token *VKTokenResponse) *VKProfile {
	if token == nil {
		return nil
	}
	userID := ""
	if token.UserID > 0 {
		userID = fmt.Sprintf("%d", token.UserID)
	}
	if userID == "" {
		return nil
	}
	return &VKProfile{
		UserID: userID,
		Email:  strings.TrimSpace(token.Email),
	}
}
