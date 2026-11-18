-- +goose Up
CREATE TABLE IF NOT EXISTS company_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    company_name VARCHAR(160) NOT NULL DEFAULT '',
    industry VARCHAR(160) NOT NULL DEFAULT '',
    description VARCHAR(500) NOT NULL DEFAULT '',
    website VARCHAR(300) NOT NULL DEFAULT '',
    target_audience VARCHAR(500) NOT NULL DEFAULT '',
    tone VARCHAR(300) NOT NULL DEFAULT '',
    text_instructions VARCHAR(1000) NOT NULL DEFAULT '',
    banned_words VARCHAR(500) NOT NULL DEFAULT '',
    brand_color VARCHAR(20) NOT NULL DEFAULT '',
    visual_style VARCHAR(500) NOT NULL DEFAULT '',
    visual_avoid VARCHAR(500) NOT NULL DEFAULT '',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_profiles_workspace_idx
    ON company_profiles (workspace_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS company_profiles_default_idx
    ON company_profiles (workspace_id) WHERE is_default;

-- +goose Down
DROP TABLE IF EXISTS company_profiles;