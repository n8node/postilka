-- +goose Up
-- app_settings.value is TEXT (see 006), not JSONB.
UPDATE app_settings
SET value = (value::jsonb || '{"runtime_tuning":{"publish_concurrency":0,"publish_interval_sec":0,"database_max_conns":0}}'::jsonb)::text,
    updated_at = NOW()
WHERE key = 'load_monitor'
  AND NOT (value::jsonb ? 'runtime_tuning');

-- +goose Down
UPDATE app_settings
SET value = (value::jsonb - 'runtime_tuning')::text,
    updated_at = NOW()
WHERE key = 'load_monitor';
