-- +goose Up
ALTER TABLE kie_video_settings
    ADD COLUMN token_cost_text_to_video INT NOT NULL DEFAULT 50 CHECK (token_cost_text_to_video >= 0),
    ADD COLUMN token_cost_image_to_video INT NOT NULL DEFAULT 50 CHECK (token_cost_image_to_video >= 0),
    ADD COLUMN token_cost_reference_to_video INT NOT NULL DEFAULT 75 CHECK (token_cost_reference_to_video >= 0),
    ADD COLUMN kopecks_per_media_credit INT NOT NULL DEFAULT 5000 CHECK (kopecks_per_media_credit > 0);

ALTER TABLE kie_video_settings
    DROP COLUMN kopecks_per_video_second,
    DROP COLUMN kopecks_per_reference_video_second;

-- +goose Down
ALTER TABLE kie_video_settings
    ADD COLUMN kopecks_per_video_second INT NOT NULL DEFAULT 500 CHECK (kopecks_per_video_second > 0),
    ADD COLUMN kopecks_per_reference_video_second INT NOT NULL DEFAULT 800 CHECK (kopecks_per_reference_video_second > 0);

ALTER TABLE kie_video_settings
    DROP COLUMN token_cost_text_to_video,
    DROP COLUMN token_cost_image_to_video,
    DROP COLUMN token_cost_reference_to_video,
    DROP COLUMN kopecks_per_media_credit;
