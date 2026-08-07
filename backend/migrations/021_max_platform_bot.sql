-- +goose Up
ALTER TABLE channels
    ADD COLUMN IF NOT EXISTS max_post_mode VARCHAR(16) NOT NULL DEFAULT 'own';

ALTER TABLE social_provider_settings
    ADD COLUMN IF NOT EXISTS platform_bot_token_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS platform_bot_username TEXT;

-- +goose Down
ALTER TABLE channels DROP COLUMN IF EXISTS max_post_mode;
ALTER TABLE social_provider_settings DROP COLUMN IF EXISTS platform_bot_token_encrypted;
ALTER TABLE social_provider_settings DROP COLUMN IF EXISTS platform_bot_username;
