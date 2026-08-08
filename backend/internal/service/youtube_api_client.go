package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type YouTubeAPIClient struct {
	providerSettings *YouTubeProviderSettingsService
	localProxy       string
	client           *http.Client
}

func NewYouTubeAPIClient(providerSettings *YouTubeProviderSettingsService, localProxy string) *YouTubeAPIClient {
	return &YouTubeAPIClient{
		providerSettings: providerSettings,
		localProxy:       strings.TrimSpace(localProxy),
		client: &http.Client{
			Timeout:   60 * time.Second,
			Transport: directHTTPTransport(),
		},
	}
}

func (c *YouTubeAPIClient) HTTPClient() *http.Client {
	return &http.Client{
		Timeout:   60 * time.Second,
		Transport: youtubeProxyTransport{client: c},
	}
}

type youtubeProxyTransport struct {
	client *YouTubeAPIClient
}

func (t youtubeProxyTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	var body []byte
	if req.Body != nil {
		var err error
		body, err = io.ReadAll(req.Body)
		req.Body.Close()
		if err != nil {
			return nil, err
		}
		req.Body = io.NopCloser(bytes.NewReader(body))
	}
	return t.client.doRequest(req.Context(), req.Method, req.URL.String(), req.Header.Clone(), body)
}

func (c *YouTubeAPIClient) doRequest(
	ctx context.Context,
	method string,
	endpoint string,
	headers http.Header,
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
		for key, values := range headers {
			for _, value := range values {
				req.Header.Add(key, value)
			}
		}
		return client.Do(req)
	}

	if c.providerSettings == nil {
		return makeRequest(c.client)
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
		lastErr = fmt.Errorf("proxy %s: %w", maskProxyURLForError(proxyURL), reqErr)
		if !cfg.ProxyAutoFailover || idx == len(proxies)-1 {
			return nil, lastErr
		}
	}
	if lastErr != nil {
		return nil, lastErr
	}
	return nil, errors.New("proxy request failed")
}
