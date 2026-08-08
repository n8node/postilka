-- +goose Up
UPDATE social_provider_settings
SET config = jsonb_set(
    config,
    '{connect_help_text}',
    to_jsonb(
        '1. В Google Cloud Console создайте OAuth Client (Web) и включите YouTube Data API v3.' || E'\n\n' ||
        '2. Redirect URI: https://postilka.ru/app/api/v1/channels/oauth/youtube/callback' || E'\n\n' ||
        '3. В Postilka укажите Client ID и Client Secret своего проекта Google.' || E'\n\n' ||
        '4. Войдите через Google под аккаунтом владельца YouTube-канала и выберите канал.' || E'\n\n' ||
        '5. Квоты YouTube API расходуются с вашего Google Cloud проекта; запросы к API идут через прокси Postilka.'
    ),
    true
)
WHERE provider = 'youtube';

-- +goose Down
UPDATE social_provider_settings
SET config = jsonb_set(
    config,
    '{connect_help_text}',
    to_jsonb(
        '1. В Google Cloud Console создайте OAuth Client (Web) и включите YouTube Data API v3.' || E'\n' ||
        '2. Redirect URI: https://postilka.ru/app/api/v1/channels/oauth/youtube/callback' || E'\n' ||
        '3. В Postilka укажите Client ID и Client Secret своего проекта Google.' || E'\n' ||
        '4. Войдите через Google под аккаунтом владельца YouTube-канала и выберите канал.' || E'\n' ||
        '5. Квоты YouTube API расходуются с вашего Google Cloud проекта; запросы к API идут через прокси Postilka.'
    ),
    true
)
WHERE provider = 'youtube';
