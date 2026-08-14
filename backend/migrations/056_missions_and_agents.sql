-- +goose Up

CREATE TABLE agent_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    kind VARCHAR(16) NOT NULL,
    slug VARCHAR(64) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    prompt TEXT NOT NULL,
    tools JSONB NOT NULL DEFAULT '[]'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    require_approval BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT agent_templates_kind_check CHECK (kind IN ('system', 'user')),
    CONSTRAINT agent_templates_system_ws CHECK (
        (kind = 'system' AND workspace_id IS NULL)
        OR (kind = 'user' AND workspace_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX agent_templates_system_slug_idx
    ON agent_templates (slug) WHERE kind = 'system';
CREATE UNIQUE INDEX agent_templates_user_slug_idx
    ON agent_templates (workspace_id, slug) WHERE kind = 'user';
CREATE INDEX agent_templates_workspace_idx
    ON agent_templates (workspace_id, updated_at DESC) WHERE workspace_id IS NOT NULL;

CREATE TABLE missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    agent_template_id UUID REFERENCES agent_templates(id) ON DELETE SET NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(300) NOT NULL,
    goal TEXT NOT NULL DEFAULT '',
    metric VARCHAR(32) NOT NULL DEFAULT 'clicks',
    metric_target INTEGER,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    channel_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    frequency TEXT NOT NULL DEFAULT '',
    constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
    brief JSONB NOT NULL DEFAULT '{}'::jsonb,
    plan JSONB NOT NULL DEFAULT '{}'::jsonb,
    measurability VARCHAR(16) NOT NULL DEFAULT 'partial',
    result JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT missions_status_check CHECK (
        status IN (
            'draft', 'clarifying', 'planning', 'pending_approval',
            'running', 'completed', 'canceled'
        )
    ),
    CONSTRAINT missions_metric_check CHECK (
        metric IN ('clicks', 'likes', 'reach', 'subscribers', 'manual')
    ),
    CONSTRAINT missions_measurability_check CHECK (
        measurability IN ('automatic', 'partial', 'manual')
    ),
    CONSTRAINT missions_workspace_id_id_unique UNIQUE (workspace_id, id)
);

CREATE INDEX missions_workspace_updated_idx ON missions (workspace_id, updated_at DESC);
CREATE INDEX missions_workspace_status_idx ON missions (workspace_id, status);

CREATE TABLE mission_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    mission_id UUID NOT NULL,
    role VARCHAR(16) NOT NULL,
    content TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT mission_messages_role_check CHECK (role IN ('user', 'assistant', 'system')),
    CONSTRAINT mission_messages_mission_fk FOREIGN KEY (workspace_id, mission_id)
        REFERENCES missions (workspace_id, id) ON DELETE CASCADE
);

CREATE INDEX mission_messages_mission_idx ON mission_messages (mission_id, created_at);

ALTER TABLE posts
    ADD COLUMN mission_id UUID,
    ADD COLUMN origin VARCHAR(16) NOT NULL DEFAULT 'user',
    ADD COLUMN plan_manually_changed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE posts
    ADD CONSTRAINT posts_origin_check CHECK (origin IN ('user', 'agent')),
    ADD CONSTRAINT posts_mission_fk FOREIGN KEY (mission_id)
        REFERENCES missions (id) ON DELETE SET NULL;

CREATE INDEX posts_mission_idx ON posts (mission_id) WHERE mission_id IS NOT NULL;
CREATE INDEX posts_origin_idx ON posts (workspace_id, origin);

INSERT INTO agent_templates (
    id, kind, slug, name, description, prompt, tools, require_approval, is_active
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'system',
    'promotion-mission',
    'Задача продвижения',
    'Ведёт от цели и показателя к связному ходу публикаций, черновикам и разбору результата. Публикация только после вашего разрешения.',
    $prompt$Ты агент «Задача продвижения» внутри Postilka. Ты ведёшь пользователя по пути:
задача → цель и показатель → продукт и аудитория → наблюдения по данным проекта → проверяемые замыслы → связный ход публикаций → материалы → разрешение → запуск → разбор результата.

Правила:
- Отвечай по-русски, кратко и по делу.
- Не публикуй посты в сети. Ты только уточняешь задачу, предлагаешь ход и готовишь черновики.
- Новые варианты — черновики. Публикация и изменение утверждённого хода требуют явного разрешения человека.
- Не объявляй причинность по одному результату. Разделяй: наблюдение, предположение, подтверждённая закономерность, недостаточно данных.
- Публикации в ходе имеют роли: внимание, проблема, доказательство, выбор, снятие сомнения, действие.
- Используй только каналы и факты из контекста. Не выдумывай метрики и подписчиков.
- Если данных мало — скажи об этом и задай один-два уточняющих вопроса.

Формат ответа: только JSON-объект без markdown:
{
  "reply": "текст пользователю",
  "mission_patch": null или {
    "title": "",
    "goal": "",
    "metric": "clicks|likes|reach|subscribers|manual",
    "metric_target": 0,
    "frequency": "",
    "brief": {"product": "", "audience": "", "observations": ""}
  },
  "plan": null или {
    "items": [
      {
        "role": "attention|problem|proof|choice|objection|action",
        "due_at": "RFC3339",
        "channel_ids": ["uuid"],
        "text": "текст черновика"
      }
    ]
  }
}
Поле plan заполняй, только когда пользователь просит составить ход или данных уже достаточно. mission_patch — только изменённые поля.$prompt$,
    '["update_mission","propose_plan"]'::jsonb,
    TRUE,
    TRUE
);

-- +goose Down

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_mission_fk;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_origin_check;
DROP INDEX IF EXISTS posts_origin_idx;
DROP INDEX IF EXISTS posts_mission_idx;
ALTER TABLE posts DROP COLUMN IF EXISTS plan_manually_changed;
ALTER TABLE posts DROP COLUMN IF EXISTS origin;
ALTER TABLE posts DROP COLUMN IF EXISTS mission_id;

DROP TABLE IF EXISTS mission_messages;
DROP TABLE IF EXISTS missions;
DROP TABLE IF EXISTS agent_templates;
