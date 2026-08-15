-- +goose Up

ALTER TABLE ad_studio_templates
    ADD COLUMN generation_mode VARCHAR(32) NOT NULL DEFAULT 'combine';

UPDATE ad_studio_templates
SET generation_mode = CASE
    WHEN media_kind = 'video' THEN 'reference-to-video'
    ELSE 'combine'
END;

ALTER TABLE ad_studio_templates
    ADD CONSTRAINT ad_studio_templates_generation_mode_check CHECK (
        generation_mode IN (
            'text-to-image',
            'image-to-image',
            'combine',
            'text-to-video',
            'image-to-video',
            'reference-to-video'
        )
    );

-- +goose Down

ALTER TABLE ad_studio_templates
    DROP CONSTRAINT IF EXISTS ad_studio_templates_generation_mode_check;
ALTER TABLE ad_studio_templates
    DROP COLUMN IF EXISTS generation_mode;
