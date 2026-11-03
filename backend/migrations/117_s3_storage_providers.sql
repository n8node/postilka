-- +goose Up
CREATE TABLE s3_storage_providers (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    endpoint TEXT NOT NULL DEFAULT '',
    bucket TEXT NOT NULL DEFAULT '',
    region TEXT NOT NULL DEFAULT 'ru-central1',
    access_key TEXT NOT NULL DEFAULT '',
    secret_key TEXT NOT NULL DEFAULT '',
    use_ssl BOOLEAN NOT NULL DEFAULT TRUE,
    path_style BOOLEAN NOT NULL DEFAULT TRUE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO s3_storage_providers
    (id, name, endpoint, bucket, region, access_key, secret_key, use_ssl, path_style, enabled)
SELECT
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Основное хранилище',
    COALESCE(config->>'endpoint', ''),
    COALESCE(config->>'bucket', ''),
    COALESCE(NULLIF(config->>'region', ''), 'ru-central1'),
    COALESCE(config->>'access_key', ''),
    COALESCE(config->>'secret_key', ''),
    COALESCE((config->>'use_ssl')::boolean, TRUE),
    COALESCE((config->>'path_style')::boolean, TRUE),
    COALESCE((config->>'enabled')::boolean, FALSE)
FROM storage_settings
WHERE NOT EXISTS (SELECT 1 FROM s3_storage_providers);

-- +goose Down
DROP TABLE IF EXISTS s3_storage_providers;