-- +goose Up
CREATE TABLE workspace_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly',
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    base_amount_cents INTEGER NOT NULL DEFAULT 0,
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    last_checkout_id UUID REFERENCES plan_checkouts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_workspace_subscriptions_active
    ON workspace_subscriptions (workspace_id)
    WHERE status IN ('active', 'past_due');

CREATE INDEX idx_workspace_subscriptions_renewal
    ON workspace_subscriptions (period_end, auto_renew)
    WHERE status IN ('active', 'past_due');

ALTER TABLE plan_checkouts
    ADD COLUMN checkout_kind VARCHAR(32) NOT NULL DEFAULT 'subscribe',
    ADD COLUMN list_price_cents INTEGER,
    ADD COLUMN prorate_credit_cents INTEGER NOT NULL DEFAULT 0;

UPDATE plan_checkouts
SET list_price_cents = amount_cents
WHERE list_price_cents IS NULL;

ALTER TABLE plan_checkouts
    ALTER COLUMN list_price_cents SET NOT NULL;

-- +goose Down
ALTER TABLE plan_checkouts
    DROP COLUMN IF EXISTS checkout_kind,
    DROP COLUMN IF EXISTS list_price_cents,
    DROP COLUMN IF EXISTS prorate_credit_cents;

DROP TABLE IF EXISTS workspace_subscriptions;
