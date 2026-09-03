-- +goose Up
CREATE TABLE platform_load_snapshots (
    id BIGSERIAL PRIMARY KEY,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    publish_backlog INT NOT NULL DEFAULT 0,
    posts_due_next_hour INT NOT NULL DEFAULT 0,
    gen_jobs_active INT NOT NULL DEFAULT 0,
    workflow_runs_running INT NOT NULL DEFAULT 0,
    db_pool_max INT NOT NULL DEFAULT 0,
    db_pool_acquired INT NOT NULL DEFAULT 0,
    worker_heartbeat_age_sec INT
);

CREATE INDEX idx_load_snapshots_collected_at ON platform_load_snapshots (collected_at DESC);

ALTER TABLE platform_ops_state
    ADD COLUMN IF NOT EXISTS load_report_last_sent_on DATE;

INSERT INTO app_settings (key, value, updated_at)
VALUES (
    'load_monitor',
    '{"report_enabled":true,"report_hour":9,"server_ram_gb":6}',
    NOW()
)
ON CONFLICT (key) DO NOTHING;

-- +goose Down
DELETE FROM app_settings WHERE key = 'load_monitor';

ALTER TABLE platform_ops_state DROP COLUMN IF EXISTS load_report_last_sent_on;

DROP TABLE IF EXISTS platform_load_snapshots;
