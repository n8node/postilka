-- +goose Up
ALTER TABLE users ADD COLUMN avatar_s3_key TEXT;

-- +goose Down
ALTER TABLE users DROP COLUMN IF EXISTS avatar_s3_key;
