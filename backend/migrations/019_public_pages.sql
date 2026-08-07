-- +goose Up
CREATE TABLE public_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(128) NOT NULL UNIQUE,
    meta_description TEXT NOT NULL DEFAULT '',
    external_url TEXT NOT NULL DEFAULT '',
    category VARCHAR(32) NOT NULL DEFAULT 'other',
    provider VARCHAR(32),
    is_published BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT public_pages_category_check CHECK (
        category IN ('instruction', 'help_center', 'legal', 'other')
    )
);

CREATE INDEX idx_public_pages_sort ON public_pages (sort_order ASC, title ASC);
CREATE INDEX idx_public_pages_category ON public_pages (category, sort_order ASC);
CREATE INDEX idx_public_pages_published ON public_pages (is_published, sort_order ASC);

INSERT INTO public_pages (title, slug, meta_description, external_url, category, provider, is_published, sort_order)
VALUES
    (
        'Центр помощи',
        'help',
        'Документация и ответы на частые вопросы',
        'https://postilka.ru/docs',
        'help_center',
        NULL,
        false,
        0
    ),
    (
        'Начало работы',
        'help/getting-started',
        'Первые шаги в Postilka',
        'https://postilka.ru/docs/getting-started',
        'help_center',
        NULL,
        false,
        5
    ),
    (
        'Частые вопросы',
        'help/faq',
        'Ответы на популярные вопросы',
        'https://postilka.ru/docs/faq',
        'help_center',
        NULL,
        false,
        10
    ),
    (
        'Подключение Telegram',
        'help/connect/telegram',
        'Как подключить Telegram-канал или группу',
        'https://postilka.ru/docs/telegram',
        'instruction',
        'telegram',
        false,
        20
    ),
    (
        'Подключение VK',
        'help/connect/vk',
        'Как подключить сообщество ВКонтакте',
        'https://postilka.ru/docs/vk',
        'instruction',
        'vk',
        false,
        30
    ),
    (
        'Подключение OK',
        'help/connect/ok',
        'Как подключить группу Одноклассники',
        'https://postilka.ru/docs/ok',
        'instruction',
        'ok',
        false,
        40
    ),
    (
        'Подключение MAX',
        'help/connect/max',
        'Как подключить канал MAX',
        'https://postilka.ru/docs/max',
        'instruction',
        'max',
        false,
        50
    ),
    (
        'Подключение Rutube',
        'help/connect/rutube',
        'Как подключить канал Rutube',
        'https://postilka.ru/docs/rutube',
        'instruction',
        'rutube',
        false,
        60
    ),
    (
        'Подключение Дзен',
        'help/connect/dzen',
        'Как подключить канал Дзен',
        'https://postilka.ru/docs/dzen',
        'instruction',
        'dzen',
        false,
        70
    );

-- +goose Down
DROP TABLE IF EXISTS public_pages;
