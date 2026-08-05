package oauth

import (
	"encoding/json"
	"strings"
)

type VKAPIError struct {
	Reason  string
	Details string
}

func (e *VKAPIError) Error() string {
	if e.Details != "" {
		return e.Reason + ": " + e.Details
	}
	return e.Reason
}

func ClassifyVKAPIFailure(statusCode int, body string) *VKAPIError {
	body = strings.TrimSpace(body)
	lower := strings.ToLower(body)

	var parsed struct {
		Error       string `json:"error"`
		ErrorDesc   string `json:"error_description"`
		Description string `json:"description"`
	}
	_ = json.Unmarshal([]byte(body), &parsed)

	details := strings.TrimSpace(parsed.ErrorDesc)
	if details == "" {
		details = strings.TrimSpace(parsed.Description)
	}
	if details == "" && body != "" && len(body) < 240 {
		details = body
	}

	reason := "oauth_failed"
	switch {
	case strings.Contains(lower, "redirect_uri"):
		reason = "redirect_uri"
	case strings.Contains(lower, "service_token"), strings.Contains(lower, "invalid_client"):
		reason = "invalid_token"
	case strings.Contains(lower, "ip"), strings.Contains(lower, "address"):
		reason = "ip_denied"
	case strings.Contains(lower, "code_verifier"), strings.Contains(lower, "pkce"):
		reason = "pkce"
	case strings.Contains(lower, "expired"), strings.Contains(lower, "invalid_grant"):
		reason = "code_expired"
	case statusCode == 403:
		reason = "ip_denied"
	}

	return &VKAPIError{Reason: reason, Details: details}
}
