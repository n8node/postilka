-- +goose Up
UPDATE storage_settings
SET config = config || '{"enabled": true}'::jsonb,
    updated_at = NOW()
WHERE id = 1
  AND COALESCE(config->>'endpoint', '') <> ''
  AND COALESCE(config->>'bucket', '') <> ''
  AND COALESCE(config->>'access_key', '') <> ''
  AND COALESCE(config->>'secret_key', '') <> ''
  AND COALESCE((config->>'enabled')::boolean, false) = false;

-- +goose Down
-- no-op: do not disable storage on rollback
