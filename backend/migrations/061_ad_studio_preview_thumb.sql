-- +goose Up

ALTER TABLE ad_studio_templates
    ADD COLUMN preview_thumb_s3_key TEXT NOT NULL DEFAULT '';

-- +goose Down

ALTER TABLE ad_studio_templates
    DROP COLUMN IF EXISTS preview_thumb_s3_key;
