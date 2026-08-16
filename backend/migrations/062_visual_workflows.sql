-- +goose Up

CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    trigger_type TEXT NOT NULL DEFAULT 'manual',
    schedule_cron TEXT NOT NULL DEFAULT '',
    schedule_tz TEXT NOT NULL DEFAULT 'Europe/Moscow',
    next_run_at TIMESTAMPTZ,
    graph JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_workspace_id ON workflows(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflows_active_next_run ON workflows(is_active, next_run_at) WHERE is_active = true AND next_run_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general',
    icon TEXT NOT NULL DEFAULT 'workflow',
    is_system BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    graph JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}'::jsonb,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_active ON workflow_templates(is_active, sort_order ASC);

CREATE TABLE IF NOT EXISTS workflow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    trigger_source TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT NOT NULL DEFAULT '',
    context_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    tokens_used INT NOT NULL DEFAULT 0,
    credits_used INT NOT NULL DEFAULT 0,
    kopecks_spent INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id ON workflow_runs(workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workspace_id ON workflow_runs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);

CREATE TABLE IF NOT EXISTS workflow_run_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    node_type TEXT NOT NULL,
    node_title TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
    outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT NOT NULL DEFAULT '',
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    duration_ms INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_workflow_run_steps_run_id ON workflow_run_steps(run_id);

-- System templates seeding
INSERT INTO workflow_templates (name, description, category, icon, is_system, is_active, sort_order, graph)
VALUES
(
    'Кросс-постинг с AI: Telegram и VK',
    'Генерация рекламного или информационного поста через AI и автоматическая публикация в Telegram и ВКонтакте',
    'social',
    'share-2',
    true,
    true,
    1,
    '{
        "nodes": [
            {
                "id": "trigger_1",
                "type": "trigger",
                "position": {"x": 50, "y": 150},
                "data": {"title": "Ручной запуск", "triggerType": "manual"}
            },
            {
                "id": "ai_text_1",
                "type": "ai_text",
                "position": {"x": 350, "y": 150},
                "data": {
                    "title": "AI Генерация текста",
                    "prompt": "Напиши полезный пост для соцсетей на тему: тренды маркетинга в 2026 году. Добавь призыв к действию и хештеги.",
                    "role": "SMM-копирайтер",
                    "temperature": 0.7
                }
            },
            {
                "id": "telegram_1",
                "type": "social_telegram",
                "position": {"x": 700, "y": 50},
                "data": {
                    "title": "Telegram Канал",
                    "text": "{{ ai_text_1.text }}",
                    "format": "message",
                    "silent": false,
                    "pin": false
                }
            },
            {
                "id": "vk_1",
                "type": "social_vk",
                "position": {"x": 700, "y": 280},
                "data": {
                    "title": "ВКонтакте Стена",
                    "text": "{{ ai_text_1.text }}",
                    "fromGroup": true,
                    "signed": false
                }
            }
        ],
        "edges": [
            {"id": "e1", "source": "trigger_1", "target": "ai_text_1"},
            {"id": "e2", "source": "ai_text_1", "target": "telegram_1"},
            {"id": "e3", "source": "ai_text_1", "target": "vk_1"}
        ]
    }'::jsonb
),
(
    'Генерация и публикация YouTube Shorts',
    'Создание сценария ролика, генерация видео через нейросеть и публикация в YouTube Shorts',
    'video',
    'video',
    true,
    true,
    2,
    '{
        "nodes": [
            {
                "id": "trigger_1",
                "type": "trigger",
                "position": {"x": 50, "y": 150},
                "data": {"title": "Запуск процесса", "triggerType": "manual"}
            },
            {
                "id": "ai_text_1",
                "type": "ai_text",
                "position": {"x": 350, "y": 150},
                "data": {
                    "title": "Сценарий ролика",
                    "prompt": "Придумай краткий динамичный сценарий для Shorts на 15 секунд про космические открытия.",
                    "role": "Сценарист коротких видео"
                }
            },
            {
                "id": "ai_video_1",
                "type": "ai_video",
                "position": {"x": 680, "y": 150},
                "data": {
                    "title": "AI Видео",
                    "prompt": "{{ ai_text_1.text }}",
                    "aspectRatio": "9:16",
                    "durationSeconds": 5
                }
            },
            {
                "id": "youtube_1",
                "type": "social_youtube",
                "position": {"x": 1000, "y": 150},
                "data": {
                    "title": "YouTube Shorts",
                    "titleText": "Космические открытия 2026 #shorts",
                    "description": "{{ ai_text_1.text }}\n\nПодписывайтесь на канал!",
                    "format": "shorts",
                    "privacyStatus": "public",
                    "videoUrl": "{{ ai_video_1.video_url }}"
                }
            }
        ],
        "edges": [
            {"id": "e1", "source": "trigger_1", "target": "ai_text_1"},
            {"id": "e2", "source": "ai_text_1", "target": "ai_video_1"},
            {"id": "e3", "source": "ai_video_1", "target": "youtube_1"}
        ]
    }'::jsonb
),
(
    'Пост с AI-картинкой и инлайн-кнопкой',
    'Генерация текста и фотореалистичной обложки нейросетью с публикацией в Telegram с интерактивной кнопкой',
    'ai',
    'sparkles',
    true,
    true,
    3,
    '{
        "nodes": [
            {
                "id": "trigger_1",
                "type": "trigger",
                "position": {"x": 50, "y": 150},
                "data": {"title": "Ручной пуск", "triggerType": "manual"}
            },
            {
                "id": "ai_text_1",
                "type": "ai_text",
                "position": {"x": 350, "y": 80},
                "data": {
                    "title": "Текст анонса",
                    "prompt": "Напиши яркий анонс вебинара по AI инструментам для предпринимателей.",
                    "role": "Копирайтер"
                }
            },
            {
                "id": "ai_image_1",
                "type": "ai_image",
                "position": {"x": 350, "y": 300},
                "data": {
                    "title": "Генерация обложки",
                    "prompt": "Futuristic clean digital workspace with holograms, neon blue aesthetic, 4k",
                    "aspectRatio": "16:9"
                }
            },
            {
                "id": "telegram_1",
                "type": "social_telegram",
                "position": {"x": 750, "y": 180},
                "data": {
                    "title": "Telegram с кнопкой",
                    "text": "{{ ai_text_1.text }}",
                    "mediaUrl": "{{ ai_image_1.image_url }}",
                    "buttons": [
                        {"text": "Зарегистрироваться 🚀", "url": "https://postilka.ru"}
                    ]
                }
            }
        ],
        "edges": [
            {"id": "e1", "source": "trigger_1", "target": "ai_text_1"},
            {"id": "e2", "source": "trigger_1", "target": "ai_image_1"},
            {"id": "e3", "source": "ai_text_1", "target": "telegram_1"},
            {"id": "e4", "source": "ai_image_1", "target": "telegram_1"}
        ]
    }'::jsonb
);

-- Update existing templates in case migration was already executed
UPDATE workflow_templates
SET 
    description = 'Генерация рекламного или информационного поста через AI и автоматическая публикация в Telegram и ВКонтакте',
    graph = regexp_replace(regexp_replace(graph::text, 'yandex_gpt_', 'ai_text_', 'g'), 'Yandex GPT Генерация', 'AI Генерация текста', 'g')::jsonb
WHERE name = 'Кросс-постинг с AI: Telegram и VK';

UPDATE workflow_templates
SET 
    description = 'Создание сценария ролика, генерация видео через нейросеть и публикация в YouTube Shorts',
    graph = regexp_replace(regexp_replace(regexp_replace(graph::text, 'yandex_gpt_', 'ai_text_', 'g'), 'kie_video_', 'ai_video_', 'g'), 'KIE.ai Видео', 'AI Видео', 'g')::jsonb
WHERE name = 'Генерация и публикация YouTube Shorts';

UPDATE workflow_templates
SET 
    description = 'Генерация текста и фотореалистичной обложки нейросетью с публикацией в Telegram с интерактивной кнопкой',
    graph = regexp_replace(regexp_replace(regexp_replace(graph::text, 'yandex_gpt_', 'ai_text_', 'g'), 'kie_image_', 'ai_image_', 'g'), 'KIE Image', 'AI Изображение', 'g')::jsonb
WHERE name = 'Пост с AI-картинкой и инлайн-кнопкой';

-- Update any user workflows created from old templates
UPDATE workflows
SET graph = regexp_replace(regexp_replace(regexp_replace(graph::text, 'yandex_gpt_', 'ai_text_', 'g'), 'kie_video_', 'ai_video_', 'g'), 'kie_image_', 'ai_image_', 'g')::jsonb
WHERE graph::text LIKE '%yandex_gpt_%' OR graph::text LIKE '%kie_video_%' OR graph::text LIKE '%kie_image_%';

-- +goose Down

DROP TABLE IF EXISTS workflow_run_steps;
DROP TABLE IF EXISTS workflow_runs;
DROP TABLE IF EXISTS workflow_templates;
DROP TABLE IF EXISTS workflows;
