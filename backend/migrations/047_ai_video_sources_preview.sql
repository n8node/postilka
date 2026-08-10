-- +goose Up
ALTER TABLE ai_generation_jobs
    ADD COLUMN IF NOT EXISTS last_frame_upload_id TEXT,
    ADD COLUMN IF NOT EXISTS reference_video_upload_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS reference_audio_upload_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE ai_generations
    ADD COLUMN IF NOT EXISTS preview_s3_key TEXT;

-- +goose Down
ALTER TABLE ai_generations DROP COLUMN IF EXISTS preview_s3_key;
ALTER TABLE ai_generation_jobs DROP COLUMN IF EXISTS reference_audio_upload_ids;
ALTER TABLE ai_generation_jobs DROP COLUMN IF EXISTS reference_video_upload_ids;
ALTER TABLE ai_generation_jobs DROP COLUMN IF EXISTS last_frame_upload_id;
