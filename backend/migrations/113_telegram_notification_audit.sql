-- +goose Up
ALTER TABLE telegram_notification_queue
    ADD COLUMN IF NOT EXISTS target TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS proxy TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE telegram_notification_queue
    DROP COLUMN IF EXISTS proxy,
    DROP COLUMN IF EXISTS target;