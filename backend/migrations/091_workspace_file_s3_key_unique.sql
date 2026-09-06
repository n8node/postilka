-- +goose Up
CREATE UNIQUE INDEX IF NOT EXISTS workspace_files_workspace_s3_key_uidx
    ON workspace_files (workspace_id, s3_key);

-- +goose Down
DROP INDEX IF EXISTS workspace_files_workspace_s3_key_uidx;