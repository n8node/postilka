-- +goose Up
ALTER TABLE plans
    ADD COLUMN analytics_enabled BOOLEAN NOT NULL DEFAULT false;

UPDATE plans
SET analytics_enabled = true
WHERE is_free = false;

-- +goose Down
ALTER TABLE plans DROP COLUMN IF EXISTS analytics_enabled;
