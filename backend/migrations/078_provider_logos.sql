-- +goose Up
CREATE TABLE provider_logos (
    provider TEXT PRIMARY KEY,
    s3_key TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT provider_logos_provider_check CHECK (
        provider IN (
            'telegram',
            'telegram_business',
            'vk',
            'max',
            'rutube',
            'dzen',
            'youtube',
            'photochka',
            'wordpress'
        )
    )
);

-- +goose Down
DROP TABLE IF EXISTS provider_logos;
