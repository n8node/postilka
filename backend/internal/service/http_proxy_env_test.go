package service

import (
	"net/http"
	"testing"
)

func TestDirectHTTPTransportIgnoresEnvironmentProxy(t *testing.T) {
	t.Setenv("HTTP_PROXY", "http://127.0.0.1:9999")
	t.Setenv("HTTPS_PROXY", "http://127.0.0.1:9999")

	tr := directHTTPTransport()
	req, err := http.NewRequest(http.MethodGet, "https://api.telegram.org/", nil)
	if err != nil {
		t.Fatal(err)
	}
	proxyURL, err := tr.Proxy(req)
	if err != nil {
		t.Fatal(err)
	}
	if proxyURL != nil {
		t.Fatalf("expected no env proxy, got %v", proxyURL)
	}
}
