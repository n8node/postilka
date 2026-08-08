-- +goose Up
ALTER TABLE channels
    ADD COLUMN IF NOT EXISTS oauth_client_id VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS oauth_client_secret_encrypted TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE channels
    DROP COLUMN IF EXISTS oauth_client_secret_encrypted,
    DROP COLUMN IF EXISTS oauth_client_id;
