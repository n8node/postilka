-- +goose Up
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_free BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_popular BOOLEAN NOT NULL DEFAULT false,
    price_monthly_cents INTEGER,
    price_yearly_cents INTEGER,
    max_channels INTEGER,
    max_posts_per_period INTEGER,
    max_seats INTEGER,
    storage_bytes BIGINT,
    ai_text_tokens_quota INTEGER,
    ai_media_credits_quota INTEGER,
    free_plan_duration_days INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plans_active_sort ON plans (is_active, sort_order, name);

ALTER TABLE workspaces
    ADD COLUMN plan_id UUID REFERENCES plans(id) ON DELETE RESTRICT,
    ADD COLUMN plan_assigned_at TIMESTAMPTZ;

CREATE INDEX idx_workspaces_plan_id ON workspaces (plan_id);

INSERT INTO plans (
    id, slug, name, description, is_free, is_active, is_popular,
    price_monthly_cents, price_yearly_cents,
    max_channels, max_posts_per_period, max_seats, storage_bytes,
    ai_text_tokens_quota, ai_media_credits_quota, free_plan_duration_days, sort_order
) VALUES (
    '00000000-0000-4000-8000-000000000001',
    'free',
    'Бесплатный',
    'Стартовый тариф при регистрации',
    true, true, false,
    0, 0,
    2, 30, 1, 1073741824,
    50000, 5, NULL, 0
);

UPDATE workspaces
SET plan_id = '00000000-0000-4000-8000-000000000001',
    plan_assigned_at = COALESCE(plan_assigned_at, NOW())
WHERE plan_id IS NULL;

-- +goose Down
ALTER TABLE workspaces DROP COLUMN IF EXISTS plan_assigned_at;
ALTER TABLE workspaces DROP COLUMN IF EXISTS plan_id;
DROP TABLE IF EXISTS plans;
