package service

import (
	"context"
	"errors"
	"fmt"
	"html"
	"io"
	"log/slog"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/repository"
)

type PublicationService struct {
	posts       *repository.PostRepository
	channels    *repository.ChannelRepository
	files       *repository.WorkspaceFileRepository
	storage     *ObjectStorage
	channelTest *ChannelTestService
	telegram    *TelegramBotClient
	maxClient   *oauthclient.MAXBotClient
	quota       *QuotaService
	shortener   *LinkShortenerService
}

func NewPublicationService(
	posts *repository.PostRepository,
	channels *repository.ChannelRepository,
	files *repository.WorkspaceFileRepository,
	storage *ObjectStorage,
	channelTest *ChannelTestService,
	telegram *TelegramBotClient,
	maxClient *oauthclient.MAXBotClient,
	quota *QuotaService,
	shortener *LinkShortenerService,
) *PublicationService {
	if maxClient == nil {
		maxClient = oauthclient.NewMAXBotClient()
	}
	return &PublicationService{
		posts: posts, channels: channels, files: files, storage: storage,
		channelTest: channelTest, telegram: telegram, maxClient: maxClient,
		quota: quota, shortener: shortener,
	}
}

func (s *PublicationService) Publish(ctx context.Context, postID string, allowRetry bool) error {
	if err := s.posts.ResetStaleTargets(ctx, postID); err != nil {
		return err
	}
	post, err := s.posts.GetByID(ctx, postID)
	if err != nil {
		return err
	}
	wasPublished := post.Status == model.PostStatusPublished
	if err := ValidatePostForPublication(*post); err != nil {
		_ = s.posts.FinalizePublication(ctx, postID, nil)
		return err
	}
	if err := validatePostTargets(ctx, s.channels, post); err != nil {
		_ = s.posts.FinalizePublication(ctx, postID, nil)
		return err
	}
	if s.quota != nil && postHasPublishableTargets(*post) {
		if err := s.quota.CheckPostQuota(ctx, post.WorkspaceID); err != nil {
			return err
		}
	}

	var earliestRetry *time.Time
	var lastPublishErr error
	for _, target := range post.Targets {
		if target.Status == model.PostTargetPublished || target.Status == model.PostTargetCanceled {
			continue
		}
		started, err := s.posts.StartTarget(ctx, target.ID)
		if err != nil {
			return err
		}
		if !started {
			continue
		}

		providerID, publishErr := s.publishTarget(ctx, post, target)
		if publishErr == nil {
			if err := s.posts.CompleteTarget(ctx, target.ID, providerID); err != nil {
				slog.Warn(
					"post publish: mark target published failed after delivery",
					"post_id", postID,
					"target_id", target.ID,
					"error", err,
				)
			}
			continue
		}
		lastPublishErr = publishErr

		var retryAt *time.Time
		if allowRetry && target.Attempts+1 < maxPublishAttempts {
			backoff := 30 * time.Second * time.Duration(1<<min(target.Attempts, 6))
			if backoff > 30*time.Minute {
				backoff = 30 * time.Minute
			}
			next := time.Now().Add(backoff)
			retryAt = &next
			if earliestRetry == nil || next.Before(*earliestRetry) {
				earliestRetry = &next
			}
		}
		if err := s.posts.FailTarget(ctx, target.ID, safePublishError(publishErr), retryAt); err != nil {
			return err
		}
	}
	if err := s.posts.FinalizePublication(ctx, postID, earliestRetry); err != nil {
		return err
	}
	updated, err := s.posts.GetByID(ctx, postID)
	if err != nil {
		return err
	}
	if lastPublishErr != nil && !publicationAnyDelivered(*updated) {
		if errors.Is(lastPublishErr, ErrInvalidPost) {
			return lastPublishErr
		}
		return fmt.Errorf("%w: %s", ErrPublishFailed, safePublishError(lastPublishErr))
	}
	if !wasPublished && s.quota != nil {
		if updated.Status == model.PostStatusPublished {
			if err := s.quota.RecordPost(ctx, updated.WorkspaceID); err != nil {
				slog.Warn(
					"post publish: quota record failed after successful delivery",
					"post_id", postID,
					"workspace_id", updated.WorkspaceID,
					"error", err,
				)
			}
			if err := s.scheduleNextRecurrence(ctx, updated); err != nil {
				slog.Warn(
					"post publish: recurrence schedule failed after successful delivery",
					"post_id", postID,
					"error", err,
				)
			}
		}
	}
	return nil
}

func (s *PublicationService) scheduleNextRecurrence(ctx context.Context, post *model.Post) error {
	if post == nil || post.Settings.Recurrence == nil || !post.Settings.Recurrence.Enabled {
		return nil
	}
	recurrence := post.Settings.Recurrence
	if recurrence.IntervalDays < 1 {
		return nil
	}
	runNumber := recurrence.RunNumber
	if runNumber <= 0 {
		runNumber = 1
	}
	if recurrence.MaxRuns != nil && runNumber >= *recurrence.MaxRuns {
		return nil
	}
	nextDue := time.Now().Add(time.Duration(recurrence.IntervalDays) * 24 * time.Hour)
	if recurrence.EndsAt != nil && nextDue.After(*recurrence.EndsAt) {
		return nil
	}
	_, err := s.posts.CloneForRecurrence(ctx, post, nextDue)
	return err
}

func postHasPublishableTargets(post model.Post) bool {
	for _, target := range post.Targets {
		if target.Status != model.PostTargetPublished && target.Status != model.PostTargetCanceled {
			return true
		}
	}
	return false
}

func safePublishError(err error) string {
	message := strings.TrimSpace(err.Error())
	if message == "" {
		return "Не удалось опубликовать запись"
	}
	message = signedURLPattern.ReplaceAllString(message, "[подписанная ссылка скрыта]")
	if len(message) > 2000 {
		message = message[:2000]
	}
	return message
}

var signedURLPattern = regexp.MustCompile(`https?://[^\s]+`)

func publicationAnyDelivered(post model.Post) bool {
	for _, target := range post.Targets {
		if target.Status == model.PostTargetPublished {
			return true
		}
	}
	return false
}

func telegramMediaLayoutCombined(settings model.PostSettings) bool {
	return strings.TrimSpace(settings.TelegramMediaLayout) == model.TelegramMediaLayoutCaption
}

func telegramCaptionAbove(settings model.PostSettings, mediaCount int) bool {
	if mediaCount > 1 {
		return false
	}
	return strings.TrimSpace(settings.TelegramCaptionPosition) == model.TelegramCaptionPositionAbove
}

func telegramTextBeforeMedia(settings model.PostSettings) bool {
	return strings.TrimSpace(settings.TelegramMediaOrder) == model.TelegramMediaOrderTextFirst
}

func hasTelegramButtons(buttons [][]model.TelegramInlineButton) bool {
	return len(buttons) > 0 && len(buttons[0]) > 0
}

func telegramLinkPreview(settings model.PostSettings) *bool {
	if settings.Link != nil {
		return settings.Link.PreviewEnabled
	}
	return nil
}

func (s *PublicationService) telegramFinishPublish(
	ctx context.Context,
	token, chatID string,
	settings model.PostSettings,
	messageID string,
) (string, error) {
	if settings.TelegramPin && strings.TrimSpace(messageID) != "" {
		if err := s.telegram.PinChatMessage(ctx, token, chatID, messageID, settings.TelegramSilent); err != nil {
			slog.Warn(
				"telegram publish: pin message failed after delivery",
				"chat_id", chatID,
				"message_id", messageID,
				"error", err,
			)
		}
	}
	return messageID, nil
}

func (s *PublicationService) telegramVideoNoteFile(ctx context.Context, post *model.Post) ([]byte, string, error) {
	if s.files == nil || s.storage == nil {
		return nil, "", fmt.Errorf("хранилище медиа недоступно")
	}
	if len(post.Media) != 1 {
		return nil, "", fmt.Errorf("%w: для кружка нужен ровно один видеофайл", ErrInvalidPost)
	}
	file, err := s.files.GetByID(ctx, post.WorkspaceID, post.Media[0].FileID, false)
	if err != nil {
		return nil, "", fmt.Errorf("медиафайл не найден или удалён")
	}
	mime := strings.ToLower(strings.TrimSpace(strings.Split(file.MimeType, ";")[0]))
	if !strings.HasPrefix(mime, "video/") {
		return nil, "", fmt.Errorf("%w: кружок Telegram поддерживает только видео", ErrInvalidPost)
	}
	body, _, err := s.storage.GetObject(ctx, file.S3Key)
	if err != nil {
		return nil, "", fmt.Errorf("не удалось прочитать видео для публикации")
	}
	defer body.Close()
	data, err := io.ReadAll(io.LimitReader(body, maxTelegramVideoNoteBytes+1))
	if err != nil {
		return nil, "", fmt.Errorf("не удалось прочитать видео для публикации")
	}
	if len(data) > maxTelegramVideoNoteBytes {
		return nil, "", fmt.Errorf(
			"%w: видео для кружка Telegram не должно превышать %d МБ",
			ErrInvalidPost,
			maxTelegramVideoNoteBytes>>20,
		)
	}
	return data, file.Name, nil
}

func (s *PublicationService) sendTelegramVideoNote(
	ctx context.Context,
	token, chatID string,
	post *model.Post,
	silent bool,
) (string, error) {
	videoData, filename, err := s.telegramVideoNoteFile(ctx, post)
	if err != nil {
		return "", err
	}
	prepared, err := prepareTelegramVideoNoteBytes(videoData)
	if err != nil {
		return "", err
	}
	slog.Info(
		"telegram publish: sending video note",
		"post_id", post.ID,
		"chat_id", chatID,
		"source_bytes", len(videoData),
		"prepared_bytes", len(prepared),
		"filename", filename,
	)
	return s.telegram.SendVideoNote(ctx, token, chatID, filename, prepared, silent)
}

func (s *PublicationService) shouldSendTelegramVideoNote(
	ctx context.Context,
	post *model.Post,
	format string,
	settings model.PostSettings,
) (bool, error) {
	if format != "short_video" && !settings.TelegramVideoNote {
		return false, nil
	}
	if len(post.Media) != 1 {
		return false, fmt.Errorf("%w: для кружка нужен ровно один видеофайл", ErrInvalidPost)
	}
	file, err := s.files.GetByID(ctx, post.WorkspaceID, post.Media[0].FileID, false)
	if err != nil {
		return false, fmt.Errorf("медиафайл не найден или удалён")
	}
	mime := strings.ToLower(strings.TrimSpace(strings.Split(file.MimeType, ";")[0]))
	if !strings.HasPrefix(mime, "video/") {
		return false, fmt.Errorf("%w: кружок Telegram поддерживает только видео", ErrInvalidPost)
	}
	return true, nil
}

func (s *PublicationService) publishTarget(
	ctx context.Context,
	post *model.Post,
	target model.PostTarget,
) (string, error) {
	channel, err := s.channels.GetByID(ctx, post.WorkspaceID, target.ChannelID)
	if err != nil {
		return "", fmt.Errorf("канал не найден")
	}
	if channel.Status != model.ChannelStatusActive {
		return "", fmt.Errorf("канал «%s» неактивен или требует переподключения", channel.Name)
	}
	if len(post.Media) > 0 && !channel.Provider.PublishCapabilities().ComposerMedia {
		return "", fmt.Errorf("вложения композера для %s пока не поддерживаются", channel.Provider.Label())
	}
	targetSettings, err := DecodePostTargetSettings(target.Settings)
	if err != nil {
		return "", err
	}
	content, settings := mergePostTarget(post.Content, post.Settings, targetSettings)
	content = ApplyUTMToContent(content, settings.UTM)
	var shortenErr error
	content, shortenErr = ApplyLinkShorteningToContent(
		ctx, content, s.shortener, post.WorkspaceID, post.ID, target.ID, target.ChannelID, settings.UTM,
	)
	if shortenErr != nil {
		return "", shortenErr
	}
	if err := ValidatePostContent(content, settings); err != nil {
		return "", err
	}
	if err := validateContentForChannel(content, channel); err != nil {
		return "", err
	}
	token, err := s.channelTest.resolvePublishToken(ctx, channel)
	if err != nil {
		return "", err
	}

	format := strings.ToLower(strings.TrimSpace(content.Format))
	if format == "" {
		format = "message"
	}
	if channel.Provider == model.ChannelProviderTelegram {
		silent := settings.TelegramSilent
		preview := telegramLinkPreview(settings)
		switch format {
		case "story":
			if channel.ChatType != model.TelegramChatTypeBusiness {
				return "", fmt.Errorf("истории Telegram Business доступны только для business-аккаунтов")
			}
			if len(post.Media) != 1 {
				return "", fmt.Errorf("для формата story нужен ровно один медиафайл")
			}
			media, err := s.telegramMedia(ctx, post)
			if err != nil {
				return "", err
			}
			parseMode := strings.ToUpper(strings.TrimSpace(content.ParseMode))
			storyID, err := s.telegram.PostStory(ctx, token, TelegramPostStoryOptions{
				BusinessConnectionID: channel.ChatID,
				Caption:              content.Text,
				ParseMode:            parseMode,
				ActivePeriod:         86400,
				MediaType:            media[0].Type,
				MediaURL:             media[0].URL,
			})
			if err != nil {
				return "", err
			}
			return storyID, nil
		case "short_video":
			if len(post.Media) != 1 {
				return "", fmt.Errorf("для формата %s нужен ровно один медиафайл", format)
			}
			media, err := s.telegramMedia(ctx, post)
			if err != nil {
				return "", err
			}
			if media[0].Type != TelegramMediaVideo {
				return "", fmt.Errorf("короткое видео должно быть файлом video/*")
			}
			parseMode := strings.ToUpper(strings.TrimSpace(content.ParseMode))
			useVideoNote, err := s.shouldSendTelegramVideoNote(ctx, post, format, settings)
			if err != nil {
				return "", err
			}
			if useVideoNote {
				msgID, err := s.sendTelegramVideoNote(ctx, token, channel.ChatID, post, silent)
				if err != nil {
					return "", err
				}
				if strings.TrimSpace(content.Text) != "" {
					textID, err := s.telegram.SendFormattedMessage(ctx, token, channel.ChatID, TelegramMessageInput{
						Text: content.Text, ParseMode: parseMode, Entities: content.Entities,
						Buttons: content.Buttons, LinkPreviewEnabled: preview, DisableNotification: silent,
					})
					if err != nil {
						return "", err
					}
					if msgID == "" {
						msgID = textID
					}
				}
				return s.telegramFinishPublish(ctx, token, channel.ChatID, settings, msgID)
			}
			msgID, err := s.telegram.SendMedia(ctx, token, channel.ChatID, media, &TelegramMediaSendOptions{
				Caption: content.Text, ParseMode: parseMode, DisableNotification: silent,
			})
			if err != nil {
				return "", err
			}
			return s.telegramFinishPublish(ctx, token, channel.ChatID, settings, msgID)
		case "message":
			if len(post.Media) > 0 {
				media, err := s.telegramMedia(ctx, post)
				if err != nil {
					return "", err
				}
				parseMode := strings.ToUpper(strings.TrimSpace(content.ParseMode))
				useVideoNote, err := s.shouldSendTelegramVideoNote(ctx, post, format, settings)
				if err != nil {
					return "", err
				}
				if useVideoNote {
					msgID, err := s.sendTelegramVideoNote(ctx, token, channel.ChatID, post, silent)
					if err != nil {
						return "", err
					}
					if strings.TrimSpace(content.Text) != "" {
						textID, err := s.telegram.SendFormattedMessage(ctx, token, channel.ChatID, TelegramMessageInput{
							Text: content.Text, ParseMode: parseMode, Entities: content.Entities,
							Buttons: content.Buttons, LinkPreviewEnabled: preview, DisableNotification: silent,
						})
						if err != nil {
							return "", err
						}
						if settings.TelegramPin {
							msgID = textID
						} else if msgID == "" {
							msgID = textID
						}
					}
					return s.telegramFinishPublish(ctx, token, channel.ChatID, settings, msgID)
				}
				if telegramMediaLayoutCombined(settings) {
					opts := &TelegramMediaSendOptions{
						Caption:               content.Text,
						ParseMode:             parseMode,
						ShowCaptionAboveMedia: telegramCaptionAbove(settings, len(media)),
						DisableNotification:   silent,
					}
					if len(media) == 1 {
						opts.Buttons = content.Buttons
					}
					msgID, err := s.telegram.SendMedia(ctx, token, channel.ChatID, media, opts)
					if err != nil {
						return "", err
					}
					if len(media) > 1 && hasTelegramButtons(content.Buttons) {
						if _, err := s.telegram.SendFormattedMessage(ctx, token, channel.ChatID, TelegramMessageInput{
							Text: "·", Buttons: content.Buttons, DisableNotification: silent,
						}); err != nil {
							return "", err
						}
					}
					return s.telegramFinishPublish(ctx, token, channel.ChatID, settings, msgID)
				}
				sendTelegramMedia := func() error {
					_, err := s.telegram.SendMedia(ctx, token, channel.ChatID, media, &TelegramMediaSendOptions{
						DisableNotification: silent,
					})
					return err
				}
				sendTelegramText := func() (string, error) {
					return s.telegram.SendFormattedMessage(ctx, token, channel.ChatID, TelegramMessageInput{
						Text: content.Text, ParseMode: parseMode, Entities: content.Entities,
						Buttons: content.Buttons, LinkPreviewEnabled: preview, DisableNotification: silent,
					})
				}
				if telegramTextBeforeMedia(settings) {
					msgID, err := sendTelegramText()
					if err != nil {
						return "", err
					}
					if err := sendTelegramMedia(); err != nil {
						return "", err
					}
					return s.telegramFinishPublish(ctx, token, channel.ChatID, settings, msgID)
				}
				if err := sendTelegramMedia(); err != nil {
					return "", err
				}
				msgID, err := sendTelegramText()
				if err != nil {
					return "", err
				}
				return s.telegramFinishPublish(ctx, token, channel.ChatID, settings, msgID)
			}
			parseMode := strings.ToUpper(strings.TrimSpace(content.ParseMode))
			msgID, err := s.telegram.SendFormattedMessage(ctx, token, channel.ChatID, TelegramMessageInput{
				Text: content.Text, ParseMode: parseMode, Entities: content.Entities,
				Buttons: content.Buttons, LinkPreviewEnabled: preview, DisableNotification: silent,
			})
			if err != nil {
				return "", err
			}
			return s.telegramFinishPublish(ctx, token, channel.ChatID, settings, msgID)
		case "rich_message", "article":
			if content.RichMessage == nil {
				return "", fmt.Errorf("не задан rich_message")
			}
			rich := *content.RichMessage
			if content.Buttons != nil {
				rich.Buttons = content.Buttons
			}
			msgID, err := s.telegram.SendRichMessage(ctx, token, channel.ChatID, rich, silent)
			if err != nil {
				return "", err
			}
			return s.telegramFinishPublish(ctx, token, channel.ChatID, settings, msgID)
		default:
			return "", fmt.Errorf("формат %s не поддерживается Telegram", format)
		}
	}

	if channel.Provider == model.ChannelProviderMAX {
		if format != "message" {
			return "", fmt.Errorf("формат %s пока поддерживается только Telegram", format)
		}
		text := readableProviderText(content)
		if len(post.Media) > 0 {
			attachments, err := s.maxMedia(ctx, token, post)
			if err != nil {
				return "", err
			}
			if err := s.maxClient.SendChannelMessage(ctx, token, channel.ChatID, text, attachments, settings.MaxButtons); err != nil {
				return "", err
			}
			return "", nil
		}
		if err := s.maxClient.SendChannelMessage(ctx, token, channel.ChatID, text, nil, settings.MaxButtons); err != nil {
			return "", err
		}
		return "", nil
	}

	if format != "message" {
		return "", fmt.Errorf("формат %s пока поддерживается только Telegram", format)
	}
	text := readableProviderText(content)
	return s.channelTest.publish(
		ctx, channel, token, text, "", "", "", "", nil,
	)
}

func (s *PublicationService) telegramMedia(
	ctx context.Context,
	post *model.Post,
) ([]TelegramMediaInput, error) {
	if s.files == nil || s.storage == nil {
		return nil, fmt.Errorf("хранилище медиа недоступно")
	}
	media := make([]TelegramMediaInput, 0, len(post.Media))
	for _, attached := range post.Media {
		file, err := s.files.GetByID(ctx, post.WorkspaceID, attached.FileID, false)
		if err != nil {
			return nil, fmt.Errorf("медиафайл не найден или удалён")
		}
		mediaType := ""
		mime := strings.ToLower(strings.TrimSpace(strings.Split(file.MimeType, ";")[0]))
		switch {
		case strings.HasPrefix(mime, "image/"):
			if !TelegramImageMimeAllowed(mime) {
				return nil, fmt.Errorf("%w: Telegram не поддерживает формат %s — используйте JPEG, PNG, GIF или WEBP", ErrInvalidPost, file.MimeType)
			}
			mediaType = TelegramMediaPhoto
		case strings.HasPrefix(mime, "video/"):
			mediaType = TelegramMediaVideo
		default:
			return nil, fmt.Errorf("%w: Telegram поддерживает только изображения и видео", ErrInvalidPost)
		}
		signedURL, err := s.storage.PresignGetWithOptions(ctx, file.S3Key, PresignGetOptions{
			Expires: 30 * time.Minute,
			Inline:  true,
		})
		if err != nil {
			return nil, fmt.Errorf("не удалось подготовить медиафайл для публикации")
		}
		media = append(media, TelegramMediaInput{Type: mediaType, URL: signedURL})
	}
	return media, nil
}

func (s *PublicationService) maxMedia(
	ctx context.Context,
	botToken string,
	post *model.Post,
) ([]oauthclient.MAXOutgoingAttachment, error) {
	if s.files == nil || s.storage == nil || s.maxClient == nil {
		return nil, fmt.Errorf("хранилище медиа недоступно")
	}
	if len(post.Media) > oauthclient.MaxMAXMediaAttachments {
		return nil, fmt.Errorf("MAX принимает не более %d вложений в одном сообщении", oauthclient.MaxMAXMediaAttachments)
	}
	media := make([]oauthclient.MAXOutgoingAttachment, 0, len(post.Media))
	for _, attached := range post.Media {
		file, err := s.files.GetByID(ctx, post.WorkspaceID, attached.FileID, false)
		if err != nil {
			return nil, fmt.Errorf("медиафайл не найден или удалён")
		}
		mime := strings.ToLower(strings.TrimSpace(strings.Split(file.MimeType, ";")[0]))
		switch {
		case strings.HasPrefix(mime, "image/"):
			if !oauthclient.MAXImageMimeAllowed(mime) {
				return nil, fmt.Errorf("MAX не поддерживает формат изображения %s", file.MimeType)
			}
			if file.Size > oauthclient.MaxMAXImageBytes {
				return nil, fmt.Errorf("изображение MAX не должно превышать %d МБ", oauthclient.MaxMAXImageBytes>>20)
			}
			body, _, err := s.storage.GetObject(ctx, file.S3Key)
			if err != nil {
				return nil, fmt.Errorf("не удалось прочитать изображение для публикации")
			}
			data, err := io.ReadAll(io.LimitReader(body, oauthclient.MaxMAXImageBytes+1))
			body.Close()
			if err != nil {
				return nil, fmt.Errorf("не удалось прочитать изображение для публикации")
			}
			if int64(len(data)) > oauthclient.MaxMAXImageBytes {
				return nil, fmt.Errorf("изображение MAX не должно превышать %d МБ", oauthclient.MaxMAXImageBytes>>20)
			}
			imageToken, err := s.maxClient.UploadImage(ctx, botToken, data, file.Name)
			if err != nil {
				return nil, err
			}
			media = append(media, oauthclient.MAXOutgoingAttachment{
				Type:  "image",
				Token: imageToken,
			})
		case strings.HasPrefix(mime, "video/"):
			if !oauthclient.MAXVideoMimeAllowed(mime) {
				return nil, fmt.Errorf("MAX не поддерживает формат видео %s", file.MimeType)
			}
			if file.Size > oauthclient.MaxMAXVideoBytes {
				return nil, fmt.Errorf("видео MAX не должно превышать %d МБ", oauthclient.MaxMAXVideoBytes>>20)
			}
			body, _, err := s.storage.GetObject(ctx, file.S3Key)
			if err != nil {
				return nil, fmt.Errorf("не удалось прочитать видеофайл для публикации")
			}
			data, err := io.ReadAll(io.LimitReader(body, oauthclient.MaxMAXVideoBytes+1))
			body.Close()
			if err != nil {
				return nil, fmt.Errorf("не удалось прочитать видеофайл для публикации")
			}
			if int64(len(data)) > oauthclient.MaxMAXVideoBytes {
				return nil, fmt.Errorf("видео MAX не должно превышать %d МБ", oauthclient.MaxMAXVideoBytes>>20)
			}
			videoToken, err := s.maxClient.UploadVideo(ctx, botToken, data, file.Name)
			if err != nil {
				return nil, err
			}
			media = append(media, oauthclient.MAXOutgoingAttachment{
				Type:  "video",
				Token: videoToken,
			})
		default:
			return nil, fmt.Errorf("MAX поддерживает только изображения и видео")
		}
	}
	return media, nil
}

var providerHTMLAnchor = regexp.MustCompile(`(?is)<a\s+href="(https?://[^"]+)"\s*>(.*?)</a>`)

func readableProviderText(content model.PostContent) string {
	text := content.Text
	if strings.EqualFold(strings.TrimSpace(content.ParseMode), "HTML") {
		text = providerHTMLAnchor.ReplaceAllString(text, `$2 ($1)`)
		text = telegramHTMLTag.ReplaceAllString(text, "")
		text = html.UnescapeString(text)
	}
	seen := make(map[string]bool)
	var links []string
	for _, entity := range content.Entities {
		if entity.Type == "text_link" && entity.URL != "" && !strings.Contains(text, entity.URL) && !seen[entity.URL] {
			seen[entity.URL] = true
			links = append(links, entity.URL)
		}
	}
	if len(links) > 0 {
		text = strings.TrimSpace(text) + "\n\n" + strings.Join(links, "\n")
	}
	return strings.TrimSpace(text)
}

func (s *PublicationService) ProcessDue(ctx context.Context, concurrency int) (int, error) {
	if concurrency <= 0 {
		concurrency = 1
	}
	ids, err := s.posts.ClaimDue(ctx, concurrency)
	if err != nil {
		return 0, err
	}
	var wg sync.WaitGroup
	errs := make(chan error, len(ids))
	for _, postID := range ids {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			if err := s.Publish(ctx, id, true); err != nil {
				errs <- fmt.Errorf("publish post %s: %w", id, err)
			}
		}(postID)
	}
	wg.Wait()
	close(errs)
	var first error
	for err := range errs {
		if first == nil {
			first = err
		}
	}
	return len(ids), first
}
