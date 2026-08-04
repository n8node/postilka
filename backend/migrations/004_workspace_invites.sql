-- +goose Up
CREATE TYPE workspace_invite_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');

CREATE TABLE workspace_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role workspace_role NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status workspace_invite_status NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT workspace_invites_role_not_owner CHECK (role <> 'owner')
);

CREATE INDEX idx_workspace_invites_workspace_id ON workspace_invites (workspace_id);
CREATE INDEX idx_workspace_invites_email ON workspace_invites (email)
    WHERE status = 'pending';

-- +goose Down
DROP TABLE IF EXISTS workspace_invites;
DROP TYPE IF EXISTS workspace_invite_status;
