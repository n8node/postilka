-- +goose Up
CREATE TABLE link_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(16) NOT NULL,
    destination_url TEXT NOT NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    post_id UUID,
    target_id UUID,
    channel_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT link_codes_code_unique UNIQUE (code)
);

CREATE INDEX link_codes_workspace_idx ON link_codes (workspace_id, created_at DESC);
CREATE INDEX link_codes_post_idx ON link_codes (post_id) WHERE post_id IS NOT NULL;

CREATE TABLE link_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_code_id UUID NOT NULL REFERENCES link_codes(id) ON DELETE CASCADE,
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    referrer_hash VARCHAR(64),
    user_agent_hash VARCHAR(64),
    is_bot BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX link_clicks_code_idx ON link_clicks (link_code_id, clicked_at DESC);

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE posts ADD CONSTRAINT posts_status_check CHECK (
    status IN (
        'draft', 'pending_approval', 'scheduled', 'publishing',
        'published', 'failed', 'canceled'
    )
);

CREATE TABLE post_approval_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(32) NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT post_approval_events_action_check CHECK (
        action IN ('submit', 'approve', 'reject', 'comment')
    )
);

CREATE INDEX post_approval_events_post_idx ON post_approval_events (post_id, created_at);

-- +goose Down
DROP TABLE IF EXISTS post_approval_events;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE posts ADD CONSTRAINT posts_status_check CHECK (
    status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'canceled')
);
DROP TABLE IF EXISTS link_clicks;
DROP TABLE IF EXISTS link_codes;
