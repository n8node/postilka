package service

import (
	"testing"
)

func TestParseHTTPProxyURLPercentInPassword(t *testing.T) {
	raw := "http://root:ryO3N%OkP7%G@5.35.83.120:3128"
	u, err := parseHTTPProxyURL(raw)
	if err != nil {
		t.Fatalf("parseHTTPProxyURL: %v", err)
	}
	if u.Host != "5.35.83.120:3128" {
		t.Fatalf("host = %q", u.Host)
	}
	user := u.User.Username()
	pass, ok := u.User.Password()
	if !ok || user != "root" || pass != "ryO3N%OkP7%G" {
		t.Fatalf("credentials = %q / %q (ok=%v)", user, pass, ok)
	}
}

func TestParseHTTPProxyURLWithoutAuth(t *testing.T) {
	u, err := parseHTTPProxyURL("http://127.0.0.1:3128")
	if err != nil {
		t.Fatal(err)
	}
	if u.Host != "127.0.0.1:3128" || u.User != nil {
		t.Fatalf("unexpected url: %+v", u)
	}
}

func TestHTTPClientForProxyPercentInPassword(t *testing.T) {
	_, err := httpClientForProxy(nil, "http://root:ryO3N%OkP7%G@5.35.83.120:3128")
	if err != nil {
		t.Fatalf("httpClientForProxy: %v", err)
	}
}

func TestTelegramOutboundProxiesKeepsLocalHopWhenAdminProxyOff(t *testing.T) {
	got := telegramOutboundProxies("http://127.0.0.1:8889", false, "http://unused:3128", []string{"http://unused:3128"})
	if len(got) != 1 || got[0] != "http://127.0.0.1:8889" {
		t.Fatalf("got %v", got)
	}
}

func TestBuildProxyChainPrefersLocalHopThenAdminURLs(t *testing.T) {
	got := buildProxyChain(
		"http://host.docker.internal:8889",
		"http://root:pass@5.35.83.120:3128",
		[]string{"http://root:pass@5.35.83.120:3128", "http://backup:3128"},
	)
	want := []string{
		"http://host.docker.internal:8889",
		"http://root:pass@5.35.83.120:3128",
		"http://backup:3128",
	}
	if len(got) != len(want) {
		t.Fatalf("got %v want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("got %v want %v", got, want)
		}
	}
}
