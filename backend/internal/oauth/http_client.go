package oauth

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"
)

const vkDialPerIPTimeout = 8 * time.Second

func DefaultVKHTTPClient() *http.Client {
	return &http.Client{
		Timeout: 60 * time.Second,
		Transport: &http.Transport{
			Proxy:       http.ProxyFromEnvironment,
			DialContext: dialContextMultiIPv4,
			TLSHandshakeTimeout:   30 * time.Second,
			ResponseHeaderTimeout: 30 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
			IdleConnTimeout:       90 * time.Second,
		},
	}
}

// dialContextMultiIPv4 tries each resolved IPv4 address in turn.
// Docker DNS often returns id.vk.ru with a dead node first (95.213.56.1);
// the host resolver picks another order and works — see postilka prod incident 2026-08.
func dialContextMultiIPv4(ctx context.Context, _, addr string) (net.Conn, error) {
	host, port, err := net.SplitHostPort(addr)
	if err != nil {
		return nil, err
	}

	d := net.Dialer{
		Timeout:   vkDialPerIPTimeout,
		KeepAlive: 30 * time.Second,
	}

	if ip := net.ParseIP(host); ip != nil {
		return d.DialContext(ctx, "tcp4", addr)
	}

	ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil {
		return d.DialContext(ctx, "tcp4", addr)
	}

	var v4 []net.IPAddr
	for _, ip := range ips {
		if ip.IP.To4() != nil {
			v4 = append(v4, ip)
		}
	}
	if len(v4) == 0 {
		return d.DialContext(ctx, "tcp4", addr)
	}

	var lastErr error
	for _, ip := range v4 {
		target := net.JoinHostPort(ip.IP.String(), port)
		conn, err := d.DialContext(ctx, "tcp4", target)
		if err == nil {
			return conn, nil
		}
		lastErr = err
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
	}
	if lastErr != nil {
		return nil, lastErr
	}
	return nil, fmt.Errorf("no IPv4 addresses for %s", host)
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
