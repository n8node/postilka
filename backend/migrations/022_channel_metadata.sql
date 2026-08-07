-- +goose Up
ALTER TABLE channels
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS metadata_refreshed_at TIMESTAMPTZ;

-- +goose Down
ALTER TABLE channels DROP COLUMN IF EXISTS metadata_refreshed_at;
ALTER TABLE channels DROP COLUMN IF EXISTS metadata;
