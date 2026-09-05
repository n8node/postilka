-- +goose Up
ALTER TABLE ai_generation_jobs
    ADD COLUMN IF NOT EXISTS lease_owner TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS lease_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    ADD COLUMN IF NOT EXISTS last_error TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS ai_generation_jobs_lease_poll_idx
    ON ai_generation_jobs (poll_after, lease_until, id)
    WHERE status IN ('preparing', 'waiting', 'queuing', 'generating');

-- +goose Down
DROP INDEX IF EXISTS ai_generation_jobs_lease_poll_idx;
ALTER TABLE ai_generation_jobs
    DROP COLUMN IF EXISTS last_error,
    DROP COLUMN IF EXISTS attempts,
    DROP COLUMN IF EXISTS lease_until,
    DROP COLUMN IF EXISTS lease_owner;
