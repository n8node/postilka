package model

import "time"

type YouTubeProviderSettings struct {
	ProxyEnabled      bool     `json:"proxy_enabled"`
	ProxyActiveURL    string   `json:"proxy_active_url"`
	ProxyAutoFailover bool     `json:"proxy_auto_failover"`
	ProxyURLs         []string `json:"proxy_urls"`
}

type YouTubeProviderSettingsRecord struct {
	Config    YouTubeProviderSettings `json:"config"`
	UpdatedAt time.Time               `json:"updated_at"`
}

type YouTubeProviderAdminView struct {
	Settings  YouTubeProviderSettings `json:"settings"`
	UpdatedAt time.Time               `json:"updated_at"`
}

func DefaultYouTubeProviderSettings() YouTubeProviderSettings {
	return YouTubeProviderSettings{
		ProxyEnabled:      false,
		ProxyAutoFailover: true,
		ProxyURLs:         []string{},
	}
}
