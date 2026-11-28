-- +goose Up

ALTER TABLE shorts_edit_project_clips
    ADD COLUMN IF NOT EXISTS crop_config JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE shorts_edit_projects
SET settings = jsonb_set(settings, '{output_aspect_ratio}', '"9:16"'::jsonb, true)
WHERE NOT (settings ? 'output_aspect_ratio');

-- +goose Down

ALTER TABLE shorts_edit_project_clips
    DROP COLUMN IF EXISTS crop_config;