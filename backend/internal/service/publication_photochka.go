package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"strings"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/photochka"
)

func (s *PublicationService) publishPhotochka(
	ctx context.Context,
	post *model.Post,
	target model.PostTarget,
	channel *model.Channel,
	content model.PostContent,
	apiKey string,
) (string, error) {
	if s.photochka == nil {
		return "", fmt.Errorf("интеграция Photochka недоступна")
	}
	if strings.TrimSpace(target.ProviderPostID) != "" {
		return target.ProviderPostID, nil
	}

	uploadIDs, err := s.photochkaUploadIDs(ctx, post, apiKey)
	if err != nil {
		return "", err
	}
	if len(post.Media) > 0 && len(uploadIDs) == 0 {
		return "", fmt.Errorf("%w: не удалось подготовить медиа для Photochka", ErrInvalidPost)
	}

	caption := strings.TrimSpace(readableProviderText(content))
	postResult, err := s.photochka.CreatePost(ctx, apiKey, photochka.CreatePostRequest{
		UploadIDs: uploadIDs,
		Caption:   caption,
		Hashtags:  []string{},
		Status:    "published",
	})
	if err != nil {
		if errors.Is(err, photochka.ErrUnauthorized) {
			return "", fmt.Errorf("API-ключ Photochka недействителен — переподключите канал")
		}
		return "", fmt.Errorf("не удалось опубликовать в Photochka: %w", err)
	}
	if strings.TrimSpace(postResult.ID) == "" {
		return "", fmt.Errorf("Photochka не вернула id поста")
	}
	return postResult.ID, nil
}

func (s *PublicationService) photochkaUploadIDs(
	ctx context.Context,
	post *model.Post,
	apiKey string,
) ([]string, error) {
	if len(post.Media) == 0 {
		return nil, nil
	}
	if s.files == nil || s.storage == nil {
		return nil, fmt.Errorf("хранилище медиа недоступно")
	}

	const maxBytes = 100 << 20
	uploadIDs := make([]string, 0, len(post.Media))
	for _, attached := range post.Media {
		file, err := s.files.GetByID(ctx, post.WorkspaceID, attached.FileID, false)
		if err != nil {
			return nil, fmt.Errorf("медиафайл не найден или удалён")
		}
		body, contentType, err := s.storage.GetObject(ctx, file.S3Key)
		if err != nil {
			return nil, fmt.Errorf("не удалось прочитать медиафайл для публикации")
		}
		data, err := io.ReadAll(io.LimitReader(body, maxBytes+1))
		body.Close()
		if err != nil {
			return nil, fmt.Errorf("не удалось прочитать медиафайл для публикации")
		}
		if len(data) == 0 {
			return nil, fmt.Errorf("%w: пустой медиафайл", ErrInvalidPost)
		}
		if len(data) > maxBytes {
			return nil, fmt.Errorf("%w: медиафайл Photochka не должен превышать %d МБ", ErrInvalidPost, maxBytes>>20)
		}
		if contentType == "" {
			contentType = file.MimeType
		}
		mime := strings.ToLower(strings.TrimSpace(strings.Split(contentType, ";")[0]))
		filename := strings.TrimSpace(file.Name)
		if filename == "" {
			filename = "upload"
		}

		var uploadID string
		switch {
		case strings.HasPrefix(mime, "video/"):
			uploadID, err = s.photochka.UploadVideo(ctx, apiKey, data, mime, filename)
		case strings.HasPrefix(mime, "image/"):
			uploadID, err = s.photochka.UploadMedia(ctx, apiKey, bytes.NewReader(data), filename, mime)
		default:
			return nil, fmt.Errorf("%w: Photochka поддерживает только изображения и видео", ErrInvalidPost)
		}
		if err != nil {
			if errors.Is(err, photochka.ErrUnauthorized) {
				return nil, fmt.Errorf("API-ключ Photochka недействителен — переподключите канал")
			}
			if errors.Is(err, photochka.ErrAPI) && strings.Contains(strings.ToLower(err.Error()), "unsupported file type") {
				return nil, fmt.Errorf("%w: Photochka не поддерживает формат %s (допустимы JPEG, PNG, WebP, GIF, HEIC/AVIF; видео: MP4, MOV, WebM)", ErrInvalidPost, mime)
			}
			return nil, fmt.Errorf("не удалось загрузить медиа в Photochka: %w", err)
		}
		uploadIDs = append(uploadIDs, uploadID)
	}
	return uploadIDs, nil
}
