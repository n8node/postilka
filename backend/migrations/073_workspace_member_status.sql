-- +goose Up
CREATE TYPE workspace_member_status AS ENUM ('active', 'suspended');

ALTER TABLE workspace_members
    ADD COLUMN status workspace_member_status NOT NULL DEFAULT 'active';

ALTER TABLE workspace_members
    ADD CONSTRAINT workspace_members_owner_active
    CHECK (role <> 'owner' OR status = 'active');

CREATE INDEX idx_workspace_members_status
    ON workspace_members (workspace_id, status);

-- +goose Down
DROP INDEX IF EXISTS idx_workspace_members_status;
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_owner_active;
ALTER TABLE workspace_members DROP COLUMN IF EXISTS status;
DROP TYPE IF EXISTS workspace_member_status;
