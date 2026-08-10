-- +goose Up
ALTER TABLE ai_generation_jobs
    ADD COLUMN IF NOT EXISTS video_duration_seconds INT NOT NULL DEFAULT 0
        CHECK (video_duration_seconds >= 0 AND video_duration_seconds <= 15),
    ADD COLUMN IF NOT EXISTS reference_upload_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE ai_generations
    ADD COLUMN IF NOT EXISTS video_duration_seconds INT NOT NULL DEFAULT 0
        CHECK (video_duration_seconds >= 0 AND video_duration_seconds <= 15);

-- +goose Down
ALTER TABLE ai_generations DROP COLUMN IF EXISTS video_duration_seconds;
ALTER TABLE ai_generation_jobs DROP COLUMN IF EXISTS reference_upload_ids;
ALTER TABLE ai_generation_jobs DROP COLUMN IF EXISTS video_duration_seconds;
