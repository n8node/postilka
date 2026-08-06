-- +goose Up
CREATE TABLE telegram_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO telegram_settings (id, config) VALUES (1, '{
  "enabled": false,
  "chat_id": "",
  "bot_token": "",
  "proxy_enabled": false,
  "proxy_active_url": "",
  "proxy_auto_failover": true,
  "proxy_urls": [],
  "notify_registration": true,
  "registration_template": "🆕 Новый пользователь\nEmail: {email}\nИмя: {name}\n{inviteCode}\n{inviteScope}\n{inviteOwner}",
  "notify_email_verified": true,
  "email_verified_template": "✅ Email подтверждён\nEmail: {email}\nИмя: {name}",
  "notify_payment": true,
  "payment_template": "💰 Оплата тарифа\nПользователь: {userEmail} ({userName})\nТариф: {planName}\nСумма: {amount} {currency}",
  "notify_wallet_topup": true,
  "wallet_topup_template": "💳 Пополнение кошелька\nПользователь: {userEmail} ({userName})\nСумма пополнения: {amount} {currency}\nТекущий баланс: {balance} {currency}",
  "notify_support": false,
  "support_template": "🎫 Тикет поддержки\nПользователь: {userEmail}\nТема: {subject}"
}'::jsonb);

CREATE TABLE telegram_notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    message_text TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT,
    last_attempt_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT telegram_notification_queue_status_check
        CHECK (status IN ('pending', 'processing', 'sent', 'failed'))
);

CREATE INDEX idx_telegram_notification_queue_pick
    ON telegram_notification_queue (status, next_attempt_at, created_at);

CREATE INDEX idx_telegram_notification_queue_created
    ON telegram_notification_queue (created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS telegram_notification_queue;
DROP TABLE IF EXISTS telegram_settings;
