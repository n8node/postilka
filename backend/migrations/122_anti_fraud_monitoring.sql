-- +goose Up
ALTER TABLE user_security_signals
    DROP CONSTRAINT IF EXISTS user_security_signals_event_type_check;
ALTER TABLE user_security_signals
    ADD CONSTRAINT user_security_signals_event_type_check
    CHECK (event_type IN ('register', 'login', 'generation_start', 'generation_success', 'generation_failed'));

CREATE TABLE anti_fraud_user_decisions (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    decision VARCHAR(32) NOT NULL,
    reason TEXT NOT NULL,
    decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_security_signals_device_recent
    ON user_security_signals (device_hash, created_at DESC)
    WHERE device_hash IS NOT NULL;

-- +goose Down
DROP TABLE IF EXISTS anti_fraud_user_decisions;
ALTER TABLE user_security_signals
    DROP CONSTRAINT IF EXISTS user_security_signals_event_type_check;
ALTER TABLE user_security_signals
    ADD CONSTRAINT user_security_signals_event_type_check
    CHECK (event_type IN ('register', 'login'));