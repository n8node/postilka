-- +goose Up
ALTER TABLE ai_generations
    ADD COLUMN IF NOT EXISTS source_job_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS ai_generations_source_job_uidx
    ON ai_generations (source_job_id)
    WHERE source_job_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ai_generation_jobs_generation_uidx
    ON ai_generation_jobs (generation_id)
    WHERE generation_id IS NOT NULL;

ALTER TABLE usage_events
    ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS reference_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS usage_events_ai_generation_uidx
    ON usage_events (reference_type, reference_id, metric)
    WHERE reference_type = 'ai_generation' AND reference_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_ai_generation_uidx
    ON wallet_ledger (reference_type, reference_id, entry_type)
    WHERE reference_type = 'ai_generation' AND reference_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS ai_generation_purchased_debits (
    generation_id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credits INTEGER NOT NULL CHECK (credits > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS ai_generation_purchased_debits;
DROP INDEX IF EXISTS ai_generation_jobs_generation_uidx;
DROP INDEX IF EXISTS wallet_ledger_ai_generation_uidx;
DROP INDEX IF EXISTS usage_events_ai_generation_uidx;
ALTER TABLE usage_events
    DROP COLUMN IF EXISTS reference_id,
    DROP COLUMN IF EXISTS reference_type;
DROP INDEX IF EXISTS ai_generations_source_job_uidx;
ALTER TABLE ai_generations DROP COLUMN IF EXISTS source_job_id;
