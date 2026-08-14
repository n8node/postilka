-- +goose Up

UPDATE agent_templates
SET
    name = 'Ai агент',
    description = 'Ведёт от цели и показателя к связному ходу публикаций, черновикам и разбору результата. Публикация только после вашего разрешения.',
    prompt = replace(prompt, 'Ты агент «Задача продвижения» внутри Postilka.', 'Ты Ai агент внутри Postilka.'),
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND kind = 'system';

-- +goose Down

UPDATE agent_templates
SET
    name = 'Задача продвижения',
    description = 'Ведёт от цели и показателя к связному ходу публикаций, черновикам и разбору результата. Публикация только после вашего разрешения.',
    prompt = replace(prompt, 'Ты Ai агент внутри Postilka.', 'Ты агент «Задача продвижения» внутри Postilka.'),
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND kind = 'system';
