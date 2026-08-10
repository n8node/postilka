-- +goose Up
CREATE TABLE kie_video_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    api_base_url TEXT NOT NULL DEFAULT 'https://api.kie.ai',
    api_key_encrypted TEXT NOT NULL DEFAULT '',
    model_text_to_video TEXT NOT NULL DEFAULT '',
    model_image_to_video TEXT NOT NULL DEFAULT '',
    model_reference_to_video TEXT NOT NULL DEFAULT '',
    default_duration_text_to_video INT NOT NULL DEFAULT 5 CHECK (default_duration_text_to_video >= 4 AND default_duration_text_to_video <= 15),
    default_duration_image_to_video INT NOT NULL DEFAULT 5 CHECK (default_duration_image_to_video >= 4 AND default_duration_image_to_video <= 15),
    default_duration_reference_to_video INT NOT NULL DEFAULT 5 CHECK (default_duration_reference_to_video >= 4 AND default_duration_reference_to_video <= 15),
    kopecks_per_video_second INT NOT NULL DEFAULT 500 CHECK (kopecks_per_video_second > 0),
    kopecks_per_reference_video_second INT NOT NULL DEFAULT 800 CHECK (kopecks_per_reference_video_second > 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO kie_video_settings (id) VALUES (1);

CREATE TABLE kie_video_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mode TEXT NOT NULL CHECK (mode IN ('text-to-video', 'image-to-video', 'reference-to-video')),
    prompt TEXT NOT NULL,
    aspect_ratio TEXT NOT NULL DEFAULT '16:9',
    duration INT NOT NULL DEFAULT 5 CHECK (duration >= 4 AND duration <= 15),
    model_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
    kie_task_id TEXT NOT NULL DEFAULT '',
    fail_message TEXT NOT NULL DEFAULT '',
    result_s3_key TEXT NOT NULL DEFAULT '',
    result_content_type TEXT NOT NULL DEFAULT 'video/mp4',
    source_image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kie_video_examples_status ON kie_video_examples (status);
CREATE INDEX idx_kie_video_examples_sort ON kie_video_examples (sort_order, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS kie_video_examples;
DROP TABLE IF EXISTS kie_video_settings;
