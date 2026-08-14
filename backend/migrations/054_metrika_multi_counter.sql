-- +goose Up
ALTER TABLE workspace_metrika_connections
    ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT '';

UPDATE workspace_metrika_connections SET id = gen_random_uuid() WHERE id IS NULL;

ALTER TABLE workspace_metrika_connections ALTER COLUMN id SET NOT NULL;

ALTER TABLE workspace_metrika_connections DROP CONSTRAINT IF EXISTS workspace_metrika_connections_pkey;

ALTER TABLE workspace_metrika_connections ADD PRIMARY KEY (id);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_metrika_connections_ws_counter_uidx
    ON workspace_metrika_connections (workspace_id, counter_id);

CREATE TABLE post_target_metrika_counter_metrics (
    target_id UUID NOT NULL REFERENCES post_targets(id) ON DELETE CASCADE,
    counter_id BIGINT NOT NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    post_id UUID NOT NULL,
    utm_campaign TEXT NOT NULL DEFAULT '',
    visits INTEGER NOT NULL DEFAULT 0,
    users INTEGER NOT NULL DEFAULT 0,
    goals INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (target_id, counter_id)
);

CREATE INDEX post_target_metrika_counter_metrics_workspace_idx
    ON post_target_metrika_counter_metrics (workspace_id, counter_id);
CREATE INDEX post_target_metrika_counter_metrics_campaign_idx
    ON post_target_metrika_counter_metrics (workspace_id, utm_campaign);

-- +goose Down
DROP TABLE IF EXISTS post_target_metrika_counter_metrics;

DROP INDEX IF EXISTS workspace_metrika_connections_ws_counter_uidx;

ALTER TABLE workspace_metrika_connections DROP CONSTRAINT IF EXISTS workspace_metrika_connections_pkey;

ALTER TABLE workspace_metrika_connections
    ADD PRIMARY KEY (workspace_id);

ALTER TABLE workspace_metrika_connections DROP COLUMN IF EXISTS label;
ALTER TABLE workspace_metrika_connections DROP COLUMN IF EXISTS id;
