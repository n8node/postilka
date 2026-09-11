-- +goose Up

ALTER TABLE carousels
    ADD COLUMN IF NOT EXISTS reference_files JSONB NOT NULL DEFAULT '[]'::jsonb;

-- +goose Down
ALTER TABLE carousels
    DROP COLUMN IF EXISTS reference_files;