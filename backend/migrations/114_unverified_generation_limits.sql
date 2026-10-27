-- +goose Up
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS unverified_image_generations INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unverified_video_generations INTEGER NOT NULL DEFAULT 0;

-- Existing successful generations count toward the lifetime allowance.
UPDATE users u
SET unverified_image_generations = LEAST(5, COALESCE((
    SELECT COUNT(*) FROM ai_generations g
    WHERE g.user_id = u.id
      AND g.mode NOT IN ('text-to-video', 'image-to-video', 'reference-to-video')
      AND (g.result_content_type IS NULL OR g.result_content_type NOT LIKE 'video/%')
), 0)),
    unverified_video_generations = LEAST(2, COALESCE((
    SELECT COUNT(*) FROM ai_generations g
    WHERE g.user_id = u.id
      AND (g.mode IN ('text-to-video', 'image-to-video', 'reference-to-video')
           OR (g.result_content_type IS NOT NULL AND g.result_content_type LIKE 'video/%'))
), 0))
WHERE u.email_verified_at IS NULL;

-- +goose Down
ALTER TABLE users
    DROP COLUMN IF EXISTS unverified_video_generations,
    DROP COLUMN IF EXISTS unverified_image_generations;