-- +goose Up
ALTER TABLE users
    ADD COLUMN pending_email VARCHAR(255);

CREATE UNIQUE INDEX idx_users_pending_email
    ON users (pending_email)
    WHERE pending_email IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_users_pending_email;
ALTER TABLE users DROP COLUMN IF EXISTS pending_email;
