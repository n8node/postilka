-- +goose Up
UPDATE channels SET oauth_client_id = '' WHERE oauth_client_id IS NULL;
UPDATE channels SET oauth_client_secret_encrypted = '' WHERE oauth_client_secret_encrypted IS NULL;
ALTER TABLE channels
    ALTER COLUMN oauth_client_id SET DEFAULT '',
    ALTER COLUMN oauth_client_secret_encrypted SET DEFAULT '';

-- +goose Down
-- no-op: defaults are safe to keep
