-- +goose Up
ALTER TABLE channels
    ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- +goose Down
ALTER TABLE channels
    DROP COLUMN IF EXISTS token_expires_at,
    DROP COLUMN IF EXISTS refresh_token_encrypted;
