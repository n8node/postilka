-- +goose Up
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY workspace_id, s3_key ORDER BY created_at, id) AS rn
    FROM workspace_files
)
DELETE FROM workspace_files f
USING duplicates d
WHERE f.id = d.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS workspace_files_workspace_s3_key_uidx
    ON workspace_files (workspace_id, s3_key);

-- +goose Down
DROP INDEX IF EXISTS workspace_files_workspace_s3_key_uidx;