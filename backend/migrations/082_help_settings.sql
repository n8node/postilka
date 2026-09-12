-- +goose Up
CREATE TABLE help_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO help_settings (id, enabled) VALUES (1, TRUE);

-- +goose Down
DROP TABLE IF EXISTS help_settings;