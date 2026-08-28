-- +goose Up
ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(32),
    ADD COLUMN IF NOT EXISTS telegram_topic_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_support_tickets_telegram_topic
    ON support_tickets (telegram_chat_id, telegram_topic_id)
    WHERE telegram_topic_id IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_support_tickets_telegram_topic;

ALTER TABLE support_tickets
    DROP COLUMN IF EXISTS telegram_topic_id,
    DROP COLUMN IF EXISTS telegram_chat_id;
