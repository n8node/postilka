-- +goose Up
CREATE TABLE kie_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    api_base_url TEXT NOT NULL DEFAULT 'https://api.kie.ai',
    api_key_encrypted TEXT NOT NULL DEFAULT '',
    model_text_to_image TEXT NOT NULL DEFAULT '',
    model_image_to_image TEXT NOT NULL DEFAULT '',
    model_combine TEXT NOT NULL DEFAULT '',
    model_filter TEXT NOT NULL DEFAULT '',
    token_cost_text_to_image INT NOT NULL DEFAULT 15 CHECK (token_cost_text_to_image >= 0),
    token_cost_image_to_image INT NOT NULL DEFAULT 15 CHECK (token_cost_image_to_image >= 0),
    token_cost_combine INT NOT NULL DEFAULT 18 CHECK (token_cost_combine >= 0),
    token_cost_filter INT NOT NULL DEFAULT 8 CHECK (token_cost_filter >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO kie_settings (id) VALUES (1);

-- +goose Down
DROP TABLE IF EXISTS kie_settings;
