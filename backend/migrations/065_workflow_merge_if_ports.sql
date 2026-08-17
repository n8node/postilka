-- +goose Up
-- Patch system template: merge node uses input_1 / input_2 ports.

UPDATE workflow_templates
SET graph = jsonb_set(
    jsonb_set(graph, '{edges,2,targetHandle}', '"input_1"'),
    '{edges,3,targetHandle}', '"input_2"'
)
WHERE name = 'AI-пост с картинкой → модерация → Telegram'
  AND graph->'edges'->2->>'id' = 'e3'
  AND graph->'edges'->3->>'id' = 'e4';

-- +goose Down
UPDATE workflow_templates
SET graph = jsonb_set(
    jsonb_set(graph, '{edges,2}', (graph->'edges'->2) - 'targetHandle'),
    '{edges,3}', (graph->'edges'->3) - 'targetHandle'
)
WHERE name = 'AI-пост с картинкой → модерация → Telegram';
