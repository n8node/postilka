package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const workflowHTTPMaxBody = 1 << 20 // 1 MB

var errWorkflowHTTPBlocked = errors.New("URL не разрешён политикой безопасности")

func workflowHTTPClient(timeout time.Duration) *http.Client {
	if timeout <= 0 {
		timeout = 15 * time.Second
	}
	return &http.Client{
		Timeout: timeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return errors.New("слишком много редиректов")
			}
			if err := validateWorkflowHTTPURL(req.URL.String()); err != nil {
				return err
			}
			return nil
		},
	}
}

func validateWorkflowHTTPURL(rawURL string) error {
	u, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return fmt.Errorf("некорректный URL: %w", err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return errWorkflowHTTPBlocked
	}
	host := strings.TrimSpace(u.Hostname())
	if host == "" {
		return errWorkflowHTTPBlocked
	}
	lowerHost := strings.ToLower(host)
	if lowerHost == "localhost" || lowerHost == "metadata.google.internal" {
		return errWorkflowHTTPBlocked
	}
	if ip := net.ParseIP(host); ip != nil {
		if isPrivateOrReservedIP(ip) {
			return errWorkflowHTTPBlocked
		}
		return nil
	}
	return nil
}

func isPrivateOrReservedIP(ip net.IP) bool {
	privateRanges := []string{
		"127.0.0.0/8",
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"169.254.0.0/16",
		"0.0.0.0/8",
		"::1/128",
		"fc00::/7",
		"fe80::/10",
	}
	for _, cidr := range privateRanges {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			continue
		}
		if network.Contains(ip) {
			return true
		}
	}
	return false
}

func (s *WorkflowService) executeHTTPRequest(ctx context.Context, inputs map[string]interface{}) (map[string]interface{}, error) {
	method := strings.ToUpper(getString(inputs, "method", "GET"))
	rawURL := getString(inputs, "url", "")
	if rawURL == "" {
		return nil, errors.New("URL обязателен")
	}
	if err := validateWorkflowHTTPURL(rawURL); err != nil {
		return nil, err
	}

	timeoutSec := getInt(inputs, "timeoutSeconds", 15)
	if timeoutSec > 30 {
		timeoutSec = 30
	}
	client := workflowHTTPClient(time.Duration(timeoutSec) * time.Second)

	var bodyReader io.Reader
	bodyType := getString(inputs, "bodyType", "json")
	bodyRaw := getString(inputs, "body", "")
	if method != http.MethodGet && method != http.MethodHead && bodyRaw != "" {
		bodyReader = strings.NewReader(bodyRaw)
	} else if bodyVal, ok := inputs["body"]; ok && bodyVal != nil && method != http.MethodGet && method != http.MethodHead {
		switch bodyType {
		case "json":
			b, err := json.Marshal(bodyVal)
			if err != nil {
				return nil, fmt.Errorf("marshal body: %w", err)
			}
			bodyReader = bytes.NewReader(b)
		default:
			bodyReader = strings.NewReader(fmt.Sprintf("%v", bodyVal))
		}
	}

	req, err := http.NewRequestWithContext(ctx, method, rawURL, bodyReader)
	if err != nil {
		return nil, err
	}

	if headers, ok := inputs["headers"].(map[string]interface{}); ok {
		for k, v := range headers {
			req.Header.Set(k, fmt.Sprintf("%v", v))
		}
	} else if headersMap, ok := inputs["headers"].(map[string]string); ok {
		for k, v := range headersMap {
			req.Header.Set(k, v)
		}
	}
	if bodyReader != nil && req.Header.Get("Content-Type") == "" && bodyType == "json" {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("User-Agent", "Postilka-Workflow/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP запрос: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, workflowHTTPMaxBody))
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	responseFormat := getString(inputs, "responseFormat", "json")
	var parsed interface{}
	switch responseFormat {
	case "text":
		parsed = string(respBody)
	default:
		if len(respBody) == 0 {
			parsed = map[string]interface{}{}
		} else if json.Unmarshal(respBody, &parsed) != nil {
			parsed = string(respBody)
		}
	}

	headersFlat := make(map[string]string)
	for k, vals := range resp.Header {
		if len(vals) > 0 {
			headersFlat[k] = vals[0]
		}
	}

	outputs := map[string]interface{}{
		"status_code": resp.StatusCode,
		"body":        parsed,
		"headers":     headersFlat,
		"ok":          resp.StatusCode >= 200 && resp.StatusCode < 300,
	}

	if !outputs["ok"].(bool) && getBool(inputs, "failOnNon2xx", true) {
		return outputs, fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	return outputs, nil
}

func sanitizeHTTPInputsForLog(inputs map[string]interface{}) map[string]interface{} {
	out := make(map[string]interface{}, len(inputs))
	for k, v := range inputs {
		if strings.EqualFold(k, "headers") {
			if hm, ok := v.(map[string]interface{}); ok {
				safe := make(map[string]interface{}, len(hm))
				for hk, hv := range hm {
					if strings.Contains(strings.ToLower(hk), "authorization") {
						safe[hk] = "[redacted]"
					} else {
						safe[hk] = hv
					}
				}
				out[k] = safe
				continue
			}
		}
		out[k] = v
	}
	return out
}
