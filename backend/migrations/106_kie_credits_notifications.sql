-- +goose Up
ALTER TABLE platform_ops_state
    ADD COLUMN IF NOT EXISTS kie_credits_last_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS kie_credits_alert_1_sent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS kie_credits_alert_2_sent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS kie_credits_alert_3_sent BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE telegram_settings
SET config = config || '{
  "kie_credits_enabled": true,
  "kie_credits_alert_1": 3000,
  "kie_credits_alert_2": 2000,
  "kie_credits_alert_3": 1000
}'::jsonb
WHERE id = 1;

-- +goose Down
UPDATE telegram_settings
SET config = config - 'kie_credits_enabled' - 'kie_credits_alert_1' - 'kie_credits_alert_2' - 'kie_credits_alert_3'
WHERE id = 1;

ALTER TABLE platform_ops_state
    DROP COLUMN IF EXISTS kie_credits_last_sent_at,
    DROP COLUMN IF EXISTS kie_credits_alert_1_sent,
    DROP COLUMN IF EXISTS kie_credits_alert_2_sent,
    DROP COLUMN IF EXISTS kie_credits_alert_3_sent;