-- +goose Up

ALTER TABLE ad_studio_templates
    ADD COLUMN IF NOT EXISTS use_template_prompt BOOLEAN NOT NULL DEFAULT FALSE;

-- +goose Down

ALTER TABLE ad_studio_templates
    DROP COLUMN IF EXISTS use_template_prompt;