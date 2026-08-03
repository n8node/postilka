-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_meta (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    app_version TEXT NOT NULL DEFAULT '0.1.0-scaffold',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_meta (id, app_version)
VALUES (1, '0.1.0-scaffold')
ON CONFLICT (id) DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS schema_meta;
