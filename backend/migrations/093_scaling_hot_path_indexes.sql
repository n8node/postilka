-- +goose Up
CREATE INDEX IF NOT EXISTS ai_generation_jobs_due_poll_idx
    ON ai_generation_jobs (poll_after, created_at, id)
    WHERE status IN ('preparing', 'waiting', 'queuing', 'generating');

CREATE INDEX IF NOT EXISTS post_targets_due_publish_idx
    ON post_targets (scheduled_at, created_at, id)
    WHERE status IN ('pending', 'publishing') AND scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS usage_events_workspace_metric_period_idx
    ON usage_events (workspace_id, metric, period_start);

-- +goose Down
DROP INDEX IF EXISTS ai_generation_jobs_due_poll_idx;
DROP INDEX IF EXISTS post_targets_due_publish_idx;
DROP INDEX IF EXISTS usage_events_workspace_metric_period_idx;
