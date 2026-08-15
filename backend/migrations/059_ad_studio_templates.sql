-- +goose Up

CREATE TABLE ad_studio_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category VARCHAR(32) NOT NULL,
    media_kind VARCHAR(16) NOT NULL DEFAULT 'image',
    aspect_ratio VARCHAR(16) NOT NULL DEFAULT '1:1',
    duration INTEGER NOT NULL DEFAULT 5,
    system_prompt TEXT NOT NULL,
    preview_s3_key TEXT NOT NULL DEFAULT '',
    preview_content_type VARCHAR(100) NOT NULL DEFAULT '',
    requires_product BOOLEAN NOT NULL DEFAULT TRUE,
    requires_avatar BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ad_studio_templates_category_check CHECK (
        category IN ('product_shot', 'motion', 'ugc', 'ads', 'posters', 'marketplace')
    ),
    CONSTRAINT ad_studio_templates_media_kind_check CHECK (
        media_kind IN ('image', 'video')
    ),
    CONSTRAINT ad_studio_templates_duration_check CHECK (duration BETWEEN 4 AND 15)
);

CREATE INDEX ad_studio_templates_published_idx
    ON ad_studio_templates (is_published, sort_order, created_at DESC);
CREATE INDEX ad_studio_templates_category_idx
    ON ad_studio_templates (category, sort_order);

-- +goose Down

DROP TABLE IF EXISTS ad_studio_templates;
