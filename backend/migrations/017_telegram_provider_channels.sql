-- +goose Up
CREATE TABLE telegram_provider_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO telegram_provider_settings (id, config) VALUES (1, '{
  "enabled": true,
  "proxy_enabled": false,
  "proxy_active_url": "",
  "proxy_auto_failover": true,
  "proxy_urls": [],
  "connect_help_text": "1. Создайте бота через @BotFather и скопируйте токен.\n2. Добавьте бота администратором в канал или группу с правом публикации.\n3. Вставьте токен в Postilka и нажмите «Найти чаты».\n4. Если список пуст — добавьте бота в канал и нажмите «Обновить»."
}'::jsonb);

CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    chat_id VARCHAR(64) NOT NULL,
    chat_type VARCHAR(32) NOT NULL DEFAULT '',
    bot_username VARCHAR(128) NOT NULL DEFAULT '',
    bot_token_encrypted TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT channels_provider_check CHECK (provider IN ('telegram')),
    CONSTRAINT channels_status_check CHECK (status IN ('active', 'needs_reconnect', 'disabled')),
    CONSTRAINT channels_workspace_provider_chat_unique UNIQUE (workspace_id, provider, chat_id)
);

CREATE INDEX idx_channels_workspace_id ON channels (workspace_id);
CREATE INDEX idx_channels_workspace_status ON channels (workspace_id, status);

-- +goose Down
DROP TABLE IF EXISTS channels;
DROP TABLE IF EXISTS telegram_provider_settings;
