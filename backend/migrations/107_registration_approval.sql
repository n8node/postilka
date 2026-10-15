-- +goose Up
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_approval BOOLEAN NOT NULL DEFAULT FALSE;
INSERT INTO app_settings (key, value) VALUES ('auth.registration_approval_enabled', 'false') ON CONFLICT (key) DO NOTHING;

-- +goose Down
DELETE FROM app_settings WHERE key = 'auth.registration_approval_enabled';
ALTER TABLE users DROP COLUMN IF EXISTS pending_approval;