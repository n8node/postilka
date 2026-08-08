-- +goose Up
CREATE TABLE youtube_provider_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO youtube_provider_settings (id, config) VALUES (1, '{
  "proxy_enabled": false,
  "proxy_active_url": "",
  "proxy_auto_failover": true,
  "proxy_urls": []
}'::jsonb);

ALTER TABLE social_provider_settings DROP CONSTRAINT IF EXISTS social_provider_settings_provider_check;
ALTER TABLE social_provider_settings ADD CONSTRAINT social_provider_settings_provider_check CHECK (
    provider IN ('vk', 'ok', 'max', 'rutube', 'dzen', 'youtube')
);

INSERT INTO social_provider_settings (provider, config) VALUES
('youtube', '{
  "enabled": false,
  "oauth_client_id": "",
  "oauth_client_secret": "",
  "connect_help_text": "1. В Google Cloud Console создайте OAuth Client (Web) и включите YouTube Data API v3.\n2. Redirect URI: https://postilka.ru/app/api/v1/channels/oauth/youtube/callback\n3. Войдите через Google под аккаунтом владельца YouTube-канала.\n4. Выберите канал для публикации.\n5. Для работы с РФ-сервера включите прокси в админке YouTube.",
  "connect_help_url": "https://postilka.ru/docs/youtube",
  "docs_url": "https://postilka.ru/docs",
  "support_telegram_username": "postilka_support",
  "support_email": "support@postilka.ru",
  "support_hours_text": "пн–вс 10:00–19:00 (МСК)"
}'::jsonb)
ON CONFLICT (provider) DO NOTHING;

ALTER TABLE channel_oauth_sessions DROP CONSTRAINT IF EXISTS channel_oauth_sessions_provider_check;
ALTER TABLE channel_oauth_sessions ADD CONSTRAINT channel_oauth_sessions_provider_check CHECK (
    provider IN ('vk', 'ok', 'rutube', 'dzen', 'youtube')
);

ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_provider_check;
ALTER TABLE channels ADD CONSTRAINT channels_provider_check CHECK (
    provider IN ('telegram', 'vk', 'ok', 'max', 'rutube', 'dzen', 'youtube')
);

-- +goose Down
ALTER TABLE social_provider_settings DROP CONSTRAINT IF EXISTS social_provider_settings_provider_check;
ALTER TABLE social_provider_settings ADD CONSTRAINT social_provider_settings_provider_check CHECK (
    provider IN ('vk', 'ok', 'max', 'rutube', 'dzen')
);

ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_provider_check;
ALTER TABLE channels ADD CONSTRAINT channels_provider_check CHECK (
    provider IN ('telegram', 'vk', 'ok', 'max', 'rutube', 'dzen')
);

ALTER TABLE channel_oauth_sessions DROP CONSTRAINT IF EXISTS channel_oauth_sessions_provider_check;
ALTER TABLE channel_oauth_sessions ADD CONSTRAINT channel_oauth_sessions_provider_check CHECK (
    provider IN ('vk', 'ok', 'rutube', 'dzen')
);

DELETE FROM social_provider_settings WHERE provider = 'youtube';
DROP TABLE IF EXISTS youtube_provider_settings;
