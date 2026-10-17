-- +goose Up
ALTER TABLE ai_generation_jobs
    ADD COLUMN IF NOT EXISTS provider_id TEXT NOT NULL DEFAULT 'kie',
    ADD COLUMN IF NOT EXISTS provider_task_id TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS provider_result_s3_key TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS provider_result_content_type TEXT NOT NULL DEFAULT '';

UPDATE ai_generation_jobs
SET provider_id = 'kie', provider_task_id = kie_task_id
WHERE COALESCE(TRIM(provider_task_id), '') = ''
  AND COALESCE(TRIM(kie_task_id), '') <> '';

CREATE INDEX IF NOT EXISTS ai_generation_jobs_provider_poll_idx
    ON ai_generation_jobs (provider_id, provider_task_id)
    WHERE status IN ('preparing', 'waiting', 'queuing', 'generating');

-- +goose Down
DROP INDEX IF EXISTS ai_generation_jobs_provider_poll_idx;
ALTER TABLE ai_generation_jobs
    DROP COLUMN IF EXISTS provider_result_content_type,
    DROP COLUMN IF EXISTS provider_result_s3_key,
    DROP COLUMN IF EXISTS provider_task_id,
    DROP COLUMN IF EXISTS provider_id;