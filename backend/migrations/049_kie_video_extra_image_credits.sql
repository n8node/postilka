-- +goose Up
ALTER TABLE kie_video_settings
    ADD COLUMN credits_per_extra_reference_image INT NOT NULL DEFAULT 3
        CHECK (credits_per_extra_reference_image >= 0);

-- +goose Down
ALTER TABLE kie_video_settings
    DROP COLUMN credits_per_extra_reference_image;
