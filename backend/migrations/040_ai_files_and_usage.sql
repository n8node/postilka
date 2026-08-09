-- +goose Up
ALTER TABLE workspace_folders
    ADD COLUMN IF NOT EXISTS kind TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS workspace_folders_ai_content_uniq
    ON workspace_folders (workspace_id)
    WHERE kind = 'ai_content' AND deleted_at IS NULL AND parent_id IS NULL;

ALTER TABLE ai_generations
    ADD COLUMN IF NOT EXISTS workspace_file_id UUID REFERENCES workspace_files(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ai_generations_workspace_file_idx
    ON ai_generations (workspace_file_id)
    WHERE workspace_file_id IS NOT NULL;

ALTER TABLE ai_generation_jobs
    ADD COLUMN IF NOT EXISTS quota_credits_used INT NOT NULL DEFAULT 0 CHECK (quota_credits_used >= 0);

-- +goose Down
ALTER TABLE ai_generation_jobs DROP COLUMN IF EXISTS quota_credits_used;
DROP INDEX IF EXISTS ai_generations_workspace_file_idx;
ALTER TABLE ai_generations DROP COLUMN IF EXISTS workspace_file_id;
DROP INDEX IF EXISTS workspace_folders_ai_content_uniq;
ALTER TABLE workspace_folders DROP COLUMN IF EXISTS kind;
