-- +goose Up

-- Keep deployments safe when migration metadata and the actual schema drifted.
ALTER TABLE ad_studio_templates
    ADD COLUMN IF NOT EXISTS trend_prompt BOOLEAN NOT NULL DEFAULT FALSE;

-- +goose Down

-- 095 owns this column; leave it in place during rollback of the repair migration.