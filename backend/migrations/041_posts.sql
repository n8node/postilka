-- +goose Up
ALTER TABLE channels
    ADD CONSTRAINT channels_workspace_id_id_unique UNIQUE (workspace_id, id);

ALTER TABLE workspace_files
    ADD CONSTRAINT workspace_files_workspace_id_id_unique UNIQUE (workspace_id, id);

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    due_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT posts_status_check CHECK (
        status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'canceled')
    ),
    CONSTRAINT posts_schedule_due_check CHECK (status <> 'scheduled' OR due_at IS NOT NULL),
    CONSTRAINT posts_workspace_id_id_unique UNIQUE (workspace_id, id)
);

CREATE TABLE post_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    post_id UUID NOT NULL,
    channel_id UUID NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    provider_post_id TEXT,
    last_error TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    next_attempt_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT post_targets_post_fk FOREIGN KEY (workspace_id, post_id)
        REFERENCES posts(workspace_id, id) ON DELETE CASCADE,
    CONSTRAINT post_targets_channel_fk FOREIGN KEY (workspace_id, channel_id)
        REFERENCES channels(workspace_id, id) ON DELETE RESTRICT,
    CONSTRAINT post_targets_status_check CHECK (
        status IN ('pending', 'publishing', 'published', 'failed', 'canceled')
    ),
    CONSTRAINT post_targets_attempts_check CHECK (attempts >= 0),
    CONSTRAINT post_targets_post_channel_unique UNIQUE (post_id, channel_id)
);

CREATE TABLE post_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    post_id UUID NOT NULL,
    file_id UUID NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT post_media_post_fk FOREIGN KEY (workspace_id, post_id)
        REFERENCES posts(workspace_id, id) ON DELETE CASCADE,
    CONSTRAINT post_media_file_fk FOREIGN KEY (workspace_id, file_id)
        REFERENCES workspace_files(workspace_id, id) ON DELETE RESTRICT,
    CONSTRAINT post_media_position_check CHECK (position >= 0),
    CONSTRAINT post_media_post_file_unique UNIQUE (post_id, file_id),
    CONSTRAINT post_media_post_position_unique UNIQUE (post_id, position)
);

CREATE INDEX posts_workspace_updated_idx ON posts (workspace_id, updated_at DESC);
CREATE INDEX posts_due_idx ON posts (due_at, id)
    WHERE status = 'scheduled';
CREATE INDEX post_targets_post_idx ON post_targets (post_id, status);
CREATE INDEX post_targets_retry_idx ON post_targets (next_attempt_at, id)
    WHERE status IN ('pending', 'failed');
CREATE INDEX post_media_post_idx ON post_media (post_id, position);

-- +goose Down
DROP TABLE IF EXISTS post_media;
DROP TABLE IF EXISTS post_targets;
DROP TABLE IF EXISTS posts;
ALTER TABLE workspace_files DROP CONSTRAINT IF EXISTS workspace_files_workspace_id_id_unique;
ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_workspace_id_id_unique;
