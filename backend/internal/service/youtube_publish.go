package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
)

const (
	maxYouTubeVideoBytes            = 500 << 20
	maxYouTubeShortsDurationSeconds = 60
)

func (s *ChannelTestService) PublishYouTubeVideo(
	ctx context.Context,
	ch *model.Channel,
	token, title, description, mimeType, filename string,
	videoData []byte,
	publishAt *time.Time,
	asShort bool,
) (string, error) {
	if s == nil || s.channels == nil || s.cipher == nil {
		return "", fmt.Errorf("youtube publish unavailable")
	}
	row, err := s.channels.GetRowByID(ctx, ch.WorkspaceID, ch.ID)
	if err != nil {
		return "", err
	}
	clientID, clientSecret, err := youtubeOAuthCredentialsFromRow(row, s.cipher)
	if err != nil {
		return "", err
	}
	client := buildYouTubeOAuthClient(s.youtubeAPI, clientID, clientSecret, "")

	privacy := "public"
	var scheduleAt *time.Time
	if publishAt != nil && publishAt.After(time.Now().UTC()) {
		privacy = "private"
		t := publishAt.UTC()
		scheduleAt = &t
	}

	return client.UploadVideo(ctx, token, oauthclient.YouTubeVideoUploadInput{
		Title:         title,
		Description:   description,
		PrivacyStatus: privacy,
		PublishAt:     scheduleAt,
		MIMEType:      mimeType,
		Filename:      filename,
		Data:          videoData,
		Short:         asShort,
	})
}

func (s *PublicationService) youtubeVideoFile(
	ctx context.Context,
	post *model.Post,
	requireShorts bool,
) ([]byte, string, string, error) {
	if s.files == nil || s.storage == nil {
		return nil, "", "", fmt.Errorf("хранилище медиа недоступно")
	}
	if len(post.Media) != 1 {
		return nil, "", "", fmt.Errorf("%w: для YouTube нужен ровно один видеофайл", ErrInvalidPost)
	}
	file, err := s.files.GetByID(ctx, post.WorkspaceID, post.Media[0].FileID, false)
	if err != nil {
		return nil, "", "", fmt.Errorf("медиафайл не найден или удалён")
	}
	mime := strings.ToLower(strings.TrimSpace(strings.Split(file.MimeType, ";")[0]))
	if !strings.HasPrefix(mime, "video/") {
		return nil, "", "", fmt.Errorf("%w: YouTube поддерживает только видео", ErrInvalidPost)
	}
	if requireShorts {
		if err := validateYouTubeShortsFile(file); err != nil {
			return nil, "", "", err
		}
	}
	body, contentType, err := s.storage.GetObject(ctx, file.S3Key)
	if err != nil {
		return nil, "", "", fmt.Errorf("не удалось прочитать видео для публикации")
	}
	defer body.Close()
	data, err := io.ReadAll(io.LimitReader(body, maxYouTubeVideoBytes+1))
	if err != nil {
		return nil, "", "", fmt.Errorf("не удалось прочитать видео для публикации")
	}
	if len(data) == 0 {
		return nil, "", "", fmt.Errorf("%w: пустой видеофайл", ErrInvalidPost)
	}
	if len(data) > maxYouTubeVideoBytes {
		return nil, "", "", fmt.Errorf(
			"%w: видео YouTube не должно превышать %d МБ",
			ErrInvalidPost,
			maxYouTubeVideoBytes>>20,
		)
	}
	if contentType == "" {
		contentType = file.MimeType
	}
	filename := strings.TrimSpace(file.Name)
	if filename == "" {
		filename = "video.mp4"
	}
	return data, contentType, filename, nil
}

func validateYouTubeShortsFile(file *model.WorkspaceFile) error {
	if file == nil {
		return fmt.Errorf("%w: медиафайл не найден", ErrInvalidPost)
	}
	duration := mediaDurationSeconds(file.MediaMetadata)
	if duration != nil && *duration > maxYouTubeShortsDurationSeconds {
		return fmt.Errorf(
			"%w: YouTube Shorts — не более %d секунд (у файла %d с)",
			ErrInvalidPost,
			maxYouTubeShortsDurationSeconds,
			*duration,
		)
	}
	return nil
}

func mediaDurationSeconds(raw json.RawMessage) *int {
	if len(raw) == 0 {
		return nil
	}
	var meta struct {
		DurationSeconds int `json:"duration_seconds"`
	}
	if err := json.Unmarshal(raw, &meta); err != nil || meta.DurationSeconds <= 0 {
		return nil
	}
	return &meta.DurationSeconds
}

func youtubeVideoDescription(content model.PostContent) string {
	text := readableProviderText(content)
	return strings.TrimSpace(text)
}

func publishYouTubeFormat(format string) (asShort bool, ok bool) {
	switch strings.ToLower(strings.TrimSpace(format)) {
	case "video":
		return false, true
	case "shorts":
		return true, true
	default:
		return false, false
	}
}
