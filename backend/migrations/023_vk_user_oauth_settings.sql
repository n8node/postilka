-- +goose Up
UPDATE social_provider_settings
SET config = config
    || jsonb_build_object(
        'oauth_client_id', '',
        'oauth_client_secret', '',
        'connect_help_text', '1. Создайте Standalone-приложение VK (vk.com/apps?act=manage) и укажите Redirect URI из Postilka.' || E'\n'
            || '2. Скопируйте ID приложения и защищённый ключ.' || E'\n'
            || '3. В Postilka вставьте ключи и войдите через VK.' || E'\n'
            || '4. Выберите сообщества, где вы администратор.' || E'\n'
            || '5. Права приложения: wall, photos, video, groups, offline.'
    ),
    updated_at = NOW()
WHERE provider = 'vk';

-- +goose Down
-- no-op: previous connect_help_text is not restored
