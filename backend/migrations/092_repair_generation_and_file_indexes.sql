-- +goose Up
-- Previous releases could leave duplicate legacy rows, preventing 089/091 from
-- creating their indexes. Remove only duplicate records that are safe to
-- identify, retaining the oldest row for each stable key.
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY source_job_id ORDER BY created_at, id) AS rn
    FROM ai_generations
    WHERE source_job_id IS NOT NULL
)
DELETE FROM ai_generations g
USING duplicates d
WHERE g.id = d.id AND d.rn > 1;

DROP INDEX IF EXISTS ai_generations_source_job_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS ai_generations_source_job_uidx
    ON ai_generations (source_job_id);

WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY workspace_id, s3_key ORDER BY created_at, id) AS rn
    FROM workspace_files
)
DELETE FROM workspace_files f
USING duplicates d
WHERE f.id = d.id AND d.rn > 1;

DROP INDEX IF EXISTS workspace_files_workspace_s3_key_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS workspace_files_workspace_s3_key_uidx
    ON workspace_files (workspace_id, s3_key);

-- +goose Down
DROP INDEX IF EXISTS ai_generations_source_job_uidx;
DROP INDEX IF EXISTS workspace_files_workspace_s3_key_uidx;