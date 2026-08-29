-- +goose Up
CREATE TABLE platform_ops_state (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    worker_heartbeat_at TIMESTAMPTZ,
    digest_last_sent_on DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_ops_state (id) VALUES (1);

UPDATE telegram_settings
SET config = config || '{
  "digest_enabled": false,
  "digest_chat_id": "",
  "digest_topic_id": 0,
  "digest_hour": 9
}'::jsonb
WHERE id = 1;

-- +goose Down
UPDATE telegram_settings
SET config = config - 'digest_enabled' - 'digest_chat_id' - 'digest_topic_id' - 'digest_hour'
WHERE id = 1;

DROP TABLE IF EXISTS platform_ops_state;
