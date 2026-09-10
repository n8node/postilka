-- +goose Up
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM generation_nav_items
        WHERE href = '/ai?tab=carousel'
    ) THEN
        UPDATE generation_nav_items
        SET position = position + 1,
            updated_at = NOW()
        WHERE position >= 4;

        INSERT INTO generation_nav_items (
            title,
            subtitle,
            href,
            position,
            visible,
            featured,
            icon_kind,
            icon_name
        ) VALUES (
            'Карусель',
            'до 6 слайдов',
            '/ai?tab=carousel',
            4,
            TRUE,
            FALSE,
            'lucide',
            'GalleryHorizontalEnd'
        );
    END IF;
END $$;

-- +goose Down
DELETE FROM generation_nav_items
WHERE href = '/ai?tab=carousel';

UPDATE generation_nav_items
SET position = position - 1,
    updated_at = NOW()
WHERE position > 4;
