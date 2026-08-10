-- +goose Up
-- Safety net if 046/047 were not applied before deploy (history API needs these columns).
ALTER TABLE ai_generations
    ADD COLUMN IF NOT EXISTS video_duration_seconds INT NOT NULL DEFAULT 0
        CHECK (video_duration_seconds >= 0 AND video_duration_seconds <= 15),
    ADD COLUMN IF NOT EXISTS preview_s3_key TEXT;

ALTER TABLE ai_generation_jobs
    ADD COLUMN IF NOT EXISTS last_frame_upload_id TEXT,
    ADD COLUMN IF NOT EXISTS reference_video_upload_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS reference_audio_upload_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

-- +goose Down
-- No-op: columns shared with 046/047.
