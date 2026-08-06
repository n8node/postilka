-- +goose Up
ALTER TABLE users
    ADD COLUMN wallet_balance_cents BIGINT NOT NULL DEFAULT 0 CHECK (wallet_balance_cents >= 0);

CREATE SEQUENCE billing_inv_id_seq START WITH 1000;

CREATE TABLE plan_checkouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    provider VARCHAR(50) NOT NULL,
    billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly',
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    external_id VARCHAR(255),
    inv_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

CREATE INDEX idx_plan_checkouts_user_id ON plan_checkouts (user_id);
CREATE INDEX idx_plan_checkouts_workspace_id ON plan_checkouts (workspace_id);
CREATE INDEX idx_plan_checkouts_status ON plan_checkouts (status);
CREATE UNIQUE INDEX idx_plan_checkouts_provider_external ON plan_checkouts (provider, external_id)
    WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX idx_plan_checkouts_inv_id ON plan_checkouts (inv_id)
    WHERE inv_id IS NOT NULL;

CREATE TABLE wallet_topups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    external_id VARCHAR(255),
    inv_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

CREATE INDEX idx_wallet_topups_user_id ON wallet_topups (user_id);
CREATE INDEX idx_wallet_topups_status ON wallet_topups (status);
CREATE UNIQUE INDEX idx_wallet_topups_provider_external ON wallet_topups (provider, external_id)
    WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX idx_wallet_topups_inv_id ON wallet_topups (inv_id)
    WHERE inv_id IS NOT NULL;

CREATE TABLE wallet_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_cents BIGINT NOT NULL,
    entry_type VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_ledger_user_id ON wallet_ledger (user_id, created_at DESC);

CREATE TABLE usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    metric VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    period_start DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_events_workspace_period ON usage_events (workspace_id, metric, period_start);

-- +goose Down
DROP TABLE IF EXISTS usage_events;
DROP TABLE IF EXISTS wallet_ledger;
DROP TABLE IF EXISTS wallet_topups;
DROP TABLE IF EXISTS plan_checkouts;
DROP SEQUENCE IF EXISTS billing_inv_id_seq;
ALTER TABLE users DROP COLUMN IF EXISTS wallet_balance_cents;
