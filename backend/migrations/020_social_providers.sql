-- +goose Up
CREATE TABLE social_provider_settings (
    provider VARCHAR(32) PRIMARY KEY,
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT social_provider_settings_provider_check CHECK (
        provider IN ('vk', 'ok', 'max', 'rutube', 'dzen')
    )
);

INSERT INTO social_provider_settings (provider, config) VALUES
('vk', '{
  "enabled": false,
  "oauth_client_id": "",
  "oauth_client_secret": "",
  "connect_help_text": "1. Войдите через VK под аккаунтом администратора сообщества.\n2. Выберите сообщества, где вы администратор.\n3. Подтвердите права на публикацию.",
  "connect_help_url": "https://postilka.ru/docs/vk",
  "docs_url": "https://postilka.ru/docs",
  "support_telegram_username": "postilka_support",
  "support_email": "support@postilka.ru",
  "support_hours_text": "пн–вс 10:00–19:00 (МСК)"
}'::jsonb),
('ok', '{
  "enabled": false,
  "oauth_client_id": "",
  "oauth_client_secret": "",
  "connect_help_text": "1. Войдите через Одноклассники.\n2. Выберите группу, где вы администратор.\n3. Подтвердите подключение.",
  "connect_help_url": "https://postilka.ru/docs/ok",
  "docs_url": "https://postilka.ru/docs",
  "support_telegram_username": "postilka_support",
  "support_email": "support@postilka.ru",
  "support_hours_text": "пн–вс 10:00–19:00 (МСК)"
}'::jsonb),
('max', '{
  "enabled": false,
  "oauth_client_id": "",
  "oauth_client_secret": "",
  "connect_help_text": "1. Создайте бота в MAX и скопируйте токен.\n2. Добавьте бота в канал с правом публикации.\n3. Вставьте токен и укажите chat_id канала.",
  "connect_help_url": "https://postilka.ru/docs/max",
  "docs_url": "https://postilka.ru/docs",
  "support_telegram_username": "postilka_support",
  "support_email": "support@postilka.ru",
  "support_hours_text": "пн–вс 10:00–19:00 (МСК)"
}'::jsonb),
('rutube', '{
  "enabled": false,
  "oauth_client_id": "",
  "oauth_client_secret": "",
  "connect_help_text": "1. Войдите через Rutube.\n2. Выберите канал для публикации.\n3. Подтвердите права.",
  "connect_help_url": "https://postilka.ru/docs/rutube",
  "docs_url": "https://postilka.ru/docs",
  "support_telegram_username": "postilka_support",
  "support_email": "support@postilka.ru",
  "support_hours_text": "пн–вс 10:00–19:00 (МСК)"
}'::jsonb),
('dzen', '{
  "enabled": false,
  "oauth_client_id": "",
  "oauth_client_secret": "",
  "connect_help_text": "1. Войдите через Яндекс.\n2. Выберите канал Дзен.\n3. Подтвердите подключение.",
  "connect_help_url": "https://postilka.ru/docs/dzen",
  "docs_url": "https://postilka.ru/docs",
  "support_telegram_username": "postilka_support",
  "support_email": "support@postilka.ru",
  "support_hours_text": "пн–вс 10:00–19:00 (МСК)"
}'::jsonb);

CREATE TABLE channel_oauth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    state_token VARCHAR(128) NOT NULL UNIQUE,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT channel_oauth_sessions_provider_check CHECK (
        provider IN ('vk', 'ok', 'rutube', 'dzen')
    )
);

CREATE INDEX idx_channel_oauth_sessions_state ON channel_oauth_sessions (state_token);
CREATE INDEX idx_channel_oauth_sessions_expires ON channel_oauth_sessions (expires_at);

ALTER TABLE channels DROP CONSTRAINT channels_provider_check;
ALTER TABLE channels ADD CONSTRAINT channels_provider_check CHECK (
    provider IN ('telegram', 'vk', 'ok', 'max', 'rutube', 'dzen')
);

ALTER TABLE channels ALTER COLUMN bot_token_encrypted DROP NOT NULL;

-- +goose Down
ALTER TABLE channels ALTER COLUMN bot_token_encrypted SET NOT NULL;
ALTER TABLE channels DROP CONSTRAINT channels_provider_check;
ALTER TABLE channels ADD CONSTRAINT channels_provider_check CHECK (provider IN ('telegram'));
DROP TABLE IF EXISTS channel_oauth_sessions;
DROP TABLE IF EXISTS social_provider_settings;
