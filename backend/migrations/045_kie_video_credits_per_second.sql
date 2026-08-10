-- +goose Up
ALTER TABLE kie_video_settings
    ADD COLUMN credits_per_second_text_to_video INT NOT NULL DEFAULT 5 CHECK (credits_per_second_text_to_video >= 0),
    ADD COLUMN credits_per_second_image_to_video INT NOT NULL DEFAULT 5 CHECK (credits_per_second_image_to_video >= 0),
    ADD COLUMN credits_per_second_reference_to_video INT NOT NULL DEFAULT 8 CHECK (credits_per_second_reference_to_video >= 0);

UPDATE kie_video_settings SET
    credits_per_second_text_to_video = GREATEST(1, token_cost_text_to_video / 10),
    credits_per_second_image_to_video = GREATEST(1, token_cost_image_to_video / 10),
    credits_per_second_reference_to_video = GREATEST(1, token_cost_reference_to_video / 10)
WHERE id = 1;

ALTER TABLE kie_video_settings
    DROP COLUMN token_cost_text_to_video,
    DROP COLUMN token_cost_image_to_video,
    DROP COLUMN token_cost_reference_to_video;

-- +goose Down
ALTER TABLE kie_video_settings
    ADD COLUMN token_cost_text_to_video INT NOT NULL DEFAULT 50 CHECK (token_cost_text_to_video >= 0),
    ADD COLUMN token_cost_image_to_video INT NOT NULL DEFAULT 50 CHECK (token_cost_image_to_video >= 0),
    ADD COLUMN token_cost_reference_to_video INT NOT NULL DEFAULT 75 CHECK (token_cost_reference_to_video >= 0);

UPDATE kie_video_settings SET
    token_cost_text_to_video = credits_per_second_text_to_video * 10,
    token_cost_image_to_video = credits_per_second_image_to_video * 10,
    token_cost_reference_to_video = credits_per_second_reference_to_video * 10
WHERE id = 1;

ALTER TABLE kie_video_settings
    DROP COLUMN credits_per_second_text_to_video,
    DROP COLUMN credits_per_second_image_to_video,
    DROP COLUMN credits_per_second_reference_to_video;
