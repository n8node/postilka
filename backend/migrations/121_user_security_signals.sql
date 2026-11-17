-- +goose Up
CREATE TABLE user_security_signals (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL CHECK (event_type IN ('register', 'login')),
    ip_hash CHAR(64),
    device_hash CHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_security_signals_user_created
    ON user_security_signals (user_id, created_at DESC);
CREATE INDEX idx_user_security_signals_ip_event
    ON user_security_signals (ip_hash, event_type, created_at DESC)
    WHERE ip_hash IS NOT NULL;
CREATE INDEX idx_user_security_signals_device_event
    ON user_security_signals (device_hash, event_type, created_at DESC)
    WHERE device_hash IS NOT NULL;

-- +goose Down
DROP TABLE IF EXISTS user_security_signals;