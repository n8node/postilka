-- +goose Up
CREATE TABLE metrika_platform_config (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO metrika_platform_config (id, config) VALUES (1, '{
  "enabled": false,
  "oauth_client_id": "",
  "oauth_client_secret_encrypted": ""
}'::jsonb);

-- +goose Down
DROP TABLE IF EXISTS metrika_platform_config;
