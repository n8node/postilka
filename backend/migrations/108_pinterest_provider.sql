-- +goose Up
ALTER TABLE social_provider_settings
    DROP CONSTRAINT IF EXISTS social_provider_settings_provider_check;

ALTER TABLE social_provider_settings
    ADD CONSTRAINT social_provider_settings_provider_check CHECK (
        provider IN ('vk', 'ok', 'max', 'rutube', 'dzen', 'youtube', 'pinterest')
    );

INSERT INTO social_provider_settings (provider, config)
VALUES ('pinterest', '{
  "enabled": false,
  "oauth_client_id": "",
  "oauth_client_secret": "",
  "connect_help_text": "1. Создайте приложение Pinterest Developer.\n2. Добавьте Redirect URI из Postilka.\n3. Укажите App ID и Secret Key ниже.\n4. Запросите права user_accounts:read, boards:read, boards:write, pins:read и pins:write.\n5. После изменения прав переподключите Pinterest.\n6. Production-публикация Pins требует Standard access Pinterest.",
  "connect_help_url": "https://developers.pinterest.com/docs/getting-started/authentication/",
  "docs_url": "https://developers.pinterest.com/docs/reference/pins/",
  "support_telegram_username": "postilka_support",
  "support_email": "support@postilka.ru",
  "support_hours_text": "пн–вс 10:00–19:00 (МСК)"
}'::jsonb)
ON CONFLICT (provider) DO NOTHING;

ALTER TABLE provider_logos
    DROP CONSTRAINT IF EXISTS provider_logos_provider_check;

ALTER TABLE provider_logos
    ADD CONSTRAINT provider_logos_provider_check CHECK (
        provider IN ('telegram', 'telegram_business', 'vk', 'max', 'rutube', 'dzen', 'youtube', 'photochka', 'wordpress', 'pinterest')
    );

ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_provider_check;
ALTER TABLE channels ADD CONSTRAINT channels_provider_check CHECK (
    provider IN ('telegram', 'vk', 'ok', 'max', 'rutube', 'dzen', 'youtube', 'photochka', 'wordpress', 'pinterest')
);

ALTER TABLE channel_oauth_sessions DROP CONSTRAINT IF EXISTS channel_oauth_sessions_provider_check;
ALTER TABLE channel_oauth_sessions ADD CONSTRAINT channel_oauth_sessions_provider_check CHECK (
    provider IN ('vk', 'ok', 'rutube', 'dzen', 'youtube', 'pinterest')
);

-- +goose Down
DELETE FROM social_provider_settings WHERE provider = 'pinterest';
ALTER TABLE social_provider_settings DROP CONSTRAINT IF EXISTS social_provider_settings_provider_check;
ALTER TABLE social_provider_settings ADD CONSTRAINT social_provider_settings_provider_check CHECK (
    provider IN ('vk', 'ok', 'max', 'rutube', 'dzen', 'youtube')
);
ALTER TABLE provider_logos DROP CONSTRAINT IF EXISTS provider_logos_provider_check;
ALTER TABLE provider_logos ADD CONSTRAINT provider_logos_provider_check CHECK (
    provider IN ('telegram', 'telegram_business', 'vk', 'max', 'rutube', 'dzen', 'youtube', 'photochka', 'wordpress')
);
ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_provider_check;
ALTER TABLE channels ADD CONSTRAINT channels_provider_check CHECK (
    provider IN ('telegram', 'vk', 'ok', 'max', 'rutube', 'dzen', 'youtube', 'photochka', 'wordpress')
);
ALTER TABLE channel_oauth_sessions DROP CONSTRAINT IF EXISTS channel_oauth_sessions_provider_check;
ALTER TABLE channel_oauth_sessions ADD CONSTRAINT channel_oauth_sessions_provider_check CHECK (
    provider IN ('vk', 'ok', 'rutube', 'dzen', 'youtube')
);