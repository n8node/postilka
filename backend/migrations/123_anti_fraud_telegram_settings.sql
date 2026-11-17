-- +goose Up
CREATE TABLE anti_fraud_telegram_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO anti_fraud_telegram_settings (id, config) VALUES (1, '{
  "enabled": false,
  "bot_token_encrypted": "",
  "admin_telegram_id": 0,
  "proxy_enabled": false,
  "proxy_active_url": "",
  "proxy_auto_failover": true,
  "proxy_urls": [],
  "webhook_secret_encrypted": "",
  "notify_high": true,
  "notify_critical": true,
  "require_confirmation": true
}'::jsonb);

-- +goose Down
DROP TABLE IF EXISTS anti_fraud_telegram_settings;