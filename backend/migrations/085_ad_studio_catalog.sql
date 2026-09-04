-- +goose Up

ALTER TABLE ad_studio_templates
    ADD COLUMN catalog VARCHAR(16) NOT NULL DEFAULT 'studio';

ALTER TABLE ad_studio_templates
    DROP CONSTRAINT IF EXISTS ad_studio_templates_category_check;

ALTER TABLE ad_studio_templates
    ADD CONSTRAINT ad_studio_templates_catalog_check CHECK (
        catalog IN ('studio', 'trends')
    );

ALTER TABLE ad_studio_templates
    ADD CONSTRAINT ad_studio_templates_category_check CHECK (
        category IN (
            'product_shot', 'motion', 'ugc', 'ads', 'posters', 'marketplace',
            'viral', 'memes', 'challenges', 'seasonal', 'news', 'formats'
        )
    );

CREATE INDEX ad_studio_templates_catalog_idx
    ON ad_studio_templates (catalog, is_published, sort_order, created_at DESC);

-- +goose Down

DROP INDEX IF EXISTS ad_studio_templates_catalog_idx;

ALTER TABLE ad_studio_templates
    DROP CONSTRAINT IF EXISTS ad_studio_templates_category_check;

ALTER TABLE ad_studio_templates
    DROP CONSTRAINT IF EXISTS ad_studio_templates_catalog_check;

ALTER TABLE ad_studio_templates
    ADD CONSTRAINT ad_studio_templates_category_check CHECK (
        category IN ('product_shot', 'motion', 'ugc', 'ads', 'posters', 'marketplace')
    );

ALTER TABLE ad_studio_templates
    DROP COLUMN IF EXISTS catalog;
