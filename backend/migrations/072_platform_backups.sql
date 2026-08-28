-- +goose Up
CREATE TABLE platform_backup_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    frequency TEXT NOT NULL DEFAULT 'daily',
    hour SMALLINT NOT NULL DEFAULT 3 CHECK (hour BETWEEN 0 AND 23),
    minute SMALLINT NOT NULL DEFAULT 0 CHECK (minute BETWEEN 0 AND 59),
    weekday SMALLINT NOT NULL DEFAULT 1 CHECK (weekday BETWEEN 0 AND 6),
    retain_count INT NOT NULL DEFAULT 7 CHECK (retain_count BETWEEN 1 AND 90),
    next_run_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT platform_backup_settings_frequency_check CHECK (frequency IN ('daily', 'weekly'))
);

INSERT INTO platform_backup_settings (id) VALUES (1);

CREATE TABLE platform_backup_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger TEXT NOT NULL,
    status TEXT NOT NULL,
    s3_key TEXT NOT NULL DEFAULT '',
    local_name TEXT NOT NULL DEFAULT '',
    size_bytes BIGINT NOT NULL DEFAULT 0,
    media_files INT NOT NULL DEFAULT 0,
    error TEXT NOT NULL DEFAULT '',
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT platform_backup_runs_trigger_check CHECK (trigger IN ('manual', 'schedule')),
    CONSTRAINT platform_backup_runs_status_check CHECK (status IN ('queued', 'running', 'succeeded', 'failed'))
);

CREATE INDEX platform_backup_runs_created_idx ON platform_backup_runs (created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS platform_backup_runs;
DROP TABLE IF EXISTS platform_backup_settings;
