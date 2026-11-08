-- +goose Up

CREATE TABLE instagram_provider_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO instagram_provider_settings (id, config)
VALUES (1, '{"proxy_enabled": false, "proxy_active_url": "", "proxy_auto_failover": true, "proxy_urls": []}'::jsonb);

ALTER TABLE social_provider_settings
    DROP CONSTRAINT IF EXISTS social_provider_settings_provider_check;

ALTER TABLE social_provider_settings
    ADD CONSTRAINT social_provider_settings_provider_check CHECK (
        provider IN ('vk', 'ok', 'max', 'rutube', 'dzen', 'youtube', 'pinterest', 'instagram')
    );

INSERT INTO social_provider_settings (provider, config)
VALUES ('instagram', '{
  "enabled": false,
  "oauth_client_id": "",
  "oauth_client_secret": "",
  "platform_oauth_enabled": false,
  "connect_help_text": "1. Создайте Business-приложение Meta и добавьте сценарий управления сообщениями и контентом в Instagram.\\n2. Настройте Unified Login и OAuth Redirect URI: https://postilka.ru/app/api/v1/channels/oauth/instagram/callback\\n3. Укажите App ID и App Secret в настройках Postilka.\\n4. Используйте профессиональный аккаунт Instagram: Business или Creator.\\n5. Серверные запросы к Meta выполняются через настроенный proxy.",
  "connect_help_url": "https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login",
  "docs_url": "https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login",
  "support_telegram_username": "postilka_support",
  "support_email": "support@postilka.ru",
  "support_hours_text": "пн–вс 10:00–19:00 (МСК)"
}'::jsonb)
ON CONFLICT (provider) DO NOTHING;

ALTER TABLE provider_logos
    DROP CONSTRAINT IF EXISTS provider_logos_provider_check;

ALTER TABLE provider_logos
    ADD CONSTRAINT provider_logos_provider_check CHECK (
        provider IN ('telegram', 'telegram_business', 'vk', 'max', 'rutube', 'dzen', 'youtube', 'photochka', 'wordpress', 'pinterest', 'instagram')
    );

ALTER TABLE channels
    DROP CONSTRAINT IF EXISTS channels_provider_check;

ALTER TABLE channels
    ADD CONSTRAINT channels_provider_check CHECK (
        provider IN ('telegram', 'vk', 'ok', 'max', 'rutube', 'dzen', 'youtube', 'photochka', 'wordpress', 'pinterest', 'instagram')
    );

ALTER TABLE channel_oauth_sessions
    DROP CONSTRAINT IF EXISTS channel_oauth_sessions_provider_check;

ALTER TABLE channel_oauth_sessions
    ADD CONSTRAINT channel_oauth_sessions_provider_check CHECK (
        provider IN ('vk', 'ok', 'rutube', 'dzen', 'youtube', 'pinterest', 'instagram')
    );

-- +goose Down

DROP TABLE IF EXISTS instagram_provider_settings;

DELETE FROM social_provider_settings WHERE provider = 'instagram';

ALTER TABLE social_provider_settings
    DROP CONSTRAINT IF EXISTS social_provider_settings_provider_check;

ALTER TABLE social_provider_settings
    ADD CONSTRAINT social_provider_settings_provider_check CHECK (
        provider IN ('vk', 'ok', 'max', 'rutube', 'dzen', 'youtube', 'pinterest')
    );

ALTER TABLE provider_logos
    DROP CONSTRAINT IF EXISTS provider_logos_provider_check;

ALTER TABLE provider_logos
    ADD CONSTRAINT provider_logos_provider_check CHECK (
        provider IN ('telegram', 'telegram_business', 'vk', 'max', 'rutube', 'dzen', 'youtube', 'photochka', 'wordpress', 'pinterest')
    );

ALTER TABLE channels
    DROP CONSTRAINT IF EXISTS channels_provider_check;

ALTER TABLE channels
    ADD CONSTRAINT channels_provider_check CHECK (
        provider IN ('telegram', 'vk', 'ok', 'max', 'rutube', 'dzen', 'youtube', 'photochka', 'wordpress', 'pinterest')
    );

ALTER TABLE channel_oauth_sessions
    DROP CONSTRAINT IF EXISTS channel_oauth_sessions_provider_check;

ALTER TABLE channel_oauth_sessions
    ADD CONSTRAINT channel_oauth_sessions_provider_check CHECK (
        provider IN ('vk', 'ok', 'rutube', 'dzen', 'youtube', 'pinterest')
    );