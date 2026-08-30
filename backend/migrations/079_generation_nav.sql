-- +goose Up
CREATE TABLE generation_nav_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    title TEXT NOT NULL DEFAULT 'Генерация',
    studio_href TEXT NOT NULL DEFAULT '/ai',
    more_href TEXT NOT NULL DEFAULT '/ai',
    preview_limit INTEGER NOT NULL DEFAULT 8,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO generation_nav_settings (id, title, studio_href, more_href, preview_limit)
VALUES (1, 'Генерация', '/ai', '/ai', 8);

CREATE TABLE generation_nav_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    href TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    icon_kind TEXT NOT NULL DEFAULT 'lucide',
    icon_name TEXT NOT NULL DEFAULT 'Sparkles',
    s3_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT generation_nav_items_icon_kind_check CHECK (icon_kind IN ('lucide', 'upload'))
);

CREATE INDEX generation_nav_items_position_idx ON generation_nav_items (position, created_at);

INSERT INTO generation_nav_items (title, subtitle, href, position, visible, featured, icon_kind, icon_name) VALUES
    ('Студия', 'готовые решения', '/ai', 0, TRUE, FALSE, 'lucide', 'LayoutGrid'),
    ('Фото', '3 режима', '/ai?tab=photo', 1, TRUE, FALSE, 'lucide', 'Image'),
    ('Видео', '3 режима', '/ai?tab=video', 2, TRUE, FALSE, 'lucide', 'Film'),
    ('Набросок', 'черновик идеи', '/ai?tab=sketch', 3, TRUE, FALSE, 'lucide', 'Paintbrush'),
    ('Съёмка товара', 'каталог и карточки', '/ai?tab=studio&section=product_shot', 4, TRUE, FALSE, 'lucide', 'Package'),
    ('UGC', 'живые сцены', '/ai?tab=studio&section=ugc', 5, TRUE, FALSE, 'lucide', 'UserRound');

-- +goose Down
DROP TABLE IF EXISTS generation_nav_items;
DROP TABLE IF EXISTS generation_nav_settings;
