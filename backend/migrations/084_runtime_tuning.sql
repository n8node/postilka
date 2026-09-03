-- +goose Up
UPDATE app_settings
SET value = value || '{"runtime_tuning":{"publish_concurrency":0,"publish_interval_sec":0,"database_max_conns":0}}'::jsonb,
    updated_at = NOW()
WHERE key = 'load_monitor'
  AND NOT (value ? 'runtime_tuning');

-- +goose Down
UPDATE app_settings
SET value = value - 'runtime_tuning',
    updated_at = NOW()
WHERE key = 'load_monitor';
