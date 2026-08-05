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

	PublicAppURL string `env:"PUBLIC_APP_URL" envDefault:"http://localhost/app"`
	Domain       string `env:"DOMAIN" envDefault:"localhost"`

	VKClientID     string `env:"VK_CLIENT_ID"`
	VKClientSecret string `env:"VK_CLIENT_SECRET"`

	MAXBotToken      string `env:"MAX_BOT_TOKEN"`
	MAXBotUsername   string `env:"MAX_BOT_USERNAME"`
	MAXWebhookSecret string `env:"MAX_WEBHOOK_SECRET"`

	WorkerPublishConcurrency int `env:"WORKER_PUBLISH_CONCURRENCY" envDefault:"3"`
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
