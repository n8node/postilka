-- +goose Up

ALTER TABLE ad_studio_templates
    DROP CONSTRAINT IF EXISTS ad_studio_templates_category_check;

ALTER TABLE ad_studio_templates
    ADD CONSTRAINT ad_studio_templates_category_check CHECK (
        category IN (
            'product_shot', 'motion', 'ugc', 'ads', 'posters', 'marketplace',
            'viral', 'memes', 'challenges', 'seasonal', 'news', 'formats',
            'popular', 'featuring-you', 'realistic', 'fashion', 'products',
            'movies', 'fantasy', 'anime', 'cartoons'
        )
    );

-- +goose Down

ALTER TABLE ad_studio_templates
    DROP CONSTRAINT IF EXISTS ad_studio_templates_category_check;

ALTER TABLE ad_studio_templates
    ADD CONSTRAINT ad_studio_templates_category_check CHECK (
        category IN (
            'product_shot', 'motion', 'ugc', 'ads', 'posters', 'marketplace',
            'viral', 'memes', 'challenges', 'seasonal', 'news', 'formats'
        )
    );
