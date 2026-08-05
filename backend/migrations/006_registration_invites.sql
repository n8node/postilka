-- +goose Up
CREATE TYPE invite_scope AS ENUM ('SYSTEM', 'USER');
CREATE TYPE invite_status AS ENUM ('ACTIVE', 'USED', 'REVOKED', 'EXPIRED');

CREATE TABLE invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(80) NOT NULL UNIQUE,
    scope invite_scope NOT NULL,
    status invite_status NOT NULL DEFAULT 'ACTIVE',
    owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    used_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN registered_via_invite_id UUID REFERENCES invites(id) ON DELETE SET NULL;

CREATE INDEX idx_invites_scope_status_created_at ON invites (scope, status, created_at);
CREATE INDEX idx_invites_owner_user_id_status ON invites (owner_user_id, status, created_at);
CREATE INDEX idx_users_registered_via_invite_id ON users (registered_via_invite_id);

CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (key, value)
VALUES ('auth.invite_registration_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS app_settings;
ALTER TABLE users DROP COLUMN IF EXISTS registered_via_invite_id;
DROP TABLE IF EXISTS invites;
DROP TYPE IF EXISTS invite_status;
DROP TYPE IF EXISTS invite_scope;
