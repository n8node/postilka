-- +goose Up
UPDATE social_provider_settings
SET config = jsonb_set(
    config,
    '{connect_help_text}',
    to_jsonb(
        '1. Войдите через Rutube под аккаунтом владельца канала.' || E'\n' ||
        '2. Выберите канал, в который будете публиковать.' || E'\n' ||
        '3. Подтвердите права приложения Postilka.' || E'\n' ||
        '4. После подключения доступны: посты в ленту канала, загрузка видео и клипов по ссылке, обложка и отложенная публикация.'
    ),
    true
)
WHERE provider = 'rutube';

-- +goose Down
UPDATE social_provider_settings
SET config = jsonb_set(
    config,
    '{connect_help_text}',
    to_jsonb(
        '1. Войдите через Rutube.' || E'\n' ||
        '2. Выберите канал для публикации.' || E'\n' ||
        '3. Подтвердите права.'
    ),
    true
)
WHERE provider = 'rutube';
