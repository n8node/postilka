-- +goose Up
CREATE TABLE post_target_metrics (
    target_id UUID PRIMARY KEY REFERENCES post_targets(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    post_id UUID NOT NULL,
    channel_id UUID NOT NULL,
    provider VARCHAR(32) NOT NULL,
    views INTEGER NOT NULL DEFAULT 0,
    likes INTEGER NOT NULL DEFAULT 0,
    comments INTEGER NOT NULL DEFAULT 0,
    shares INTEGER NOT NULL DEFAULT 0,
    reach INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    clicks_unique INTEGER NOT NULL DEFAULT 0,
    metrika_visits INTEGER NOT NULL DEFAULT 0,
    metrika_users INTEGER NOT NULL DEFAULT 0,
    metrika_goals INTEGER NOT NULL DEFAULT 0,
    subscriber_count INTEGER,
    measurability VARCHAR(16) NOT NULL DEFAULT 'partial',
    provider_note TEXT,
    has_data BOOLEAN NOT NULL DEFAULT false,
    first_data_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT post_target_metrics_measurability_check CHECK (
        measurability IN ('auto', 'partial', 'manual')
    )
);

CREATE INDEX post_target_metrics_workspace_idx ON post_target_metrics (workspace_id, updated_at DESC);
CREATE INDEX post_target_metrics_post_idx ON post_target_metrics (post_id);
CREATE INDEX post_target_metrics_has_data_idx ON post_target_metrics (workspace_id, has_data, updated_at DESC);

CREATE TABLE post_target_metrics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id UUID NOT NULL REFERENCES post_targets(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    post_id UUID NOT NULL,
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    views INTEGER NOT NULL DEFAULT 0,
    likes INTEGER NOT NULL DEFAULT 0,
    comments INTEGER NOT NULL DEFAULT 0,
    shares INTEGER NOT NULL DEFAULT 0,
    reach INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    metrika_visits INTEGER NOT NULL DEFAULT 0,
    metrika_goals INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX post_target_metrics_snapshots_target_time_idx
    ON post_target_metrics_snapshots (target_id, snapshot_at DESC);
CREATE INDEX post_target_metrics_snapshots_workspace_time_idx
    ON post_target_metrics_snapshots (workspace_id, snapshot_at DESC);

CREATE TABLE workspace_metrika_connections (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    counter_id BIGINT NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    connected_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE metrika_oauth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state_token VARCHAR(128) NOT NULL UNIQUE,
    counter_id BIGINT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX metrika_oauth_sessions_expires_idx ON metrika_oauth_sessions (expires_at);

-- +goose Down
DROP TABLE IF EXISTS metrika_oauth_sessions;
DROP TABLE IF EXISTS workspace_metrika_connections;
DROP TABLE IF EXISTS post_target_metrics_snapshots;
DROP TABLE IF EXISTS post_target_metrics;
