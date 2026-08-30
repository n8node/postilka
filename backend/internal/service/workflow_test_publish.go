package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/postilka/postilka/internal/model"
)

func isWorkflowSocialNode(nodeType string) bool {
	switch nodeType {
	case "social_telegram", "social_max", "social_vk", "social_youtube", "social_dzen", "social_photochka":
		return true
	default:
		return false
	}
}

func (s *PostService) PublishWorkflowNodeTest(
	ctx context.Context,
	workspaceID, userID, nodeType string,
	inputs map[string]interface{},
) (*model.Post, error) {
	if err := s.requireVerifiedEmail(ctx, userID); err != nil {
		return nil, err
	}
	if _, err := s.workspaces.RequireMembership(ctx, userID, workspaceID, model.RoleEditor); err != nil {
		return nil, err
	}

	req, err := buildWorkflowTestPostRequest(nodeType, inputs)
	if err != nil {
		return nil, err
	}
	if err := s.validate(ctx, workspaceID, req, true); err != nil {
		return nil, err
	}

	post, err := s.posts.Create(ctx, workspaceID, userID, req)
	if err != nil {
		return nil, err
	}
	if err := s.posts.SetPublishing(ctx, workspaceID, post.ID); err != nil {
		return nil, ErrPostConflict
	}
	if err := s.publication.Publish(ctx, post.ID, false); err != nil {
		failed, getErr := s.posts.Get(ctx, workspaceID, post.ID)
		if getErr == nil && postPublishDelivered(*failed) {
			return failed, nil
		}
		if failed != nil && strings.TrimSpace(failed.LastError) != "" {
			return failed, fmt.Errorf("%w: %s", ErrPublishFailed, failed.LastError)
		}
		return nil, fmt.Errorf("%w: %s", ErrPublishFailed, safePublishError(err))
	}
	return s.posts.Get(ctx, workspaceID, post.ID)
}

func buildWorkflowTestPostRequest(nodeType string, inputs map[string]interface{}) (model.PostSaveRequest, error) {
	channelID := strings.TrimSpace(getString(inputs, "channelId", ""))
	if channelID == "" {
		return model.PostSaveRequest{}, fmt.Errorf("%w: выберите канал для тестовой публикации", ErrInvalidPost)
	}

	targets := []model.PostTargetInput{{ChannelID: channelID}}
	media := workflowTestMediaInputs(inputs)

	switch nodeType {
	case "social_telegram":
		return buildTelegramWorkflowTestPost(inputs, targets, media)
	case "social_max":
		return buildMaxWorkflowTestPost(inputs, targets, media)
	case "social_vk":
		return buildVKWorkflowTestPost(inputs, targets, media)
	case "social_youtube":
		return buildYouTubeWorkflowTestPost(inputs, targets, media)
	case "social_dzen":
		return buildDzenWorkflowTestPost(inputs, targets, media)
	case "social_photochka":
		return buildPhotochkaWorkflowTestPost(inputs, targets, media)
	default:
		return model.PostSaveRequest{}, fmt.Errorf("%w: тестовая публикация для типа %s не поддерживается", ErrInvalidPost, nodeType)
	}
}

func workflowTestMediaInputs(inputs map[string]interface{}) []model.PostMediaInput {
	seen := map[string]bool{}
	out := make([]model.PostMediaInput, 0, 3)
	add := func(id string) {
		id = strings.TrimSpace(id)
		if id == "" || seen[id] {
			return
		}
		seen[id] = true
		out = append(out, model.PostMediaInput{FileID: id})
	}
	add(getString(inputs, "imageFileId", ""))
	add(getString(inputs, "videoFileId", ""))
	add(getString(inputs, "fileId", ""))
	return out
}

func buildTelegramWorkflowTestPost(
	inputs map[string]interface{},
	targets []model.PostTargetInput,
	media []model.PostMediaInput,
) (model.PostSaveRequest, error) {
	rawFormat := getString(inputs, "format", "message")
	text := strings.TrimSpace(getString(inputs, "text", ""))
	format := rawFormat
	settings := model.PostSettings{}

	switch rawFormat {
	case "video_note":
		format = "short_video"
		settings.TelegramVideoNote = true
	case "story":
		format = "story"
		if story := parseWorkflowTelegramStory(inputs["telegramStory"]); story != nil {
			settings.TelegramStory = story
		}
	case "message":
		format = "message"
	default:
		format = rawFormat
	}

	if format == "message" || format == "short_video" {
		if text == "" && len(media) == 0 {
			return model.PostSaveRequest{}, fmt.Errorf("%w: укажите текст или медиафайл", ErrInvalidPost)
		}
	}

	if format == "story" && len(media) == 0 {
		return model.PostSaveRequest{}, fmt.Errorf("%w: для истории нужен медиафайл", ErrInvalidPost)
	}
	if format == "short_video" && len(media) == 0 {
		return model.PostSaveRequest{}, fmt.Errorf("%w: для кружочка нужен видеофайл", ErrInvalidPost)
	}

	mediaLayout := getString(inputs, "mediaLayout", "separate")
	if mediaLayout == "caption" {
		settings.TelegramMediaLayout = model.TelegramMediaLayoutCaption
		pos := getString(inputs, "mediaPosition", "below")
		if pos == "above" {
			settings.TelegramCaptionPosition = model.TelegramCaptionPositionAbove
		} else {
			settings.TelegramCaptionPosition = model.TelegramCaptionPositionBelow
		}
	} else {
		settings.TelegramMediaLayout = model.TelegramMediaLayoutSeparate
		order := getString(inputs, "mediaOrder", "media_first")
		if order == "text_first" {
			settings.TelegramMediaOrder = model.TelegramMediaOrderTextFirst
		} else {
			settings.TelegramMediaOrder = model.TelegramMediaOrderMediaFirst
		}
	}

	if getBool(inputs, "silent", false) {
		settings.TelegramSilent = true
	}
	if getBool(inputs, "pin", false) {
		settings.TelegramPin = true
	}
	if getBool(inputs, "disableLinkPreview", false) {
		disabled := false
		settings.Link = &model.PostLinkSettings{PreviewEnabled: &disabled}
	}

	buttons := parseWorkflowTelegramButtons(inputs["buttons"])
	content := model.PostContent{
		Format:    format,
		Text:      text,
		ParseMode: "HTML",
		Buttons:   buttons,
	}

	return model.PostSaveRequest{
		Content:  content,
		Settings: settings,
		Targets:  targets,
		Media:    media,
	}, nil
}

func buildMaxWorkflowTestPost(
	inputs map[string]interface{},
	targets []model.PostTargetInput,
	media []model.PostMediaInput,
) (model.PostSaveRequest, error) {
	text := strings.TrimSpace(getString(inputs, "text", ""))
	if text == "" && len(media) == 0 {
		return model.PostSaveRequest{}, fmt.Errorf("%w: укажите текст или медиафайл", ErrInvalidPost)
	}
	settings := model.PostSettings{
		TelegramSilent: getBool(inputs, "silent", false),
		TelegramPin:    getBool(inputs, "pin", false),
		MaxButtons:     parseWorkflowTelegramButtons(inputs["buttons"]),
	}
	if getBool(inputs, "disableLinkPreview", false) {
		disabled := false
		settings.Link = &model.PostLinkSettings{PreviewEnabled: &disabled}
	}
	return model.PostSaveRequest{
		Content: model.PostContent{
			Format:    "message",
			Text:      text,
			ParseMode: "HTML",
		},
		Settings: settings,
		Targets:  targets,
		Media:    media,
	}, nil
}

func buildVKWorkflowTestPost(
	inputs map[string]interface{},
	targets []model.PostTargetInput,
	media []model.PostMediaInput,
) (model.PostSaveRequest, error) {
	text := strings.TrimSpace(getString(inputs, "text", ""))
	if text == "" && len(media) == 0 {
		return model.PostSaveRequest{}, fmt.Errorf("%w: укажите текст или медиафайл", ErrInvalidPost)
	}
	format := getString(inputs, "format", "wall_post")
	if format == "" {
		format = "wall_post"
	}
	return model.PostSaveRequest{
		Content: model.PostContent{
			Format:    format,
			Text:      text,
			ParseMode: "HTML",
		},
		Settings: model.PostSettings{
			FirstComment: strings.TrimSpace(getString(inputs, "firstComment", "")),
		},
		Targets: targets,
		Media:   media,
	}, nil
}

func buildYouTubeWorkflowTestPost(
	inputs map[string]interface{},
	targets []model.PostTargetInput,
	media []model.PostMediaInput,
) (model.PostSaveRequest, error) {
	title := strings.TrimSpace(getString(inputs, "titleText", ""))
	if title == "" {
		return model.PostSaveRequest{}, fmt.Errorf("%w: укажите заголовок видео", ErrInvalidPost)
	}
	if len(media) == 0 {
		videoURL := strings.TrimSpace(getString(inputs, "videoUrl", ""))
		if videoURL == "" {
			return model.PostSaveRequest{}, fmt.Errorf("%w: укажите видеофайл", ErrInvalidPost)
		}
		return model.PostSaveRequest{}, fmt.Errorf("%w: для YouTube выберите видео из медиатеки", ErrInvalidPost)
	}
	format := getString(inputs, "format", "shorts")
	if format == "video" {
		format = "video"
	} else {
		format = "shorts"
	}
	return model.PostSaveRequest{
		Content: model.PostContent{
			Format:    format,
			Title:     title,
			Text:      strings.TrimSpace(getString(inputs, "description", "")),
			ParseMode: "HTML",
		},
		Targets: targets,
		Media:   media,
	}, nil
}

func buildDzenWorkflowTestPost(
	inputs map[string]interface{},
	targets []model.PostTargetInput,
	media []model.PostMediaInput,
) (model.PostSaveRequest, error) {
	text := strings.TrimSpace(getString(inputs, "text", ""))
	if text == "" && len(media) == 0 {
		return model.PostSaveRequest{}, fmt.Errorf("%w: укажите текст или медиафайл", ErrInvalidPost)
	}
	format := getString(inputs, "format", "brief")
	return model.PostSaveRequest{
		Content: model.PostContent{
			Format:    format,
			Text:      text,
			ParseMode: "HTML",
		},
		Targets: targets,
		Media:   media,
	}, nil
}

func buildPhotochkaWorkflowTestPost(
	inputs map[string]interface{},
	targets []model.PostTargetInput,
	media []model.PostMediaInput,
) (model.PostSaveRequest, error) {
	text := strings.TrimSpace(getString(inputs, "text", ""))
	hasMediaURL := strings.TrimSpace(getString(inputs, "imageUrl", "")) != "" ||
		strings.TrimSpace(getString(inputs, "videoUrl", "")) != "" ||
		strings.TrimSpace(getString(inputs, "mediaUrl", "")) != ""
	if text == "" && len(media) == 0 && !hasMediaURL {
		return model.PostSaveRequest{}, fmt.Errorf("%w: укажите текст, фото или видео", ErrInvalidPost)
	}
	return model.PostSaveRequest{
		Content: model.PostContent{
			Format:    "message",
			Text:      text,
			ParseMode: "HTML",
		},
		Targets: targets,
		Media:   media,
	}, nil
}

func parseWorkflowTelegramButtons(raw interface{}) [][]model.TelegramInlineButton {
	if raw == nil {
		return nil
	}
	data, err := json.Marshal(raw)
	if err != nil {
		return nil
	}
	var rows [][]workflowButtonRow
	if err := json.Unmarshal(data, &rows); err != nil {
		var flat []workflowButtonRow
		if err2 := json.Unmarshal(data, &flat); err2 != nil {
			return nil
		}
		if len(flat) == 0 {
			return nil
		}
		rows = [][]workflowButtonRow{flat}
	}
	out := make([][]model.TelegramInlineButton, 0, len(rows))
	for _, row := range rows {
		if len(row) == 0 {
			continue
		}
		btnRow := make([]model.TelegramInlineButton, 0, len(row))
		for _, btn := range row {
			text := strings.TrimSpace(btn.Text)
			url := strings.TrimSpace(btn.URL)
			if text == "" || url == "" {
				continue
			}
			btnRow = append(btnRow, model.TelegramInlineButton{
				Text:  text,
				URL:   url,
				Style: model.TelegramButtonStyle(strings.TrimSpace(btn.Style)),
			})
		}
		if len(btnRow) > 0 {
			out = append(out, btnRow)
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

type workflowButtonRow struct {
	Text  string `json:"text"`
	URL   string `json:"url"`
	Style string `json:"style"`
}

func parseWorkflowTelegramStory(raw interface{}) *model.TelegramStorySettings {
	if raw == nil {
		return nil
	}
	data, err := json.Marshal(raw)
	if err != nil {
		return nil
	}
	var settings model.TelegramStorySettings
	if err := json.Unmarshal(data, &settings); err != nil {
		return nil
	}
	if settings.ActivePeriod == 0 && len(settings.Areas) == 0 &&
		!settings.PostToChatPage && !settings.ProtectContent {
		return nil
	}
	return &settings
}
