package config

import (
	"fmt"
	"strings"

	"github.com/caarlos0/env/v11"
)

const Version = "0.1.0-scaffold"

type Config struct {
	ServerPort  string `env:"SERVER_PORT" envDefault:"8080"`
	Environment string `env:"ENVIRONMENT" envDefault:"development"`
	LogLevel    string `env:"LOG_LEVEL" envDefault:"info"`

	DatabaseURL string `env:"DATABASE_URL,required"`

	JWTSecret  string `env:"JWT_SECRET,required"`
	APIKeySalt string `env:"API_KEY_SALT,required"`
	// Optional; falls back to JWT_SECRET for encrypting channel bot tokens at rest.
	EncryptionKey string `env:"ENCRYPTION_KEY"`

	PublicAppURL string `env:"PUBLIC_APP_URL" envDefault:"http://localhost/app"`
	Domain       string `env:"DOMAIN" envDefault:"localhost"`
	LinkBaseURL  string `env:"LINK_BASE_URL" envDefault:"https://postilka.ru/go"`

	WorkerPublishConcurrency int `env:"WORKER_PUBLISH_CONCURRENCY" envDefault:"3"`

	// Optional local hop for Telegram Bot API (Docker: host.docker.internal:8889 → gost → upstream).
	TelegramLocalProxy string `env:"TELEGRAM_LOCAL_PROXY"`
	// Optional local hop for YouTube / Google APIs (Docker: host.docker.internal:8890 → gost → upstream).
	YouTubeLocalProxy string `env:"YOUTUBE_LOCAL_PROXY"`

	YandexGPTAPIKey   string `env:"YANDEX_GPT_API_KEY"`
	YandexGPTFolderID string `env:"YANDEX_GPT_FOLDER_ID"`
	YandexGPTBaseURL  string `env:"YANDEX_GPT_BASE_URL" envDefault:"https://llm.api.cloud.yandex.net/v1"`
	KIEAPIKey         string `env:"KIE_API_KEY"`
	KIEVideoAPIKey    string `env:"KIE_VIDEO_API_KEY"`
}

func Load() (*Config, error) {
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("parse env: %w", err)
	}
	return cfg, nil
}

func (c *Config) Addr() string {
	return ":" + c.ServerPort
}

func (c *Config) IsProduction() bool {
	return c.Environment == "production"
}

func (c *Config) VKOAuthRedirectURI() string {
	return strings.TrimSuffix(c.PublicAppURL, "/") + "/api/v1/auth/oauth/vk/callback"
}

func (c *Config) MAXOAuthWebhookURL() string {
	return strings.TrimSuffix(c.PublicAppURL, "/") + "/api/v1/auth/oauth/max/webhook"
}

func (c *Config) TelegramBusinessWebhookURL(registrationID string) string {
	return c.PublicAppURLNormalized() + "/api/v1/webhooks/telegram/business/" + registrationID
}

func (c *Config) PublicAppURLNormalized() string {
	return strings.TrimSuffix(c.PublicAppURL, "/")
}

func (c *Config) ChannelOAuthRedirectURI(provider string) string {
	return c.PublicAppURLNormalized() + "/api/v1/channels/oauth/" + provider + "/callback"
}
