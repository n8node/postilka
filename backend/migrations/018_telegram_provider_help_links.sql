-- +goose Up
UPDATE telegram_provider_settings
SET config = config || '{
  "connect_help_url": "https://postilka.ru/docs/telegram",
  "docs_url": "https://postilka.ru/docs",
  "support_telegram_username": "postilka_support",
  "support_email": "support@postilka.ru",
  "support_hours_text": "пн–вс 10:00–19:00 (МСК)"
}'::jsonb,
updated_at = NOW()
WHERE id = 1
  AND NOT (config ? 'connect_help_url');

-- +goose Down
UPDATE telegram_provider_settings
SET config = config - 'connect_help_url' - 'docs_url' - 'support_telegram_username' - 'support_email' - 'support_hours_text',
    updated_at = NOW()
WHERE id = 1;
