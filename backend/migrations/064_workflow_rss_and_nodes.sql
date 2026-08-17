-- +goose Up

ALTER TABLE workflows
    ADD COLUMN IF NOT EXISTS rss_feed_url TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS rss_poll_interval_minutes INT NOT NULL DEFAULT 15;

CREATE INDEX IF NOT EXISTS idx_workflows_rss_poll
    ON workflows(is_active, next_run_at)
    WHERE is_active = true AND trigger_type = 'rss';

CREATE TABLE IF NOT EXISTS workflow_rss_seen (
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    item_key TEXT NOT NULL,
    seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workflow_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_workflow_rss_seen_workflow ON workflow_rss_seen(workflow_id, seen_at DESC);

INSERT INTO workflow_templates (name, description, category, icon, is_system, is_active, sort_order, graph)
VALUES
(
    'AI-пост с картинкой → модерация → Telegram',
    'Генерирует текст и изображение, собирает пост через Merge и отправляет на проверку перед публикацией в Telegram',
    'ai-content',
    'sparkles',
    true,
    true,
    4,
    '{
        "nodes": [
            {"id": "trigger_1", "type": "trigger", "position": {"x": 80, "y": 200}, "data": {"title": "По расписанию", "triggerType": "schedule", "scheduleCron": "0 10 * * 1-5"}},
            {"id": "ai_text_1", "type": "ai_text", "position": {"x": 320, "y": 120}, "data": {"title": "Текст поста", "prompt": "Напиши короткий пост для Telegram на тему трендов маркетинга 2026. Добавь хештеги.", "role": "SMM-копирайтер", "temperature": 0.7}},
            {"id": "ai_image_1", "type": "ai_image", "position": {"x": 320, "y": 280}, "data": {"title": "Обложка", "prompt": "Минималистичная иллюстрация к посту о маркетинге, 4k", "aspectRatio": "1:1"}},
            {"id": "merge_1", "type": "merge", "position": {"x": 560, "y": 200}, "data": {"title": "Сборка контента", "mode": "combine"}},
            {"id": "formatter_1", "type": "formatter", "position": {"x": 800, "y": 200}, "data": {"title": "Финальный текст", "template": "{{ merge_1.text }}\n\n#postilka"}},
            {"id": "if_1", "type": "logic_condition", "position": {"x": 1040, "y": 200}, "data": {"title": "Текст не пустой", "leftValue": "{{ merge_1.text }}", "operator": "not_empty", "rightValue": ""}},
            {"id": "draft_1", "type": "draft_approval", "position": {"x": 1280, "y": 120}, "data": {"title": "На проверку", "text": "{{ formatter_1.result }}", "notifyOwner": true}},
            {"id": "tg_1", "type": "social_telegram", "position": {"x": 1520, "y": 120}, "data": {"title": "Telegram", "text": "{{ formatter_1.result }}", "mediaUrl": "{{ merge_1.image_url }}", "format": "message"}}
        ],
        "edges": [
            {"id": "e1", "source": "trigger_1", "target": "ai_text_1"},
            {"id": "e2", "source": "trigger_1", "target": "ai_image_1"},
            {"id": "e3", "source": "ai_text_1", "target": "merge_1", "sourceHandle": "text"},
            {"id": "e4", "source": "ai_image_1", "target": "merge_1", "sourceHandle": "image_url"},
            {"id": "e5", "source": "merge_1", "target": "formatter_1"},
            {"id": "e6", "source": "formatter_1", "target": "if_1"},
            {"id": "e7", "source": "if_1", "target": "draft_1", "sourceHandle": "output_0"},
            {"id": "e8", "source": "draft_1", "target": "tg_1"}
        ]
    }'::jsonb
),
(
    'RSS блога → анонс → Telegram + VK',
    'При новой записи в RSS-ленте делает анонс и публикует в подключённые Telegram и VK каналы',
    'automation',
    'rss',
    true,
    true,
    5,
    '{
        "nodes": [
            {"id": "trigger_1", "type": "trigger", "position": {"x": 80, "y": 200}, "data": {"title": "RSS блога", "triggerType": "rss", "rssFeedUrl": "https://example.com/feed.xml", "rssPollIntervalMinutes": 30}},
            {"id": "ai_text_1", "type": "ai_text", "position": {"x": 320, "y": 200}, "data": {"title": "Анонс", "prompt": "Сделай короткий анонс (до 400 символов) для Telegram и VK.\nЗаголовок: {{ trigger_1.title }}\nСсылка: {{ trigger_1.link }}\nОписание: {{ trigger_1.description }}", "role": "Редактор"}},
            {"id": "formatter_1", "type": "formatter", "position": {"x": 560, "y": 200}, "data": {"title": "Текст с ссылкой", "template": "{{ ai_text_1.text }}\n\nЧитать: {{ trigger_1.link }}"}},
            {"id": "loop_1", "type": "loop_items", "position": {"x": 800, "y": 200}, "data": {"title": "Telegram + VK", "itemsSource": "channels", "channelProviders": ["telegram", "vk"]}},
            {"id": "switch_1", "type": "switch", "position": {"x": 1040, "y": 200}, "data": {"title": "Маршрут по сети", "mode": "rules", "rule0_label": "Telegram", "rule0_value1": "{{ __loop.current_item_provider }}", "rule0_operator": "equals", "rule0_value2": "telegram", "rule1_label": "VK", "rule1_value1": "{{ __loop.current_item_provider }}", "rule1_operator": "equals", "rule1_value2": "vk", "enableFallback": false}},
            {"id": "tg_1", "type": "social_telegram", "position": {"x": 1280, "y": 120}, "data": {"title": "Telegram", "text": "{{ formatter_1.result }}", "channelId": "{{ __loop.current_item_channel_id }}", "format": "message"}},
            {"id": "vk_1", "type": "social_vk", "position": {"x": 1280, "y": 280}, "data": {"title": "ВКонтакте", "text": "{{ formatter_1.result }}", "channelId": "{{ __loop.current_item_channel_id }}", "fromGroup": true}}
        ],
        "edges": [
            {"id": "e1", "source": "trigger_1", "target": "ai_text_1"},
            {"id": "e2", "source": "ai_text_1", "target": "formatter_1"},
            {"id": "e3", "source": "formatter_1", "target": "loop_1"},
            {"id": "e4", "source": "loop_1", "target": "switch_1"},
            {"id": "e5", "source": "switch_1", "target": "tg_1", "sourceHandle": "output_0"},
            {"id": "e6", "source": "switch_1", "target": "vk_1", "sourceHandle": "output_1"}
        ]
    }'::jsonb
),
(
    'Webhook заявки → пост в Telegram',
    'Webhook из формы или CRM запускает сбор полей и генерацию поста о новой заявке',
    'integrations',
    'webhook',
    true,
    true,
    6,
    '{
        "nodes": [
            {"id": "trigger_1", "type": "trigger", "position": {"x": 80, "y": 200}, "data": {"title": "Webhook заявки", "triggerType": "webhook"}},
            {"id": "set_1", "type": "set_fields", "position": {"x": 320, "y": 200}, "data": {"title": "Поля заявки", "fields": [{"key": "client_name", "value": "{{ trigger_1.body.name }}"}, {"key": "client_phone", "value": "{{ trigger_1.body.phone }}"}, {"key": "service", "value": "{{ trigger_1.body.service }}"}]}},
            {"id": "ai_text_1", "type": "ai_text", "position": {"x": 560, "y": 200}, "data": {"title": "Текст поста", "prompt": "Напиши дружелюбный пост для Telegram: новая заявка на услугу «{{ set_1.service }}». Без персональных данных в тексте.", "role": "SMM"}},
            {"id": "if_1", "type": "logic_condition", "position": {"x": 800, "y": 200}, "data": {"title": "Есть имя", "leftValue": "{{ set_1.client_name }}", "operator": "not_empty", "rightValue": ""}},
            {"id": "tg_1", "type": "social_telegram", "position": {"x": 1040, "y": 120}, "data": {"title": "Telegram команда", "text": "{{ ai_text_1.text }}", "format": "message"}}
        ],
        "edges": [
            {"id": "e1", "source": "trigger_1", "target": "set_1"},
            {"id": "e2", "source": "set_1", "target": "ai_text_1"},
            {"id": "e3", "source": "ai_text_1", "target": "if_1"},
            {"id": "e4", "source": "if_1", "target": "tg_1", "sourceHandle": "output_0"}
        ]
    }'::jsonb
);

-- +goose Down

DELETE FROM workflow_templates WHERE name IN (
    'AI-пост с картинкой → модерация → Telegram',
    'RSS блога → анонс → Telegram + VK',
    'Webhook заявки → пост в Telegram'
);

DROP TABLE IF EXISTS workflow_rss_seen;

ALTER TABLE workflows
    DROP COLUMN IF EXISTS rss_feed_url,
    DROP COLUMN IF EXISTS rss_poll_interval_minutes;
