package model

import "time"

type InstagramProviderSettings struct {
	ProxyEnabled      bool     `json:"proxy_enabled"`
	ProxyActiveURL    string   `json:"proxy_active_url"`
	ProxyAutoFailover bool     `json:"proxy_auto_failover"`
	ProxyURLs         []string `json:"proxy_urls"`
}

type InstagramProviderSettingsRecord struct {
	Config    InstagramProviderSettings `json:"config"`
	UpdatedAt time.Time                 `json:"updated_at"`
}

type InstagramProviderAdminView struct {
	Settings  InstagramProviderSettings `json:"settings"`
	UpdatedAt time.Time                 `json:"updated_at"`
}

func DefaultInstagramProviderSettings() InstagramProviderSettings {
	return InstagramProviderSettings{ProxyAutoFailover: true, ProxyURLs: []string{}}
}
