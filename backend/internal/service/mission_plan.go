package service

import (
	"context"
	"net/url"
	"strings"
	"unicode/utf8"

	"github.com/postilka/postilka/internal/model"
)

func mapStoredPostFormat(format string) string {
	switch strings.ToLower(strings.TrimSpace(format)) {
	case "", "wall_post", "feed", "brief":
		return "message"
	default:
		return strings.ToLower(strings.TrimSpace(format))
	}
}

func storedFormatsForChannel(ch model.Channel) []string {
	caps := model.PublishCapabilitiesForChannel(ch)
	seen := map[string]struct{}{}
	out := make([]string, 0, len(caps.Formats))
	for _, format := range caps.Formats {
		stored := mapStoredPostFormat(format)
		if stored == "" {
			continue
		}
		if _, ok := seen[stored]; ok {
			continue
		}
		seen[stored] = struct{}{}
		out = append(out, stored)
	}
	if len(out) == 0 {
		return []string{"message"}
	}
	return out
}

func intersectStoredFormats(channels []model.Channel) []string {
	if len(channels) == 0 {
		return []string{"message"}
	}
	counts := map[string]int{}
	order := make([]string, 0)
	for i, ch := range channels {
		seen := map[string]struct{}{}
		for _, format := range storedFormatsForChannel(ch) {
			if _, dup := seen[format]; dup {
				continue
			}
			seen[format] = struct{}{}
			if i == 0 {
				order = append(order, format)
			}
			counts[format]++
		}
	}
	out := make([]string, 0, len(order))
	for _, format := range order {
		if counts[format] == len(channels) {
			out = append(out, format)
		}
	}
	if len(out) == 0 {
		return storedFormatsForChannel(channels[0])
	}
	return out
}

func resolveItemFormat(requested string, channels []model.Channel) string {
	allowed := intersectStoredFormats(channels)
	req := mapStoredPostFormat(requested)
	for _, format := range allowed {
		if format == req {
			return req
		}
	}
	if len(allowed) > 0 {
		return allowed[0]
	}
	return "message"
}

func formatAllowsURLButtons(format string) bool {
	switch format {
	case "message", "rich_message", "article":
		return true
	default:
		return false
	}
}

func allChannelsAllowInlineButtons(channels []model.Channel) bool {
	if len(channels) == 0 {
		return false
	}
	for _, ch := range channels {
		if !model.PublishCapabilitiesForChannel(ch).InlineButtons {
			return false
		}
	}
	return true
}

func channelsAllowPhoto(channels []model.Channel) bool {
	for _, ch := range channels {
		if model.PublishCapabilitiesForChannel(ch).Photo || model.PublishCapabilitiesForChannel(ch).ComposerMedia {
			return true
		}
	}
	return false
}

func channelsAllowVideo(channels []model.Channel) bool {
	for _, ch := range channels {
		caps := model.PublishCapabilitiesForChannel(ch)
		if caps.Video || caps.ComposerMedia {
			return true
		}
	}
	return false
}

func maxMediaForChannels(channels []model.Channel) int {
	max := 10
	for i, ch := range channels {
		n := model.PublishCapabilitiesForChannel(ch).MaxMedia
		if n <= 0 {
			n = 1
		}
		if i == 0 || n < max {
			max = n
		}
	}
	if max < 1 {
		return 1
	}
	return max
}

func normalizeMediaKind(kind, format string, fileCount int) string {
	kind = strings.ToLower(strings.TrimSpace(kind))
	switch kind {
	case "photo", "video", "album", "none":
	default:
		kind = ""
	}
	if kind == "" {
		switch format {
		case "story", "short_video", "video", "shorts":
			kind = "video"
		default:
			if fileCount > 1 {
				kind = "album"
			} else if fileCount == 1 {
				kind = "photo"
			} else {
				kind = "none"
			}
		}
	}
	return kind
}

func normalizePlanButtons(buttons []model.MissionPlanButton) []model.MissionPlanButton {
	out := make([]model.MissionPlanButton, 0, len(buttons))
	for _, btn := range buttons {
		text := strings.TrimSpace(btn.Text)
		rawURL := strings.TrimSpace(btn.URL)
		if text == "" || rawURL == "" {
			continue
		}
		if utf8.RuneCountInString(text) > 64 {
			text = string([]rune(text)[:64])
		}
		parsed, err := url.Parse(rawURL)
		if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
			continue
		}
		out = append(out, model.MissionPlanButton{Text: text, URL: rawURL})
		if len(out) >= 8 {
			break
		}
	}
	return out
}

func urlButtonRows(buttons []model.MissionPlanButton) [][]model.TelegramInlineButton {
	if len(buttons) == 0 {
		return nil
	}
	rows := make([][]model.TelegramInlineButton, 0, len(buttons))
	for _, btn := range buttons {
		rows = append(rows, []model.TelegramInlineButton{{
			Text: btn.Text,
			URL:  btn.URL,
		}})
	}
	return rows
}

func looksLikeUUID(id string) bool {
	id = strings.TrimSpace(id)
	if len(id) != 36 {
		return false
	}
	for i, c := range id {
		switch i {
		case 8, 13, 18, 23:
			if c != '-' {
				return false
			}
		default:
			if (c < '0' || c > '9') && (c < 'a' || c > 'f') && (c < 'A' || c > 'F') {
				return false
			}
		}
	}
	return true
}

func uniqueFileIDs(ids []string) []string {
	out := make([]string, 0, len(ids))
	seen := map[string]struct{}{}
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if !looksLikeUUID(id) {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}

func (s *MissionService) filterWorkspaceFiles(ctx context.Context, workspaceID string, ids []string, kind string) []string {
	ids = uniqueFileIDs(ids)
	if len(ids) == 0 || s.files == nil {
		return ids
	}
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		file, err := s.files.GetByID(ctx, workspaceID, id, false)
		if err != nil {
			continue
		}
		mime := strings.ToLower(file.MimeType)
		switch kind {
		case "video":
			if !strings.HasPrefix(mime, "video/") {
				continue
			}
		case "photo", "album":
			if !strings.HasPrefix(mime, "image/") {
				continue
			}
		}
		out = append(out, id)
	}
	return out
}

func (s *MissionService) channelsByIDs(ctx context.Context, workspaceID string, ids []string) ([]model.Channel, error) {
	ids, err := s.filterWorkspaceChannels(ctx, workspaceID, ids)
	if err != nil {
		return nil, err
	}
	if len(ids) == 0 {
		return nil, nil
	}
	rows, err := s.channels.ListRowsByWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	byID := map[string]model.Channel{}
	for _, row := range rows {
		byID[row.Channel.ID] = row.Channel
	}
	out := make([]model.Channel, 0, len(ids))
	for _, id := range ids {
		if ch, ok := byID[id]; ok {
			out = append(out, ch)
		}
	}
	return out, nil
}

func buildPlanDraftRequest(item model.MissionPlanItem, channels []model.Channel, campaign string, shorten bool) model.PostSaveRequest {
	format := resolveItemFormat(item.Format, channels)
	text := strings.TrimSpace(item.Text)
	title := strings.TrimSpace(item.Title)
	if title == "" && (format == "video" || format == "shorts") {
		runes := []rune(text)
		if len(runes) > 80 {
			title = string(runes[:80])
		} else if text != "" {
			title = text
		} else {
			title = "Видео"
		}
	}
	content := model.PostContent{
		Format:    format,
		Title:     title,
		Text:      text,
		ParseMode: "HTML",
	}
	if format == "rich_message" || format == "article" {
		content.ParseMode = ""
		content.RichMessage = &model.TelegramRichMessage{
			Title: title,
			Blocks: []model.TelegramRichBlock{{
				Type: "paragraph",
				Text: text,
			}},
		}
	}
	req := model.PostSaveRequest{
		Content: content,
		Settings: model.PostSettings{
			UTM: &model.PostUTMSettings{
				Source:   "postilka",
				Medium:   "social",
				Campaign: campaign,
				Shorten:  shorten,
			},
		},
	}
	maxMedia := maxMediaForChannels(channels)
	fileIDs := uniqueFileIDs(item.FileIDs)
	if len(fileIDs) > maxMedia {
		fileIDs = fileIDs[:maxMedia]
	}
	kind := normalizeMediaKind(item.MediaKind, format, len(fileIDs))
	if kind == "none" {
		fileIDs = nil
	}
	if (kind == "photo" || kind == "album") && !channelsAllowPhoto(channels) {
		fileIDs = nil
	}
	if kind == "video" && !channelsAllowVideo(channels) {
		fileIDs = nil
	}
	if format == "story" || format == "short_video" || format == "video" || format == "shorts" {
		if len(fileIDs) > 1 {
			fileIDs = fileIDs[:1]
		}
	}
	for _, id := range fileIDs {
		req.Media = append(req.Media, model.PostMediaInput{FileID: id})
	}
	if formatAllowsURLButtons(format) && allChannelsAllowInlineButtons(channels) {
		buttons := normalizePlanButtons(item.Buttons)
		rows := urlButtonRows(buttons)
		if len(rows) > 0 {
			for _, ch := range channels {
				switch ch.Provider {
				case model.ChannelProviderTelegram:
					req.Content.Buttons = rows
					if req.Content.RichMessage != nil {
						req.Content.RichMessage.Buttons = rows
					}
				case model.ChannelProviderMAX:
					req.Settings.MaxButtons = rows
				}
			}
		}
	}
	targets := make([]model.PostTargetInput, 0, len(channels))
	for _, ch := range channels {
		targets = append(targets, model.PostTargetInput{ChannelID: ch.ID})
	}
	req.Targets = targets
	return req
}

func planItemHasContent(item model.MissionPlanItem) bool {
	return strings.TrimSpace(item.Text) != "" ||
		strings.TrimSpace(item.Title) != "" ||
		len(uniqueFileIDs(item.FileIDs)) > 0 ||
		strings.TrimSpace(item.ImagePrompt) != "" ||
		strings.TrimSpace(item.VideoPrompt) != ""
}

func fileHintLine(f model.WorkspaceFile) string {
	kind := "file"
	if strings.HasPrefix(f.MimeType, "image/") {
		kind = "photo"
	} else if strings.HasPrefix(f.MimeType, "video/") {
		kind = "video"
	}
	return "- " + kind + " id=" + f.ID + " name=" + f.Name + " mime=" + f.MimeType
}
