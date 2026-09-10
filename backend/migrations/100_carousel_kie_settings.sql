-- +goose Up
ALTER TABLE kie_settings
    ADD COLUMN IF NOT EXISTS model_carousel TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS token_cost_carousel INT NOT NULL DEFAULT 15
        CHECK (token_cost_carousel >= 0);

-- +goose Down
ALTER TABLE kie_settings
    DROP COLUMN IF EXISTS model_carousel,
    DROP COLUMN IF EXISTS token_cost_carousel;