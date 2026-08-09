-- +goose Up
ALTER TABLE plans
    ADD COLUMN max_workflows INTEGER,
    ADD COLUMN max_workflow_invites INTEGER,
    ADD COLUMN push_on_ready BOOLEAN NOT NULL DEFAULT false;

UPDATE plans
SET
    max_workflows = 1,
    max_workflow_invites = 3,
    push_on_ready = true
WHERE slug = 'free';

-- +goose Down
ALTER TABLE plans
    DROP COLUMN IF EXISTS push_on_ready,
    DROP COLUMN IF EXISTS max_workflow_invites,
    DROP COLUMN IF EXISTS max_workflows;
