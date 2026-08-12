-- +goose Up
CREATE TABLE telegram_business_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    bot_user_id BIGINT NOT NULL,
    bot_username VARCHAR(128) NOT NULL DEFAULT '',
    bot_token_encrypted TEXT NOT NULL,
    webhook_secret VARCHAR(256) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT telegram_business_registrations_status_check
        CHECK (status IN ('pending', 'active', 'disabled')),
    CONSTRAINT telegram_business_registrations_workspace_bot_unique
        UNIQUE (workspace_id, bot_user_id)
);

CREATE INDEX idx_telegram_business_registrations_workspace
    ON telegram_business_registrations (workspace_id);

-- +goose Down
DROP TABLE IF EXISTS telegram_business_registrations;
