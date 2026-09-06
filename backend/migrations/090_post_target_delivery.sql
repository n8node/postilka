-- +goose Up
ALTER TABLE post_targets
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS provider_request_id TEXT,
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

UPDATE post_targets
SET idempotency_key = post_id::text || ':' || channel_id::text
WHERE idempotency_key IS NULL OR idempotency_key = '';

ALTER TABLE post_targets
    ALTER COLUMN idempotency_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS post_targets_idempotency_key_uidx
    ON post_targets (idempotency_key);

ALTER TABLE post_targets DROP CONSTRAINT IF EXISTS post_targets_status_check;
ALTER TABLE post_targets ADD CONSTRAINT post_targets_status_check CHECK (
    status IN ('pending', 'publishing', 'published', 'failed', 'delivery_unknown', 'canceled')
);

CREATE INDEX IF NOT EXISTS post_targets_delivery_unknown_idx
    ON post_targets (updated_at, id) WHERE status = 'delivery_unknown';

-- +goose Down
DROP INDEX IF EXISTS post_targets_delivery_unknown_idx;
ALTER TABLE post_targets DROP CONSTRAINT IF EXISTS post_targets_status_check;
ALTER TABLE post_targets ADD CONSTRAINT post_targets_status_check CHECK (
    status IN ('pending', 'publishing', 'published', 'failed', 'canceled')
);
DROP INDEX IF EXISTS post_targets_idempotency_key_uidx;
ALTER TABLE post_targets DROP COLUMN IF EXISTS finished_at;
ALTER TABLE post_targets DROP COLUMN IF EXISTS started_at;
ALTER TABLE post_targets DROP COLUMN IF EXISTS provider_request_id;
ALTER TABLE post_targets DROP COLUMN IF EXISTS idempotency_key;