-- +goose Up
CREATE TABLE upload_file_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO upload_file_settings (id, config) VALUES (1, '{
  "allowed_extensions": [
    "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "heif", "tiff", "tif", "ico",
    "mp4", "mov", "avi", "mkv", "webm", "m4v", "mpeg", "mpg", "wmv", "flv",
    "mp3", "wav", "ogg", "m4a", "aac", "flac", "wma",
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf", "md",
    "zip", "rar", "7z", "tar", "gz", "bz2"
  ],
  "max_size_image_mb": 150,
  "max_size_video_mb": 500,
  "max_size_audio_mb": 100,
  "max_size_archive_mb": 200,
  "max_size_other_mb": 512
}'::jsonb);

ALTER TABLE plans ADD COLUMN max_file_size_bytes BIGINT;

UPDATE plans
SET max_file_size_bytes = 104857600
WHERE slug = 'free';

-- +goose Down
ALTER TABLE plans DROP COLUMN IF EXISTS max_file_size_bytes;
DROP TABLE IF EXISTS upload_file_settings;
