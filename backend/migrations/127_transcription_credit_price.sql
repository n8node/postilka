-- +goose Up
ALTER TABLE kie_settings
    ADD COLUMN IF NOT EXISTS transcription_kopecks_per_credit INTEGER NOT NULL DEFAULT 5000;

-- +goose Down
ALTER TABLE kie_settings
    DROP COLUMN IF EXISTS transcription_kopecks_per_credit;