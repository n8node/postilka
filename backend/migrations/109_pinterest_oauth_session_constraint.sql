-- +goose Up
-- Migration 108 may already be marked applied on existing installations.
-- Repair its OAuth-session provider constraint so Pinterest OAuth sessions can be created.
ALTER TABLE channel_oauth_sessions
    DROP CONSTRAINT IF EXISTS channel_oauth_sessions_provider_check;

ALTER TABLE channel_oauth_sessions
    ADD CONSTRAINT channel_oauth_sessions_provider_check CHECK (
        provider IN ('vk', 'ok', 'rutube', 'dzen', 'youtube', 'pinterest')
    );

-- +goose Down
ALTER TABLE channel_oauth_sessions
    DROP CONSTRAINT IF EXISTS channel_oauth_sessions_provider_check;

ALTER TABLE channel_oauth_sessions
    ADD CONSTRAINT channel_oauth_sessions_provider_check CHECK (
        provider IN ('vk', 'ok', 'rutube', 'dzen', 'youtube')
    );