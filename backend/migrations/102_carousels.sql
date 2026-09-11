-- +goose Up

CREATE TABLE IF NOT EXISTS carousels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    topic TEXT NOT NULL DEFAULT '',
    caption TEXT NOT NULL DEFAULT '',
    slides JSONB NOT NULL,
    generation_credits INT NOT NULL DEFAULT 0 CHECK (generation_credits >= 0),
    text_credits INT NOT NULL DEFAULT 0 CHECK (text_credits >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carousels_workspace_updated
    ON carousels(workspace_id, updated_at DESC);

-- +goose Down
DROP TABLE IF EXISTS carousels;
