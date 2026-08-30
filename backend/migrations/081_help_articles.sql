-- +goose Up
CREATE TABLE help_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    route_key VARCHAR(64) NOT NULL UNIQUE,
    body_html TEXT NOT NULL DEFAULT '',
    excerpt TEXT NOT NULL DEFAULT '',
    is_published BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_help_articles_published ON help_articles (is_published, sort_order ASC, title ASC);

CREATE TABLE help_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_key TEXT NOT NULL,
    content_type VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO help_articles (title, route_key, excerpt, is_published, sort_order)
VALUES
    ('Обзор', 'dashboard', 'Главный экран кабинета', false, 10),
    ('Каналы', 'channels', 'Подключение и статусы каналов', false, 20),
    ('Посты', 'posts', 'Композер и черновики', false, 30),
    ('Календарь', 'calendar', 'Расписание публикаций', false, 40),
    ('Файлы', 'files', 'Медиатека workspace', false, 50),
    ('Процессы', 'workflows', 'Визуальные сценарии', false, 60),
    ('Генерация', 'ai', 'AI-текст, фото и видео', false, 70),
    ('Тарифные планы', 'plans', 'Подписка и кошелёк', false, 80),
    ('Команда', 'team', 'Участники и роли', false, 90),
    ('Аналитика', 'analytics', 'Показатели публикаций', false, 100),
    ('Настройки', 'settings', 'Профиль и workspace', false, 110),
    ('Уведомления', 'notifications', 'События кабинета', false, 120),
    ('Поддержка', 'support', 'Тикеты и ответы', false, 130),
    ('Приглашения', 'invites', 'Приглашение в workspace', false, 140);

-- +goose Down
DROP TABLE IF EXISTS help_images;
DROP TABLE IF EXISTS help_articles;
