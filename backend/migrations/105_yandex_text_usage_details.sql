-- +goose Up
ALTER TABLE usage_events
    ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER,
    ADD COLUMN IF NOT EXISTS completion_tokens INTEGER,
    ADD COLUMN IF NOT EXISTS cost_cents BIGINT,
    ADD COLUMN IF NOT EXISTS model VARCHAR(255);

-- +goose Down
ALTER TABLE usage_events
    DROP COLUMN IF EXISTS model,
    DROP COLUMN IF EXISTS cost_cents,
    DROP COLUMN IF EXISTS completion_tokens,
    DROP COLUMN IF EXISTS prompt_tokens;