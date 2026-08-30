-- +goose Up

UPDATE workflow_templates
SET
    name = 'AI-пост с картинкой → согласование → Telegram',
    description = 'Генерирует текст и изображение, собирает пост и отправляет на согласование перед публикацией в Telegram',
    graph = jsonb_set(
        graph,
        '{nodes}',
        (
            SELECT jsonb_agg(
                CASE
                    WHEN elem->>'id' = 'draft_1' THEN
                        jsonb_set(
                            jsonb_set(elem, '{data,title}', '"Согласование"'),
                            '{data,approverUserIds}',
                            '[]'::jsonb
                        )
                    ELSE elem
                END
            )
            FROM jsonb_array_elements(graph->'nodes') elem
        )
    )
WHERE is_system = true
  AND name LIKE 'AI-пост с картинкой%';

-- +goose Down

UPDATE workflow_templates
SET
    name = 'AI-пост с картинкой → модерация → Telegram',
    description = 'Генерирует текст и изображение, собирает пост через Merge и отправляет на проверку перед публикацией в Telegram'
WHERE is_system = true
  AND name LIKE 'AI-пост с картинкой%';
