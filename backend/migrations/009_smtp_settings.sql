-- +goose Up
CREATE TABLE smtp_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO smtp_settings (id, config) VALUES (1, '{
  "enabled": false,
  "from_email": "",
  "from_name": "Postilka",
  "force_from_email": true,
  "force_from_name": true,
  "reply_to_from_email": true,
  "host": "",
  "port": 465,
  "encryption": "ssl",
  "auto_tls": true,
  "auth": true,
  "username": "",
  "password": ""
}'::jsonb);

-- +goose Down
DROP TABLE IF EXISTS smtp_settings;
