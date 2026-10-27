-- +goose Up
ALTER TABLE email_template_settings
    DROP CONSTRAINT IF EXISTS email_template_settings_id_check;

CREATE TABLE email_campaign_queue (
    id UUID PRIMARY KEY,
    campaign_type TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL,
    preheader TEXT NOT NULL DEFAULT '',
    content_html TEXT NOT NULL,
    cta_label TEXT NOT NULL DEFAULT '',
    cta_url TEXT NOT NULL DEFAULT '',
    send_interval_seconds INTEGER NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT NOT NULL DEFAULT '',
    locked_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX email_campaign_queue_pending_idx ON email_campaign_queue (next_attempt_at, created_at) WHERE status IN ('pending','failed');

-- +goose Down
DROP TABLE IF EXISTS email_campaign_queue;