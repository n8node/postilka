-- +goose Up
ALTER TABLE kie_settings
    ADD COLUMN IF NOT EXISTS kopecks_per_media_credit INT NOT NULL DEFAULT 5000 CHECK (kopecks_per_media_credit > 0);

CREATE TABLE IF NOT EXISTS ai_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    mode TEXT NOT NULL,
    prompt TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    aspect_ratio TEXT NOT NULL DEFAULT '1:1',
    result_s3_key TEXT NOT NULL,
    result_content_type TEXT NOT NULL DEFAULT 'image/jpeg',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_generations_workspace_created_idx
    ON ai_generations (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_generations_user_created_idx
    ON ai_generations (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    kie_task_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'preparing',
    kie_state TEXT NOT NULL DEFAULT '',
    progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    fail_message TEXT NOT NULL DEFAULT '',
    mode TEXT NOT NULL,
    prompt TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT '',
    aspect_ratio TEXT NOT NULL DEFAULT '1:1',
    source_upload_id TEXT NOT NULL DEFAULT '',
    combine_upload_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    credit_cost INT NOT NULL DEFAULT 1 CHECK (credit_cost >= 0),
    wallet_cents_charged INT NOT NULL DEFAULT 0 CHECK (wallet_cents_charged >= 0),
    duration_ms INT NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
    generation_id UUID REFERENCES ai_generations(id) ON DELETE SET NULL,
    poll_after TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_polled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_generation_jobs_poll_idx
    ON ai_generation_jobs (poll_after)
    WHERE status IN ('preparing', 'waiting', 'queuing', 'generating');

CREATE INDEX IF NOT EXISTS ai_generation_jobs_workspace_created_idx
    ON ai_generation_jobs (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS generation_source_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    s3_key TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'image/jpeg',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generation_source_uploads_workspace_idx
    ON generation_source_uploads (workspace_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS generation_source_uploads;
DROP TABLE IF EXISTS ai_generation_jobs;
DROP TABLE IF EXISTS ai_generations;
ALTER TABLE kie_settings DROP COLUMN IF EXISTS kopecks_per_media_credit;
