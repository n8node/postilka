-- +goose Up

ALTER TABLE ad_studio_templates
    ADD COLUMN IF NOT EXISTS trend_prompt BOOLEAN NOT NULL DEFAULT FALSE;

-- +goose Down

ALTER TABLE ad_studio_templates
    DROP COLUMN IF EXISTS trend_prompt;