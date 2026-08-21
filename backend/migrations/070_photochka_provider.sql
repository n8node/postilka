-- +goose Up
ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_provider_check;
ALTER TABLE channels ADD CONSTRAINT channels_provider_check CHECK (
    provider IN ('telegram', 'vk', 'ok', 'max', 'rutube', 'dzen', 'youtube', 'photochka')
);

-- +goose Down
ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_provider_check;
ALTER TABLE channels ADD CONSTRAINT channels_provider_check CHECK (
    provider IN ('telegram', 'vk', 'ok', 'max', 'rutube', 'dzen', 'youtube')
);
