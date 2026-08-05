package oauth

import (
	"encoding/json"
	"strings"
	"unicode/utf8"
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

func SanitizeOAuthDetail(msg string) string {
	msg = strings.TrimSpace(msg)
	msg = strings.ReplaceAll(msg, "\n", " ")
	msg = strings.ReplaceAll(msg, "\r", " ")
	if len(msg) > 180 {
		msg = msg[:180]
	}
	if !utf8.ValidString(msg) {
		return ""
	}
	return msg
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
	if details == "" && parsed.Error != "" {
		details = parsed.Error
	}
	if details == "" && body != "" && len(body) < 240 {
		details = body
	}

	reason := "oauth_failed"
	errCode := strings.ToLower(strings.TrimSpace(parsed.Error))
	switch errCode {
	case "invalid_client":
		reason = "invalid_token"
	case "invalid_grant":
		reason = "code_expired"
	case "unauthorized_client":
		reason = "ip_denied"
	case "access_denied":
		reason = "access_denied"
	case "invalid_request":
		if strings.Contains(lower, "redirect_uri") {
			reason = "redirect_uri"
		}
	}

	switch {
	case strings.Contains(lower, "redirect_uri"):
		reason = "redirect_uri"
	case strings.Contains(lower, "service_token"), strings.Contains(lower, "client_secret"):
		reason = "invalid_token"
	case strings.Contains(lower, "invalid_client"):
		reason = "invalid_token"
	case strings.Contains(lower, "ip"), strings.Contains(lower, "address"), strings.Contains(lower, "unauthorized"):
		reason = "ip_denied"
	case strings.Contains(lower, "code_verifier"), strings.Contains(lower, "pkce"):
		reason = "pkce"
	case strings.Contains(lower, "expired"), strings.Contains(lower, "invalid_grant"):
		reason = "code_expired"
	case statusCode == 403:
		reason = "ip_denied"
	}

	return &VKAPIError{Reason: reason, Details: SanitizeOAuthDetail(details)}
}
