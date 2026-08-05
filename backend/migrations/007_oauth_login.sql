-- +goose Up
CREATE TYPE login_oauth_provider AS ENUM ('vk', 'max');

CREATE TABLE user_login_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider login_oauth_provider NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL DEFAULT '',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_user_id),
    UNIQUE (user_id, provider)
);

CREATE INDEX idx_user_login_identities_user_id ON user_login_identities(user_id);

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE oauth_login_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider login_oauth_provider NOT NULL,
    state_token VARCHAR(64) NOT NULL UNIQUE,
    mode VARCHAR(16) NOT NULL DEFAULT 'login',
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    redirect_path TEXT NOT NULL DEFAULT '/dashboard',
    code_verifier TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    completed_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    provider_user_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_login_sessions_active ON oauth_login_sessions(expires_at)
    WHERE completed_at IS NULL;

-- +goose Down
DROP TABLE IF EXISTS oauth_login_sessions;
DROP TABLE IF EXISTS user_login_identities;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
DROP TYPE IF EXISTS login_oauth_provider;
