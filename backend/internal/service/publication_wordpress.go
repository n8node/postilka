package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"path"
	"strconv"
	"strings"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/wordpress"
)

func (s *PublicationService) publishWordPress(
	ctx context.Context,
	post *model.Post,
	target model.PostTarget,
	channel *model.Channel,
	content model.PostContent,
	appPassword string,
) (string, error) {
	if s.wordpress == nil {
		return "", fmt.Errorf("интеграция WordPress недоступна")
	}
	if strings.TrimSpace(target.ProviderPostID) != "" {
		return target.ProviderPostID, nil
	}

	siteURL, username, err := wordpressPublishAuth(channel)
	if err != nil {
		return "", err
	}

	title, html, err := wordpressArticlePayload(content)
	if err != nil {
		return "", err
	}

	featuredID, extraHTML, err := s.wordpressUploadMedia(ctx, post, siteURL, username, appPassword)
	if err != nil {
		return "", err
	}
	if extraHTML != "" {
		html = strings.TrimSpace(html + extraHTML)
	}
	if title == "" && html == "" && featuredID == 0 {
		return "", fmt.Errorf("%w: для WordPress укажите заголовок, текст или изображение", ErrInvalidPost)
	}
	if title == "" {
		title = "Публикация"
	}

	created, err := s.wordpress.CreatePost(ctx, siteURL, username, appPassword, wordpress.CreatePostInput{
		Title:         title,
		Content:       html,
		Status:        "publish",
		FeaturedMedia: featuredID,
	})
	if err != nil {
		if errors.Is(err, wordpress.ErrUnauthorized) {
			return "", fmt.Errorf("доступ к WordPress недействителен — переподключите канал")
		}
		return "", fmt.Errorf("не удалось опубликовать в WordPress: %w", err)
	}
	return strconv.FormatInt(created.ID, 10), nil
}

func wordpressPublishAuth(channel *model.Channel) (siteURL, username string, err error) {
	if channel == nil {
		return "", "", fmt.Errorf("канал WordPress не найден")
	}
	siteURL = strings.TrimSpace(channel.Metadata.PublicURL)
	if siteURL == "" {
		return "", "", fmt.Errorf("у канала WordPress не сохранён адрес сайта — переподключите канал")
	}
	username = strings.TrimSpace(channel.BotUsername)
	if username == "" {
		return "", "", fmt.Errorf("у канала WordPress не сохранено имя пользователя — переподключите канал")
	}
	return siteURL, username, nil
}

func wordpressArticlePayload(content model.PostContent) (string, string, error) {
	title := strings.TrimSpace(content.Title)
	if title == "" && content.RichMessage != nil {
		title = strings.TrimSpace(content.RichMessage.Title)
	}
	body := strings.TrimSpace(content.Text)
	if body == "" {
		body = readableProviderText(content)
	}
	html := wordpress.ArticleHTML(body)
	if title == "" && html == "" {
		return "", "", fmt.Errorf("%w: для WordPress укажите заголовок или текст статьи", ErrInvalidPost)
	}
	return title, html, nil
}

func (s *PublicationService) wordpressUploadMedia(
	ctx context.Context,
	post *model.Post,
	siteURL, username, appPassword string,
) (int64, string, error) {
	if len(post.Media) == 0 {
		return 0, "", nil
	}
	if s.files == nil || s.storage == nil {
		return 0, "", fmt.Errorf("хранилище медиа недоступно")
	}

	const maxBytes = 50 << 20
	var featured int64
	var extra strings.Builder
	for i, attached := range post.Media {
		file, err := s.files.GetByID(ctx, post.WorkspaceID, attached.FileID, false)
		if err != nil {
			return 0, "", fmt.Errorf("медиафайл не найден или удалён")
		}
		body, contentType, err := s.storage.GetObject(ctx, file.S3Key)
		if err != nil {
			return 0, "", fmt.Errorf("не удалось прочитать медиафайл для публикации")
		}
		data, err := io.ReadAll(io.LimitReader(body, maxBytes+1))
		_ = body.Close()
		if err != nil {
			return 0, "", fmt.Errorf("не удалось прочитать медиафайл для публикации")
		}
		if len(data) > maxBytes {
			return 0, "", fmt.Errorf("%w: файл «%s» слишком большой для WordPress", ErrInvalidPost, file.Name)
		}
		filename := strings.TrimSpace(file.Name)
		if filename == "" {
			filename = path.Base(file.S3Key)
		}
		if contentType == "" {
			contentType = file.MimeType
		}
		uploaded, err := s.wordpress.UploadMedia(ctx, siteURL, username, appPassword, bytes.NewReader(data), filename, contentType)
		if err != nil {
			if errors.Is(err, wordpress.ErrUnauthorized) {
				return 0, "", fmt.Errorf("доступ к WordPress недействителен — переподключите канал")
			}
			return 0, "", fmt.Errorf("не удалось загрузить медиа в WordPress: %w", err)
		}
		if i == 0 && strings.HasPrefix(strings.ToLower(contentType), "image/") {
			featured = uploaded.ID
			continue
		}
		src := strings.TrimSpace(uploaded.SourceURL)
		if src == "" {
			continue
		}
		if strings.HasPrefix(strings.ToLower(contentType), "image/") {
			extra.WriteString(fmt.Sprintf(`<figure><img src="%s" alt="" /></figure>`, htmlAttr(src)))
			continue
		}
		extra.WriteString(fmt.Sprintf(`<p><a href="%s">%s</a></p>`, htmlAttr(src), htmlAttr(filename)))
	}
	return featured, extra.String(), nil
}

func htmlAttr(s string) string {
	return strings.NewReplacer(`&`, "&amp;", `"`, "&quot;", `<`, "&lt;", `>`, "&gt;").Replace(s)
}
