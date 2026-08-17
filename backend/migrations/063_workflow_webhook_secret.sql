-- +goose Up

ALTER TABLE workflows
    ADD COLUMN IF NOT EXISTS webhook_secret TEXT NOT NULL DEFAULT '';

-- +goose Down

ALTER TABLE workflows DROP COLUMN IF EXISTS webhook_secret;
