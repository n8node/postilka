package model

import (
	"regexp"
	"strings"
	"time"
)

var yandexCloudFolderIDPattern = regexp.MustCompile(`^b1[a-z0-9]{17,25}$`)

// YandexModelPricing — admin cost in RUB per 1000 tokens for a specific model.
type YandexModelPricing struct {
	InputPer1K  float64 `json:"input_per_1k"`
	OutputPer1K float64 `json:"output_per_1k"`
	Currency    string  `json:"currency"`
}

// YandexGptStoredConfig — persisted singleton config (includes encrypted key).
type YandexGptStoredConfig struct {
	APIBaseURL      string                        `json:"api_base_url"`
	APIKeyEncrypted string                        `json:"api_key_encrypted"`
	FolderID        string                        `json:"folder_id"`
	ModelDefault    string                        `json:"model_default"`
	ModelsCache     []string                      `json:"models_cache"`
	ModelPricing    map[string]YandexModelPricing `json:"model_pricing"`
	// TaskModels maps task keys (caption, hashtags, …) to model URIs; empty uses ModelDefault.
	TaskModels map[string]string `json:"task_models"`
}

type YandexGptConfigRecord struct {
	Config    YandexGptStoredConfig `json:"config"`
	UpdatedAt time.Time             `json:"updated_at"`
}

type YandexGptAdminView struct {
	APIBaseURL   string                        `json:"api_base_url"`
	APIKeySet    bool                          `json:"api_key_set"`
	APIKeyHint   string                        `json:"api_key_hint,omitempty"`
	FolderID     string                        `json:"folder_id"`
	FolderHint   string                        `json:"folder_hint,omitempty"`
	ModelDefault string                        `json:"model_default"`
	Models       []string                      `json:"models"`
	ModelPricing map[string]YandexModelPricing `json:"model_pricing"`
	TaskModels   map[string]string             `json:"task_models"`
	UpdatedAt    time.Time                     `json:"updated_at"`
}

type YandexGptAdminUpdateRequest struct {
	APIBaseURL   string                        `json:"api_base_url"`
	APIKey       string                        `json:"api_key,omitempty"`
	FolderID     string                        `json:"folder_id"`
	ModelDefault string                        `json:"model_default"`
	ModelPricing map[string]YandexModelPricing `json:"model_pricing,omitempty"`
	TaskModels   map[string]string             `json:"task_models,omitempty"`
}

type YandexGptTestRequest struct {
	APIKey   string `json:"api_key,omitempty"`
	FolderID string `json:"folder_id,omitempty"`
}

type YandexGptTestResult struct {
	OK      bool     `json:"ok"`
	Message string   `json:"message"`
	Models  []string `json:"models,omitempty"`
}

func DefaultYandexGptConfig() YandexGptStoredConfig {
	return YandexGptStoredConfig{
		APIBaseURL:   "https://llm.api.cloud.yandex.net/v1",
		ModelsCache:  []string{},
		ModelPricing: map[string]YandexModelPricing{},
		TaskModels:   map[string]string{},
	}
}

func IsValidYandexCloudFolderID(id string) bool {
	return yandexCloudFolderIDPattern.MatchString(strings.TrimSpace(id))
}

func MaskAPIKey(key string) string {
	key = strings.TrimSpace(key)
	if len(key) <= 8 {
		if key == "" {
			return ""
		}
		return "••••"
	}
	return key[:4] + "…" + key[len(key)-4:]
}

func MaskFolderID(id string) string {
	id = strings.TrimSpace(id)
	if len(id) <= 6 {
		if id == "" {
			return ""
		}
		return "••••"
	}
	return id[:3] + "…" + id[len(id)-3:]
}
