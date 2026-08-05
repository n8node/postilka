package oauth

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
)

type vkCallbackParams struct {
	Code     string `json:"code"`
	State    string `json:"state"`
	DeviceID string `json:"device_id"`
}

// CallbackParams reads code/state/device_id from query or VK ID `payload` param (same as DOC).
func CallbackParams(r *http.Request) (code, state, deviceID string, ok bool) {
	code = strings.TrimSpace(r.URL.Query().Get("code"))
	state = strings.TrimSpace(r.URL.Query().Get("state"))
	deviceID = strings.TrimSpace(r.URL.Query().Get("device_id"))
	if code != "" && state != "" && deviceID != "" {
		return code, state, deviceID, true
	}

	payload := strings.TrimSpace(r.URL.Query().Get("payload"))
	if payload == "" {
		return "", "", "", false
	}

	parsed := parseVKPayloadParam(payload)
	if parsed == nil || parsed.Code == "" || parsed.State == "" {
		return "", "", "", false
	}
	deviceID = strings.TrimSpace(parsed.DeviceID)
	if deviceID == "" {
		return "", "", "", false
	}
	return parsed.Code, parsed.State, deviceID, true
}

func parseVKPayloadParam(raw string) *vkCallbackParams {
	decoded, err := url.QueryUnescape(strings.ReplaceAll(raw, "+", " "))
	if err != nil {
		decoded = raw
	}
	if p := tryParseVKPayloadJSON(decoded); p != nil {
		return p
	}
	b64 := raw
	if pad := len(b64) % 4; pad != 0 {
		b64 += strings.Repeat("=", 4-pad)
	}
	b64 = strings.NewReplacer("-", "+", "_", "/").Replace(b64)
	data, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return nil
	}
	return tryParseVKPayloadJSON(string(data))
}

func tryParseVKPayloadJSON(s string) *vkCallbackParams {
	var p vkCallbackParams
	if err := json.Unmarshal([]byte(s), &p); err != nil {
		return nil
	}
	if p.Code == "" || p.State == "" {
		return nil
	}
	return &p
}
