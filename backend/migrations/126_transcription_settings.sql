-- +goose Up
ALTER TABLE kie_settings
    ADD COLUMN IF NOT EXISTS transcription_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS transcription_model TEXT NOT NULL DEFAULT 'nvidia/nemotron-3-5-transcribe',
    ADD COLUMN IF NOT EXISTS transcription_credits_per_second NUMERIC(12,6) NOT NULL DEFAULT 0.005;

ALTER TABLE kie_settings
    ADD COLUMN IF NOT EXISTS transcription_kopecks_per_credit INTEGER NOT NULL DEFAULT 5000;

-- +goose Down
ALTER TABLE kie_settings
    DROP COLUMN IF EXISTS transcription_enabled,
    DROP COLUMN IF EXISTS transcription_model,
    DROP COLUMN IF EXISTS transcription_credits_per_second;
    DROP COLUMN IF EXISTS transcription_kopecks_per_credit;