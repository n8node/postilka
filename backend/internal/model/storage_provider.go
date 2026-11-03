package model

import "time"

type StorageProvider struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Endpoint  string    `json:"endpoint"`
	Bucket    string    `json:"bucket"`
	Region    string    `json:"region"`
	AccessKey string    `json:"access_key"`
	SecretKey string    `json:"secret_key"`
	UseSSL    bool      `json:"use_ssl"`
	PathStyle bool      `json:"path_style"`
	Enabled   bool      `json:"enabled"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type StorageProviderAdminView struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Endpoint      string    `json:"endpoint"`
	Bucket        string    `json:"bucket"`
	Region        string    `json:"region"`
	AccessKey     string    `json:"access_key"`
	SecretKeySet  bool      `json:"secret_key_set"`
	SecretKeyHint string    `json:"secret_key_hint,omitempty"`
	UseSSL        bool      `json:"use_ssl"`
	PathStyle     bool      `json:"path_style"`
	Enabled       bool      `json:"enabled"`
	CorsOrigins   []string  `json:"cors_origins"`
	CorsXML       string    `json:"cors_xml"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type StorageProviderUpdateRequest struct {
	Name      string `json:"name"`
	Endpoint  string `json:"endpoint"`
	Bucket    string `json:"bucket"`
	Region    string `json:"region"`
	AccessKey string `json:"access_key"`
	SecretKey string `json:"secret_key,omitempty"`
	UseSSL    bool   `json:"use_ssl"`
	PathStyle bool   `json:"path_style"`
	Enabled   bool   `json:"enabled"`
}
