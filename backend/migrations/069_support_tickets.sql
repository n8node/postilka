-- +goose Up
CREATE TABLE support_ticket_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(64) NOT NULL UNIQUE,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme_id UUID NOT NULL REFERENCES support_ticket_themes(id) ON DELETE RESTRICT,
    subject VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'awaiting_admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT support_tickets_status_check CHECK (
        status IN ('open', 'awaiting_admin', 'awaiting_user', 'in_progress', 'resolved', 'closed')
    )
);

CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status_updated ON support_tickets(status, updated_at DESC);
CREATE INDEX idx_support_tickets_theme_status ON support_tickets(theme_id, status);

CREATE TABLE support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_role VARCHAR(16) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT support_ticket_messages_author_role_check CHECK (author_role IN ('user', 'admin'))
);

CREATE INDEX idx_support_ticket_messages_ticket ON support_ticket_messages(ticket_id, created_at ASC);

CREATE TABLE support_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO support_settings (id, config) VALUES (1, '{
  "admin_email_enabled": true,
  "admin_email_recipients": "",
  "telegram_enabled": false,
  "telegram_bot_token": "",
  "telegram_chat_id": "",
  "telegram_new_ticket_template": "🆕 Новый тикет #{ticketShortId}\nТема: {themeName}\nОт: {userEmail} ({userName})\n\n{preview}",
  "telegram_user_reply_template": "💬 Ответ в тикете #{ticketShortId}\nТема: {themeName}\nОт: {userEmail} ({userName})\n\n{preview}",
  "max_enabled": false,
  "max_bot_token": "",
  "max_recipient_id": "",
  "max_new_ticket_template": "🆕 Новый тикет #{ticketShortId}\nТема: {themeName}\nОт: {userEmail}\n\n{preview}",
  "max_user_reply_template": "💬 Ответ в тикете #{ticketShortId}\nТема: {themeName}\nОт: {userEmail}\n\n{preview}"
}'::jsonb);

INSERT INTO support_ticket_themes (name, slug, sort_order) VALUES
    ('Оплата и тарифы', 'billing', 0),
    ('Каналы и публикации', 'channels', 1),
    ('Ошибки и сбои', 'bugs', 2),
    ('Общие вопросы', 'general', 3);

-- +goose Down
DROP TABLE IF EXISTS support_ticket_messages;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS support_ticket_themes;
DROP TABLE IF EXISTS support_settings;
