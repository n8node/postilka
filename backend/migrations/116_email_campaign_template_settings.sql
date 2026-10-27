-- +goose Up
ALTER TABLE email_campaign_queue
    ADD COLUMN IF NOT EXISTS template_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- +goose Down
ALTER TABLE email_campaign_queue
    DROP COLUMN IF EXISTS template_settings;