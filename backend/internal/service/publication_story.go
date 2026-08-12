package service

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/postilka/postilka/internal/model"
)

func (s *PublicationService) buildTelegramStoryOptions(
	ctx context.Context,
	post *model.Post,
	target model.PostTarget,
	channel *model.Channel,
	content model.PostContent,
	settings model.PostSettings,
	mediaBytes []byte,
	filename, contentType, mediaType string,
) (TelegramPostStoryOptions, error) {
	storySettings := settings.TelegramStory
	targetSettings, _ := DecodePostTargetSettings(target.Settings)
	utm := mergeTargetUTM(settings.UTM, &targetSettings)

	areas := []model.TelegramStoryArea{}
	if storySettings != nil {
		areas = append(areas, storySettings.Areas...)
	}
	areas = applyUTMToStoryAreas(areas, utm)
	var err error
	areas, err = shortenTelegramStoryAreas(
		ctx, areas, s.shortener, post.WorkspaceID, post.ID, target.ID, target.ChannelID, utm,
	)
	if err != nil {
		return TelegramPostStoryOptions{}, err
	}
	areasJSON, err := buildTelegramStoryAreasJSON(areas)
	if err != nil {
		return TelegramPostStoryOptions{}, err
	}
	expectedLinks := countTelegramStoryLinkAreas(areas)
	if expectedLinks > 0 {
		actualLinks, err := countTelegramStoryLinkAreasJSON(areasJSON)
		if err != nil {
			return TelegramPostStoryOptions{}, fmt.Errorf("%w: не удалось подготовить зоны ссылки", ErrInvalidPost)
		}
		if actualLinks != expectedLinks {
			return TelegramPostStoryOptions{}, fmt.Errorf(
				"%w: зона ссылки не попала в запрос к Telegram — проверьте URL (нужен полный адрес, например https://example.com)",
				ErrInvalidPost,
			)
		}
	}

	opts := TelegramPostStoryOptions{
		BusinessConnectionID: channel.ChatID,
		Caption:              content.Text,
		ParseMode:            strings.ToUpper(strings.TrimSpace(content.ParseMode)),
		ActivePeriod:         telegramStoryActivePeriod(storySettings),
		MediaType:            mediaType,
		MediaBytes:           mediaBytes,
		MediaFilename:        filename,
		MediaContentType:     contentType,
		AreasJSON:            areasJSON,
	}
	if storySettings != nil {
		opts.PostToChatPage = storySettings.PostToChatPage
		opts.ProtectContent = storySettings.ProtectContent
	}
	return opts, nil
}

func parseTelegramStoryID(raw string) (int, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0, fmt.Errorf("story id пустой")
	}
	id, err := strconv.Atoi(raw)
	if err != nil || id <= 0 {
		return 0, fmt.Errorf("некорректный story id")
	}
	return id, nil
}

func (s *PublicationService) DeleteTelegramStory(ctx context.Context, post *model.Post) error {
	if post == nil {
		return ErrInvalidPost
	}
	if strings.ToLower(strings.TrimSpace(post.Content.Format)) != "story" {
		return fmt.Errorf("%w: это не история Telegram", ErrInvalidPost)
	}
	var lastErr error
	deleted := 0
	for _, target := range post.Targets {
		if target.Status != model.PostTargetPublished {
			continue
		}
		storyID, err := parseTelegramStoryID(target.ProviderPostID)
		if err != nil {
			lastErr = err
			continue
		}
		channel, err := s.channels.GetByID(ctx, post.WorkspaceID, target.ChannelID)
		if err != nil {
			return err
		}
		if channel.Provider != model.ChannelProviderTelegram ||
			channel.ChatType != model.TelegramChatTypeBusiness {
			continue
		}
		token, err := s.channelTest.resolvePublishToken(ctx, channel)
		if err != nil {
			return err
		}
		if err := s.telegram.DeleteStory(ctx, token, channel.ChatID, storyID); err != nil {
			return err
		}
		deleted++
	}
	if deleted == 0 {
		if lastErr != nil {
			return lastErr
		}
		return fmt.Errorf("%w: опубликованная история не найдена", ErrInvalidPost)
	}
	return nil
}

func (s *PublicationService) EditTelegramStory(ctx context.Context, post *model.Post) error {
	if post == nil {
		return ErrInvalidPost
	}
	if strings.ToLower(strings.TrimSpace(post.Content.Format)) != "story" {
		return fmt.Errorf("%w: это не история Telegram", ErrInvalidPost)
	}
	if len(post.Media) != 1 {
		return fmt.Errorf("%w: для истории нужен ровно один медиафайл", ErrInvalidPost)
	}
	mediaBytes, filename, contentType, mediaType, err := s.telegramStoryMediaFile(ctx, post)
	if err != nil {
		return err
	}
	updated := 0
	var lastErr error
	for _, target := range post.Targets {
		if target.Status != model.PostTargetPublished {
			continue
		}
		storyID, err := parseTelegramStoryID(target.ProviderPostID)
		if err != nil {
			lastErr = err
			continue
		}
		channel, err := s.channels.GetByID(ctx, post.WorkspaceID, target.ChannelID)
		if err != nil {
			return err
		}
		if channel.Provider != model.ChannelProviderTelegram ||
			channel.ChatType != model.TelegramChatTypeBusiness {
			continue
		}
		targetSettings, err := DecodePostTargetSettings(target.Settings)
		if err != nil {
			return err
		}
		content, settings := mergePostTarget(post.Content, post.Settings, targetSettings)
		content = ApplyUTMToContent(content, settings.UTM)
		content, err = ApplyLinkShorteningToContent(
			ctx, content, s.shortener, post.WorkspaceID, post.ID, target.ID, target.ChannelID, settings.UTM,
		)
		if err != nil {
			return err
		}
		storyOpts, err := s.buildTelegramStoryOptions(
			ctx, post, target, channel, content, settings,
			mediaBytes, filename, contentType, mediaType,
		)
		if err != nil {
			return err
		}
		token, err := s.channelTest.resolvePublishToken(ctx, channel)
		if err != nil {
			return err
		}
		if err := s.telegram.EditStory(ctx, token, TelegramEditStoryOptions{
			BusinessConnectionID: channel.ChatID,
			StoryID:              storyID,
			MediaType:            mediaType,
			MediaBytes:           mediaBytes,
			MediaFilename:        filename,
			MediaContentType:     contentType,
			Caption:              content.Text,
			ParseMode:            storyOpts.ParseMode,
			AreasJSON:            storyOpts.AreasJSON,
		}); err != nil {
			return err
		}
		updated++
	}
	if updated == 0 {
		if lastErr != nil {
			return lastErr
		}
		return fmt.Errorf("%w: опубликованная история не найдена", ErrInvalidPost)
	}
	return nil
}
