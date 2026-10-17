-- +goose Up
CREATE TABLE IF NOT EXISTS media_providers (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    api_base_url TEXT NOT NULL DEFAULT '',
    api_key_encrypted TEXT NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    test_only BOOLEAN NOT NULL DEFAULT FALSE,
    capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_provider_models (
    id UUID PRIMARY KEY,
    provider_id TEXT NOT NULL REFERENCES media_providers(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    operation TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider_id, model_id, media_type, operation)
);

CREATE TABLE IF NOT EXISTS media_provider_pricing (
    id UUID PRIMARY KEY,
    provider_id TEXT NOT NULL REFERENCES media_providers(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL DEFAULT '',
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    operation TEXT NOT NULL,
    billing_unit TEXT NOT NULL DEFAULT 'operation',
    credit_cost INT NOT NULL DEFAULT 1 CHECK (credit_cost >= 0),
    cost_per_second INT NOT NULL DEFAULT 0 CHECK (cost_per_second >= 0),
    cost_per_reference INT NOT NULL DEFAULT 0 CHECK (cost_per_reference >= 0),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider_id, model_id, media_type, operation)
);

CREATE TABLE IF NOT EXISTS media_provider_routes (
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    provider_id TEXT NOT NULL REFERENCES media_providers(id) ON DELETE CASCADE,
    priority INT NOT NULL CHECK (priority > 0),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (media_type, provider_id),
    UNIQUE (media_type, priority)
);

INSERT INTO media_providers (id, display_name, api_base_url, enabled, test_only, capabilities)
VALUES
    ('kie', 'KIE.ai', 'https://api.kie.ai', TRUE, FALSE, '["image", "video"]'::jsonb),
    ('onefast', 'OneFast', 'https://api.onefast.ai', FALSE, TRUE, '["image", "video"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO media_provider_routes (media_type, provider_id, priority)
VALUES ('image', 'kie', 1), ('video', 'kie', 1)
ON CONFLICT DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS media_provider_routes;
DROP TABLE IF EXISTS media_provider_pricing;
DROP TABLE IF EXISTS media_provider_models;
DROP TABLE IF EXISTS media_providers;