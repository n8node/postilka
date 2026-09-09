-- +goose Up
CREATE TABLE auth_screen_settings (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE,
    logo_s3_key TEXT,
    logo_content_type VARCHAR(100),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO auth_screen_settings (id)
VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE auth_screen_slides (
    slot SMALLINT PRIMARY KEY CHECK (slot BETWEEN 1 AND 4),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    tag VARCHAR(80) NOT NULL DEFAULT '',
    title VARCHAR(160) NOT NULL DEFAULT '',
    description VARCHAR(500) NOT NULL DEFAULT '',
    media_kind VARCHAR(16) NOT NULL DEFAULT '' CHECK (media_kind IN ('', 'image', 'video')),
    media_s3_key TEXT,
    media_content_type VARCHAR(100),
    duration_seconds INTEGER NOT NULL DEFAULT 6 CHECK (duration_seconds BETWEEN 3 AND 60),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO auth_screen_slides (slot)
SELECT generated_slot::smallint
FROM generate_series(1, 4) AS slots(generated_slot)
ON CONFLICT (slot) DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS auth_screen_slides;
DROP TABLE IF EXISTS auth_screen_settings;