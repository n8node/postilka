-- +goose Up
CREATE TABLE yandex_gpt_config (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO yandex_gpt_config (id, config) VALUES (1, '{
  "api_base_url": "https://llm.api.cloud.yandex.net/v1",
  "api_key_encrypted": "",
  "folder_id": "",
  "model_default": "",
  "models_cache": [],
  "model_pricing": {},
  "task_models": {}
}'::jsonb);

-- +goose Down
DROP TABLE IF EXISTS yandex_gpt_config;
