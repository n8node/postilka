package oauth

import (
	"context"
	"net"
	"net/http"
	"strings"
	"time"
)

func DefaultVKHTTPClient() *http.Client {
	return &http.Client{
		Timeout: 60 * time.Second,
		Transport: &http.Transport{
			Proxy: http.ProxyFromEnvironment,
			DialContext: func(ctx context.Context, _, addr string) (net.Conn, error) {
				d := net.Dialer{
					Timeout:   20 * time.Second,
					KeepAlive: 30 * time.Second,
				}
				// Prefer IPv4 — broken IPv6 routes in Docker often cause TLS handshake timeouts.
				conn, err := d.DialContext(ctx, "tcp4", addr)
				if err == nil {
					return conn, nil
				}
				return d.DialContext(ctx, "tcp", addr)
			},
			TLSHandshakeTimeout:   30 * time.Second,
			ResponseHeaderTimeout: 30 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
			IdleConnTimeout:       90 * time.Second,
		},
	}
}

func IsNetworkError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "tls handshake timeout") ||
		strings.Contains(msg, "i/o timeout") ||
		strings.Contains(msg, "connection refused") ||
		strings.Contains(msg, "connection reset") ||
		strings.Contains(msg, "no such host") ||
		strings.Contains(msg, "network is unreachable")
}
