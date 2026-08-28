-- +goose Up
ALTER TABLE support_ticket_themes
    ADD COLUMN IF NOT EXISTS description VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS icon VARCHAR(32) NOT NULL DEFAULT 'help';

UPDATE support_ticket_themes SET description = 'Тарифы, оплата', icon = 'credit-card' WHERE slug = 'billing';
UPDATE support_ticket_themes SET description = 'Каналы, публикации', icon = 'radio' WHERE slug = 'channels';
UPDATE support_ticket_themes SET description = 'Ошибки, сбои, API', icon = 'wrench' WHERE slug = 'bugs';
UPDATE support_ticket_themes SET description = 'Другие вопросы', icon = 'help' WHERE slug = 'general';

INSERT INTO support_ticket_themes (name, slug, sort_order, description, icon)
SELECT 'Идеи и предложения', 'ideas', 4, 'Идеи, предложения', 'plus'
WHERE NOT EXISTS (SELECT 1 FROM support_ticket_themes WHERE slug = 'ideas');

ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS priority VARCHAR(16) NOT NULL DEFAULT 'normal';

ALTER TABLE support_tickets
    DROP CONSTRAINT IF EXISTS support_tickets_priority_check;
ALTER TABLE support_tickets
    ADD CONSTRAINT support_tickets_priority_check CHECK (
        priority IN ('low', 'normal', 'high', 'urgent')
    );

ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS ticket_number INTEGER;

CREATE SEQUENCE IF NOT EXISTS support_tickets_ticket_number_seq;

UPDATE support_tickets t
SET ticket_number = s.n
FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS n
    FROM support_tickets
) s
WHERE t.id = s.id AND t.ticket_number IS NULL;

SELECT setval(
    'support_tickets_ticket_number_seq',
    GREATEST(COALESCE((SELECT MAX(ticket_number) FROM support_tickets), 1), 1),
    (SELECT COUNT(*) > 0 FROM support_tickets WHERE ticket_number IS NOT NULL)
);

ALTER TABLE support_tickets
    ALTER COLUMN ticket_number SET DEFAULT nextval('support_tickets_ticket_number_seq');

UPDATE support_tickets
SET ticket_number = nextval('support_tickets_ticket_number_seq')
WHERE ticket_number IS NULL;

ALTER TABLE support_tickets
    ALTER COLUMN ticket_number SET NOT NULL;

ALTER SEQUENCE support_tickets_ticket_number_seq OWNED BY support_tickets.ticket_number;

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_ticket_number ON support_tickets (ticket_number);

CREATE TABLE IF NOT EXISTS support_ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES support_ticket_messages(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_attachments_message
    ON support_ticket_attachments (message_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_support_ticket_attachments_ticket
    ON support_ticket_attachments (ticket_id);

-- +goose Down
DROP TABLE IF EXISTS support_ticket_attachments;
DROP INDEX IF EXISTS idx_support_tickets_ticket_number;
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_priority_check;
ALTER TABLE support_tickets DROP COLUMN IF EXISTS ticket_number;
ALTER TABLE support_tickets DROP COLUMN IF EXISTS priority;
DROP SEQUENCE IF EXISTS support_tickets_ticket_number_seq;
ALTER TABLE support_ticket_themes DROP COLUMN IF EXISTS description;
ALTER TABLE support_ticket_themes DROP COLUMN IF EXISTS icon;
DELETE FROM support_ticket_themes WHERE slug = 'ideas';
