-- +goose Up
DELETE FROM social_provider_settings WHERE provider = 'ok';
DELETE FROM public_pages WHERE provider = 'ok' OR slug = 'help/connect/ok';

-- +goose Down
INSERT INTO social_provider_settings (provider, config) VALUES
('ok', '{
  "enabled": false,
  "oauth_client_id": "",
  "oauth_client_secret": "",
  "connect_help_text": "",
  "connect_help_url": "https://postilka.ru/docs/ok",
  "docs_url": "https://postilka.ru/docs",
  "support_telegram_username": "postilka_support",
  "support_email": "support@postilka.ru",
  "support_hours_text": "пн–вс 10:00–19:00 (МСК)"
}'::jsonb)
ON CONFLICT (provider) DO NOTHING;

INSERT INTO public_pages (title, slug, meta_description, external_url, category, provider, published, sort_order)
VALUES (
    'Подключение OK',
    'help/connect/ok',
    'Как подключить группу Одноклассники',
    'https://postilka.ru/docs/ok',
    'instruction',
    'ok',
    false,
    40
)
ON CONFLICT (slug) DO NOTHING;
