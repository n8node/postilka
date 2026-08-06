-- +goose Up
CREATE TABLE email_template_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO email_template_settings (id, config) VALUES (1, '{
  "logo_url": "",
  "logo_alt": "Postilka",
  "primary_color": "#2563eb",
  "background_color": "#eef1f6",
  "card_radius_px": 20,
  "signature_title": "Делаем автопостинг проще!",
  "signature_team": "Команда сервиса Postilka",
  "footer_links": [
    {"label": "Возможности", "url": "https://postilka.ru"},
    {"label": "Документация", "url": "https://postilka.ru/docs"},
    {"label": "Полезное", "url": "https://postilka.ru/blog"}
  ],
  "social_links": [
    {"label": "Telegram", "url": "https://t.me/postilka", "icon_url": ""},
    {"label": "VK", "url": "https://vk.com/postilka", "icon_url": ""},
    {"label": "Дзен", "url": "https://dzen.ru/postilka", "icon_url": ""}
  ],
  "app_download_text": "Скачайте приложение Postilka",
  "app_store_url": "",
  "google_play_url": "",
  "footer_legal_text": "Вы получили это письмо, потому что зарегистрировались в сервисе Postilka или подписались на рассылку.",
  "unsubscribe_text": "Отписаться от рассылки",
  "unsubscribe_url": "https://postilka.ru/app/settings"
}'::jsonb);

-- +goose Down
DROP TABLE IF EXISTS email_template_settings;
