-- +goose Up

CREATE TABLE sketch_styles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    positive_prompt TEXT NOT NULL,
    negative_prompt TEXT NOT NULL DEFAULT '',
    default_strength REAL NOT NULL DEFAULT 0.65
        CHECK (default_strength >= 0 AND default_strength <= 1),
    aspect_ratio VARCHAR(16) NOT NULL DEFAULT '1:1',
    preview_s3_key TEXT NOT NULL DEFAULT '',
    preview_content_type VARCHAR(100) NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sketch_styles_published_idx
    ON sketch_styles (is_published, sort_order, created_at DESC);

INSERT INTO sketch_styles (title, description, positive_prompt, negative_prompt, default_strength, aspect_ratio, sort_order, is_published)
VALUES
    (
        'Фотореализм',
        'Студийное фото, естественный свет',
        'photorealistic, studio photography, natural lighting, sharp focus, 8k, highly detailed',
        'cartoon, sketch lines, blurry, low quality, deformed',
        0.7,
        '1:1',
        10,
        TRUE
    ),
    (
        '3D иллюстрация',
        'Мягкий 3D-рендер в стиле Pixar',
        '3D render, Pixar style, soft lighting, vibrant colors, clean shapes, octane render',
        'photo, realistic, sketch, messy lines',
        0.65,
        '1:1',
        20,
        TRUE
    ),
    (
        'Акварель',
        'Лёгкая акварельная иллюстрация',
        'watercolor painting, soft washes, paper texture, artistic illustration, delicate colors',
        'photo, 3d, harsh lines, digital noise',
        0.55,
        '1:1',
        30,
        TRUE
    ),
    (
        'Киберпанк',
        'Неоновый футуристический стиль',
        'cyberpunk, neon lights, futuristic city, cinematic, high contrast, glowing accents',
        'daylight, pastoral, sketch, low detail',
        0.6,
        '16:9',
        40,
        TRUE
    ),
    (
        'Минимализм',
        'Чистая плоская иллюстрация для соцсетей',
        'minimal flat illustration, clean vector style, bold shapes, modern social media graphic',
        'photo, cluttered, noisy, sketch lines',
        0.5,
        '1:1',
        50,
        TRUE
    );

-- +goose Down

DROP TABLE IF EXISTS sketch_styles;
