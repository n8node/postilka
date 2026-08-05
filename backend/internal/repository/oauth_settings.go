package repository

import (
	"context"
	"strings"
)

const (
	SettingVKClientID       = "auth.vk.client_id"
	SettingVKClientSecret   = "auth.vk.client_secret"
	SettingMAXBotUsername   = "auth.max.bot_username"
	SettingMAXBotToken      = "auth.max.bot_token"
	SettingMAXWebhookSecret = "auth.max.webhook_secret"
)

type OAuthSettingsRepository struct {
	settings *SettingsRepository
}

func NewOAuthSettingsRepository(settings *SettingsRepository) *OAuthSettingsRepository {
	return &OAuthSettingsRepository{settings: settings}
}

type StoredVKLoginConfig struct {
	ClientID     string
	ClientSecret string
}

type StoredMAXLoginConfig struct {
	BotUsername   string
	BotToken      string
	WebhookSecret string
}

func (r *OAuthSettingsRepository) GetVK(ctx context.Context) (StoredVKLoginConfig, error) {
	clientID, err := r.settings.Get(ctx, SettingVKClientID)
	if err != nil && err != ErrNotFound {
		return StoredVKLoginConfig{}, err
	}
	secret, err := r.settings.Get(ctx, SettingVKClientSecret)
	if err != nil && err != ErrNotFound {
		return StoredVKLoginConfig{}, err
	}
	return StoredVKLoginConfig{
		ClientID:     strings.TrimSpace(clientID),
		ClientSecret: strings.TrimSpace(secret),
	}, nil
}

func (r *OAuthSettingsRepository) SaveVK(ctx context.Context, clientID, clientSecret string, keepSecret bool) error {
	clientID = strings.TrimSpace(clientID)
	if clientID != "" {
		if err := r.settings.Set(ctx, SettingVKClientID, clientID); err != nil {
			return err
		}
	}
	if keepSecret {
		return nil
	}
	secret := strings.TrimSpace(clientSecret)
	if secret == "" {
		return nil
	}
	return r.settings.Set(ctx, SettingVKClientSecret, secret)
}

func (r *OAuthSettingsRepository) GetMAX(ctx context.Context) (StoredMAXLoginConfig, error) {
	username, err := r.settings.Get(ctx, SettingMAXBotUsername)
	if err != nil && err != ErrNotFound {
		return StoredMAXLoginConfig{}, err
	}
	token, err := r.settings.Get(ctx, SettingMAXBotToken)
	if err != nil && err != ErrNotFound {
		return StoredMAXLoginConfig{}, err
	}
	secret, err := r.settings.Get(ctx, SettingMAXWebhookSecret)
	if err != nil && err != ErrNotFound {
		return StoredMAXLoginConfig{}, err
	}
	return StoredMAXLoginConfig{
		BotUsername:   strings.TrimSpace(username),
		BotToken:      strings.TrimSpace(token),
		WebhookSecret: strings.TrimSpace(secret),
	}, nil
}

func (r *OAuthSettingsRepository) SaveMAX(
	ctx context.Context,
	botUsername, botToken, webhookSecret string,
	keepToken, keepWebhookSecret bool,
) error {
	botUsername = strings.TrimSpace(botUsername)
	if botUsername != "" {
		if err := r.settings.Set(ctx, SettingMAXBotUsername, botUsername); err != nil {
			return err
		}
	}
	if !keepToken {
		token := strings.TrimSpace(botToken)
		if token != "" {
			if err := r.settings.Set(ctx, SettingMAXBotToken, token); err != nil {
				return err
			}
		}
	}
	if !keepWebhookSecret {
		secret := strings.TrimSpace(webhookSecret)
		if secret != "" {
			if err := r.settings.Set(ctx, SettingMAXWebhookSecret, secret); err != nil {
				return err
			}
		}
	}
	return nil
}

func (r *StoredVKLoginConfig) Configured() bool {
	return r.ClientID != "" && r.ClientSecret != ""
}

func (r *StoredMAXLoginConfig) Configured() bool {
	return r.BotUsername != "" && r.BotToken != ""
}
