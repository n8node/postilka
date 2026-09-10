-- +goose Up
UPDATE generation_nav_items
SET position = position + 1,
    updated_at = NOW()
WHERE position >= 4
  AND NOT EXISTS (
      SELECT 1
      FROM generation_nav_items
      WHERE href = '/ai?tab=carousel'
  );

INSERT INTO generation_nav_items (
    title,
    subtitle,
    href,
    position,
    visible,
    featured,
    icon_kind,
    icon_name
)
SELECT
    'Карусель',
    'до 6 слайдов',
    '/ai?tab=carousel',
    4,
    TRUE,
    FALSE,
    'lucide',
    'GalleryHorizontalEnd'
WHERE NOT EXISTS (
    SELECT 1
    FROM generation_nav_items
    WHERE href = '/ai?tab=carousel'
);

-- +goose Down
DELETE FROM generation_nav_items
WHERE href = '/ai?tab=carousel';

UPDATE generation_nav_items
SET position = position - 1,
    updated_at = NOW()
WHERE position > 4;
