-- +goose Up
-- Repair existing installations where migration 108 was already applied
-- before the Pinterest channel provider was added to the source migration.
ALTER TABLE channels
    DROP CONSTRAINT IF EXISTS channels_provider_check;

ALTER TABLE channels
    ADD CONSTRAINT channels_provider_check CHECK (
        provider IN ('telegram', 'vk', 'ok', 'max', 'rutube', 'dzen', 'youtube', 'photochka', 'wordpress', 'pinterest')
    );

-- +goose Down
ALTER TABLE channels
    DROP CONSTRAINT IF EXISTS channels_provider_check;

ALTER TABLE channels
    ADD CONSTRAINT channels_provider_check CHECK (
        provider IN ('telegram', 'vk', 'ok', 'max', 'rutube', 'dzen', 'youtube', 'photochka', 'wordpress')
    );