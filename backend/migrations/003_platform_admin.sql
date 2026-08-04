-- +goose Up
ALTER TABLE users
    ADD COLUMN is_platform_admin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_users_platform_admin ON users (is_platform_admin)
    WHERE is_platform_admin = true;

-- +goose Down
DROP INDEX IF EXISTS idx_users_platform_admin;
ALTER TABLE users DROP COLUMN IF EXISTS is_platform_admin;
