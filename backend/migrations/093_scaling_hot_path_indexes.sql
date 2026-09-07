-- +goose Up
CREATE INDEX IF NOT EXISTS ai_generation_jobs_due_poll_idx
    ON ai_generation_jobs (poll_after, created_at, id)
    WHERE status IN ('preparing', 'waiting', 'queuing', 'generating');

CREATE INDEX IF NOT EXISTS usage_events_workspace_metric_period_idx
    ON usage_events (workspace_id, metric, period_start);

-- +goose Down
DROP INDEX IF EXISTS ai_generation_jobs_due_poll_idx;
DROP INDEX IF EXISTS usage_events_workspace_metric_period_idx;
