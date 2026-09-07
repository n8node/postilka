-- +goose Up
ALTER TABLE kie_settings
    ADD COLUMN IF NOT EXISTS submit_rate_limit INT NOT NULL DEFAULT 18,
    ADD COLUMN IF NOT EXISTS submit_rate_window_sec INT NOT NULL DEFAULT 10;

-- +goose Down
ALTER TABLE kie_settings
    DROP COLUMN IF EXISTS submit_rate_limit,
    DROP COLUMN IF EXISTS submit_rate_window_sec;