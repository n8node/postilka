-- +goose Up
CREATE TABLE token_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tokens INT NOT NULL CHECK (tokens > 0),
    price_cents INT NOT NULL CHECK (price_cents > 0),
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE token_package_checkouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id TEXT NOT NULL REFERENCES token_packages(id),
    provider VARCHAR(32) NOT NULL,
    amount_cents INT NOT NULL CHECK (amount_cents > 0),
    tokens INT NOT NULL CHECK (tokens > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    external_id TEXT,
    inv_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

CREATE INDEX idx_token_package_checkouts_user_id ON token_package_checkouts(user_id);
CREATE INDEX idx_token_package_checkouts_inv_id ON token_package_checkouts(inv_id);

ALTER TABLE users
    ADD COLUMN purchased_media_credits_remaining INT NOT NULL DEFAULT 0 CHECK (purchased_media_credits_remaining >= 0),
    ADD COLUMN purchased_media_credits_total INT NOT NULL DEFAULT 0 CHECK (purchased_media_credits_total >= 0);

INSERT INTO token_packages (id, name, tokens, price_cents, sort_order) VALUES
    ('pack_150', '150 токенов', 150, 15500, 0),
    ('pack_300', '300 токенов', 300, 30000, 1),
    ('pack_500', '500 токенов', 500, 95000, 2),
    ('pack_1500', '1500 токенов', 1500, 260000, 3)
ON CONFLICT (id) DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS token_package_checkouts;
DROP TABLE IF EXISTS token_packages;
ALTER TABLE users DROP COLUMN IF EXISTS purchased_media_credits_remaining;
ALTER TABLE users DROP COLUMN IF EXISTS purchased_media_credits_total;
