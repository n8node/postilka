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

const (
	yandexMetrikaAuthURL  = "https://oauth.yandex.ru/authorize"
	yandexMetrikaTokenURL = "https://oauth.yandex.ru/token"
	yandexMetrikaAPIBase  = "https://api-metrika.yandex.net"
	MetrikaOAuthScope     = "metrika:read"
)

type MetrikaClient struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
	HTTP         *http.Client
}

type MetrikaTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
	Error        string `json:"error"`
	ErrorDesc    string `json:"error_description"`
}

type MetrikaUTMStats struct {
	Visits int
	Users  int
	Goals  int
}

func (c *MetrikaClient) AuthorizeURL(state string) string {
	values := url.Values{}
	values.Set("response_type", "code")
	values.Set("client_id", c.ClientID)
	values.Set("redirect_uri", c.RedirectURI)
	values.Set("state", state)
	values.Set("scope", MetrikaOAuthScope)
	return yandexMetrikaAuthURL + "?" + values.Encode()
}

func (c *MetrikaClient) ExchangeCode(ctx context.Context, code string) (*MetrikaTokenResponse, error) {
	return c.requestToken(ctx, url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"client_id":     {c.ClientID},
		"client_secret": {c.ClientSecret},
	})
}

func (c *MetrikaClient) RefreshToken(ctx context.Context, refreshToken string) (*MetrikaTokenResponse, error) {
	refreshToken = strings.TrimSpace(refreshToken)
	if refreshToken == "" {
		return nil, fmt.Errorf("metrika refresh: empty refresh_token")
	}
	return c.requestToken(ctx, url.Values{
		"grant_type":    {"refresh_token"},
		"refresh_token": {refreshToken},
		"client_id":     {c.ClientID},
		"client_secret": {c.ClientSecret},
	})
}

func (c *MetrikaClient) requestToken(ctx context.Context, form url.Values) (*MetrikaTokenResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, yandexMetrikaTokenURL, strings.NewReader(form.Encode()))
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
		return nil, fmt.Errorf("metrika token: HTTP %d: %s", resp.StatusCode, string(body))
	}

	var out MetrikaTokenResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	if out.Error != "" {
		return nil, fmt.Errorf("metrika token: %s — %s", out.Error, out.ErrorDesc)
	}
	if out.AccessToken == "" {
		return nil, fmt.Errorf("metrika token: empty access_token")
	}
	return &out, nil
}

func (c *MetrikaClient) GetUTMCampaignStats(
	ctx context.Context,
	accessToken string,
	counterID int64,
	campaign string,
	dateFrom, dateTo time.Time,
) (*MetrikaUTMStats, error) {
	campaign = strings.TrimSpace(campaign)
	if campaign == "" {
		return &MetrikaUTMStats{}, nil
	}

	values := url.Values{}
	values.Set("ids", fmt.Sprintf("%d", counterID))
	values.Set("metrics", "ym:s:visits,ym:s:users,ym:s:goalReachesAny")
	values.Set("dimensions", "ym:s:lastUTMCampaign")
	values.Set("date1", dateFrom.Format("2006-01-02"))
	values.Set("date2", dateTo.Format("2006-01-02"))
	values.Set("limit", "100")
	values.Set("filters", fmt.Sprintf("ym:s:lastUTMCampaign=='%s'", escapeMetrikaFilterValue(campaign)))

	endpoint := yandexMetrikaAPIBase + "/stat/v1/data?" + values.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "OAuth "+accessToken)

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
		return nil, fmt.Errorf("metrika stat: HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var parsed struct {
		Data []struct {
			Metrics []float64 `json:"metrics"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	out := &MetrikaUTMStats{}
	for _, row := range parsed.Data {
		if len(row.Metrics) > 0 {
			out.Visits += int(row.Metrics[0])
		}
		if len(row.Metrics) > 1 {
			out.Users += int(row.Metrics[1])
		}
		if len(row.Metrics) > 2 {
			out.Goals += int(row.Metrics[2])
		}
	}
	return out, nil
}

func (c *MetrikaClient) VerifyCounterAccess(ctx context.Context, accessToken string, counterID int64) error {
	endpoint := fmt.Sprintf("%s/management/v1/counter/%d", yandexMetrikaAPIBase, counterID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "OAuth "+accessToken)

	resp, err := c.http().Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return fmt.Errorf("metrika counter: HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return nil
}

func escapeMetrikaFilterValue(value string) string {
	return strings.ReplaceAll(value, "'", "\\'")
}

func (c *MetrikaClient) http() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return DefaultVKHTTPClient()
}
