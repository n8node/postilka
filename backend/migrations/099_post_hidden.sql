-- +goose Up
ALTER TABLE posts
    ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX posts_workspace_hidden_updated_idx
    ON posts (workspace_id, is_hidden, updated_at DESC);

-- +goose Down
DROP INDEX IF EXISTS posts_workspace_hidden_updated_idx;
ALTER TABLE posts DROP COLUMN IF EXISTS is_hidden;