-- +goose Up
ALTER TABLE channels
    ADD COLUMN IF NOT EXISTS vk_oauth_mode VARCHAR(16) NOT NULL DEFAULT 'own';

UPDATE social_provider_settings
SET config = config || '{"platform_oauth_enabled": false}'::jsonb,
    updated_at = NOW()
WHERE provider = 'vk';

-- +goose Down
ALTER TABLE channels DROP COLUMN IF EXISTS vk_oauth_mode;
