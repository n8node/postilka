package model

import "time"

type UploadFileSettings struct {
	AllowedExtensions []string `json:"allowed_extensions"`
	MaxSizeImageMB    int      `json:"max_size_image_mb"`
	MaxSizeVideoMB    int      `json:"max_size_video_mb"`
	MaxSizeAudioMB    int      `json:"max_size_audio_mb"`
	MaxSizeArchiveMB  int      `json:"max_size_archive_mb"`
	MaxSizeOtherMB    int      `json:"max_size_other_mb"`
}

type UploadFileSettingsRecord struct {
	Config    UploadFileSettings `json:"config"`
	UpdatedAt time.Time          `json:"updated_at"`
}

type UploadFileLimitsView struct {
	AllowedExtensions      []string `json:"allowed_extensions"`
	MaxSizeImageBytes      int64    `json:"max_size_image_bytes"`
	MaxSizeVideoBytes      int64    `json:"max_size_video_bytes"`
	MaxSizeAudioBytes      int64    `json:"max_size_audio_bytes"`
	MaxSizeArchiveBytes    int64    `json:"max_size_archive_bytes"`
	MaxSizeOtherBytes      int64    `json:"max_size_other_bytes"`
	PlanMaxFileSizeBytes   *int64   `json:"plan_max_file_size_bytes,omitempty"`
	PlanStorageBytes       *int64   `json:"plan_storage_bytes,omitempty"`
	UpdatedAt              time.Time `json:"updated_at"`
}

func DefaultUploadFileSettings() UploadFileSettings {
	return UploadFileSettings{
		AllowedExtensions: []string{
			"jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "heif", "tiff", "tif", "ico",
			"mp4", "mov", "avi", "mkv", "webm", "m4v", "mpeg", "mpg", "wmv", "flv",
			"mp3", "wav", "ogg", "m4a", "aac", "flac", "wma",
			"pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf", "md",
			"zip", "rar", "7z", "tar", "gz", "bz2",
		},
		MaxSizeImageMB:   150,
		MaxSizeVideoMB:   500,
		MaxSizeAudioMB:   100,
		MaxSizeArchiveMB: 200,
		MaxSizeOtherMB:   512,
	}
}
