package service

import (
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
)

const maxYouTubeVideoBytes = 500 << 20

func (s *ChannelTestService) PublishYouTubeVideo(
	ctx context.Context,
	ch *model.Channel,
	token, title, description, mimeType, filename string,
	videoData []byte,
	publishAt *time.Time,
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
	})
}

func (s *PublicationService) youtubeVideoFile(ctx context.Context, post *model.Post) ([]byte, string, string, error) {
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

func youtubeVideoDescription(content model.PostContent) string {
	text := readableProviderText(content)
	return strings.TrimSpace(text)
}
