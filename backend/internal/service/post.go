package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
	"unicode"
	"unicode/utf16"
	"unicode/utf8"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrInvalidPost = errors.New("invalid post")
	ErrPostConflict = errors.New("post conflict")
)

const (
	maxPostTargets = 100
	maxPostMedia = 10
	maxTelegramButtons = 100
	maxPublishAttempts = 5
)

type PostService struct {
	posts       *repository.PostRepository
	channels    *repository.ChannelRepository
	workspaces  *WorkspaceService
	publication *PublicationService
	approvals   *repository.PostApprovalRepository
}

func NewPostService(
	posts *repository.PostRepository,
	channels *repository.ChannelRepository,
	workspaces *WorkspaceService,
	publication *PublicationService,
	approvals *repository.PostApprovalRepository,
) *PostService {
	return &PostService{
		posts: posts, channels: channels, workspaces: workspaces,
		publication: publication, approvals: approvals,
	}
}

func (s *PostService) requireEditor(
	ctx context.Context,
	userID string,
	r *http.Request,
) (*model.Workspace, error) {
	ws, _, err := s.workspaces.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if ws == nil {
		return nil, ErrNoPrimaryWS
	}
	if _, err := s.workspaces.RequireMembership(ctx, userID, ws.ID, model.RoleEditor); err != nil {
		return nil, err
	}
	return ws, nil
}

func (s *PostService) List(
	ctx context.Context,
	userID string,
	r *http.Request,
	limit, offset int,
) ([]model.Post, error) {
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	return s.posts.List(ctx, ws.ID, limit, offset)
}

func (s *PostService) Get(ctx context.Context, userID string, r *http.Request, postID string) (*model.Post, error) {
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	return s.posts.Get(ctx, ws.ID, postID)
}

func (s *PostService) Create(
	ctx context.Context,
	userID string,
	r *http.Request,
	req model.PostSaveRequest,
) (*model.Post, error) {
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if err := s.validate(ctx, ws.ID, req, false); err != nil {
		return nil, err
	}
	return s.posts.Create(ctx, ws.ID, userID, req)
}

func (s *PostService) Update(
	ctx context.Context,
	userID string,
	r *http.Request,
	postID string,
	req model.PostSaveRequest,
) (*model.Post, error) {
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if err := s.validate(ctx, ws.ID, req, false); err != nil {
		return nil, err
	}
	return s.posts.Update(ctx, ws.ID, postID, req)
}

func (s *PostService) Delete(ctx context.Context, userID string, r *http.Request, postID string) error {
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return err
	}
	return s.posts.DeleteDraft(ctx, ws.ID, postID)
}

func (s *PostService) Schedule(
	ctx context.Context,
	userID string,
	r *http.Request,
	postID string,
	dueAt time.Time,
) (*model.Post, error) {
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	post, err := s.posts.Get(ctx, ws.ID, postID)
	if err != nil {
		return nil, err
	}
	if err := ValidatePostForPublication(*post); err != nil {
		return nil, err
	}
	if err := s.validateExistingTargets(ctx, post); err != nil {
		return nil, err
	}
	if dueAt.IsZero() || !dueAt.After(time.Now()) {
		return nil, fmt.Errorf("%w: время публикации должно быть в будущем", ErrInvalidPost)
	}
	submit, err := s.shouldSubmitForApproval(ctx, userID, *post)
	if err != nil {
		return nil, err
	}
	if submit {
		return s.SubmitForApproval(ctx, userID, r, postID, model.PostApprovalSubmitRequest{DueAt: &dueAt})
	}
	return s.posts.SetScheduled(ctx, ws.ID, postID, dueAt.UTC())
}

func (s *PostService) PublishNow(
	ctx context.Context,
	userID string,
	r *http.Request,
	postID string,
) (*model.Post, error) {
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	post, err := s.posts.Get(ctx, ws.ID, postID)
	if err != nil {
		return nil, err
	}
	if err := ValidatePostForPublication(*post); err != nil {
		return nil, err
	}
	if err := s.validateExistingTargets(ctx, post); err != nil {
		return nil, err
	}
	submit, err := s.shouldSubmitForApproval(ctx, userID, *post)
	if err != nil {
		return nil, err
	}
	if submit {
		return s.SubmitForApproval(ctx, userID, r, postID, model.PostApprovalSubmitRequest{})
	}
	if err := s.posts.SetPublishing(ctx, ws.ID, postID); err != nil {
		return nil, ErrPostConflict
	}
	return s.publishAndGet(ctx, ws.ID, postID)
}

func (s *PostService) publishAndGet(ctx context.Context, workspaceID, postID string) (*model.Post, error) {
	if err := s.publication.Publish(ctx, postID, false); err != nil {
		post, getErr := s.posts.Get(ctx, workspaceID, postID)
		if getErr == nil && postPublishDelivered(*post) {
			return post, nil
		}
		return nil, err
	}
	post, err := s.posts.Get(ctx, workspaceID, postID)
	if err != nil {
		if fallback, fbErr := s.posts.GetByID(ctx, postID); fbErr == nil && fallback.WorkspaceID == workspaceID {
			return fallback, nil
		}
		return nil, err
	}
	return post, nil
}

func postPublishDelivered(post model.Post) bool {
	if post.Status == model.PostStatusPublished {
		return true
	}
	hasDeliverable := false
	for _, target := range post.Targets {
		if target.Status == model.PostTargetCanceled {
			continue
		}
		hasDeliverable = true
		if target.Status != model.PostTargetPublished {
			return false
		}
	}
	return hasDeliverable
}

func (s *PostService) Cancel(
	ctx context.Context,
	userID string,
	r *http.Request,
	postID string,
) (*model.Post, error) {
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	return s.posts.Cancel(ctx, ws.ID, postID)
}

func (s *PostService) validateExistingTargets(ctx context.Context, post *model.Post) error {
	for _, target := range post.Targets {
		channel, err := s.channels.GetByID(ctx, post.WorkspaceID, target.ChannelID)
		if err != nil {
			return fmt.Errorf("%w: канал не найден", ErrInvalidPost)
		}
		if channel.Status != model.ChannelStatusActive {
			return fmt.Errorf("%w: канал «%s» неактивен или требует переподключения", ErrInvalidPost, channel.Name)
		}
		if len(post.Media) > 0 && !channel.Provider.PublishCapabilities().ComposerMedia {
			return fmt.Errorf("%w: вложения композера для %s пока не поддерживаются", ErrInvalidPost, channel.Provider.Label())
		}
		if len(post.Media) > 0 && channel.Provider == model.ChannelProviderMAX {
			maxMedia := channel.Provider.PublishCapabilities().MaxMedia
			if maxMedia <= 0 {
				maxMedia = 12
			}
			if len(post.Media) > maxMedia {
				return fmt.Errorf("%w: MAX принимает не более %d вложений", ErrInvalidPost, maxMedia)
			}
		}
		targetSettings, err := DecodePostTargetSettings(target.Settings)
		if err != nil {
			return err
		}
		content, settings := mergePostTarget(post.Content, post.Settings, targetSettings)
		if err := ValidatePostContent(content, settings); err != nil {
			return err
		}
		if err := validateContentForChannel(content, channel); err != nil {
			return err
		}
	}
	return nil
}

func (s *PostService) validate(
	ctx context.Context,
	workspaceID string,
	req model.PostSaveRequest,
	requireTargets bool,
) error {
	post := model.Post{Content: req.Content, Settings: req.Settings}
	post.Targets = make([]model.PostTarget, len(req.Targets))
	seenChannels := make(map[string]struct{}, len(req.Targets))
	validateGlobal := len(req.Targets) == 0
	if len(req.Targets) > maxPostTargets {
		return fmt.Errorf("%w: можно выбрать не более %d каналов", ErrInvalidPost, maxPostTargets)
	}
	for i, target := range req.Targets {
		channelID := strings.TrimSpace(target.ChannelID)
		if channelID == "" {
			return fmt.Errorf("%w: не указан канал", ErrInvalidPost)
		}
		if _, exists := seenChannels[channelID]; exists {
			return fmt.Errorf("%w: канал выбран повторно", ErrInvalidPost)
		}
		seenChannels[channelID] = struct{}{}
		channel, err := s.channels.GetByID(ctx, workspaceID, channelID)
		if err != nil {
			return fmt.Errorf("%w: канал не найден", ErrInvalidPost)
		}
		if channel.Status != model.ChannelStatusActive {
			return fmt.Errorf("%w: канал «%s» неактивен или требует переподключения", ErrInvalidPost, channel.Name)
		}
		targetSettings, err := DecodePostTargetSettings(target.Settings)
		if err != nil {
			return err
		}
		if !targetSettings.Detached {
			validateGlobal = true
		}
		content, settings := mergePostTarget(req.Content, req.Settings, targetSettings)
		if err := validateContentForChannel(content, channel); err != nil {
			return err
		}
		if targetSettings.Detached && !isPostContentEmpty(content) {
			if err := ValidatePostContent(content, settings); err != nil {
				return err
			}
		}
		post.Targets[i] = model.PostTarget{ChannelID: channelID}
	}
	if requireTargets && len(post.Targets) == 0 {
		return fmt.Errorf("%w: выберите хотя бы один канал", ErrInvalidPost)
	}
	if len(req.Media) > maxPostMedia {
		return fmt.Errorf("%w: можно прикрепить не более %d файлов", ErrInvalidPost, maxPostMedia)
	}
	fileIDs := make([]string, 0, len(req.Media))
	seenFiles := make(map[string]struct{}, len(req.Media))
	for _, media := range req.Media {
		fileID := strings.TrimSpace(media.FileID)
		if fileID == "" {
			return fmt.Errorf("%w: не указан медиафайл", ErrInvalidPost)
		}
		if _, exists := seenFiles[fileID]; exists {
			return fmt.Errorf("%w: медиафайл выбран повторно", ErrInvalidPost)
		}
		seenFiles[fileID] = struct{}{}
		fileIDs = append(fileIDs, fileID)
	}
	if err := s.posts.ValidateFiles(ctx, workspaceID, fileIDs); err != nil {
		return fmt.Errorf("%w: %s", ErrInvalidPost, err.Error())
	}
	if !validateGlobal {
		return nil
	}
	if strings.TrimSpace(req.Content.Format) == "" &&
		strings.TrimSpace(req.Content.Text) == "" &&
		req.Content.RichMessage == nil &&
		len(req.Content.Entities) == 0 &&
		len(req.Content.Buttons) == 0 {
		return validatePostSettings(req.Settings)
	}
	return ValidatePostContent(req.Content, req.Settings)
}

func DecodePostTargetSettings(raw json.RawMessage) (model.PostTargetSettings, error) {
	var settings model.PostTargetSettings
	if len(bytes.TrimSpace(raw)) == 0 || bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		return settings, nil
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&settings); err != nil {
		return settings, fmt.Errorf("%w: некорректные настройки целевого канала", ErrInvalidPost)
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return settings, fmt.Errorf("%w: некорректные настройки целевого канала", ErrInvalidPost)
	}
	if !settings.Detached && (settings.Content != nil || settings.Settings != nil) {
		return settings, fmt.Errorf("%w: индивидуальные настройки требуют detached=true", ErrInvalidPost)
	}
	return settings, nil
}

func mergePostTarget(
	content model.PostContent,
	settings model.PostSettings,
	target model.PostTargetSettings,
) (model.PostContent, model.PostSettings) {
	if !target.Detached {
		return content, settings
	}
	if override := target.Content; override != nil {
		if override.Format != "" {
			content.Format = override.Format
		}
		if override.Text != "" {
			content.Text = override.Text
		}
		if override.ParseMode != "" {
			content.ParseMode = override.ParseMode
		}
		if override.Entities != nil {
			content.Entities = override.Entities
		}
		if override.Buttons != nil {
			content.Buttons = override.Buttons
		}
		if override.RichMessage != nil {
			content.RichMessage = override.RichMessage
		}
	}
	if override := target.Settings; override != nil {
		if override.FirstComment != "" {
			settings.FirstComment = override.FirstComment
		}
		if override.Location != nil {
			settings.Location = override.Location
		}
		if override.Link != nil {
			settings.Link = override.Link
		}
		if override.UTM != nil {
			settings.UTM = override.UTM
		}
	}
	return content, settings
}

func isPostContentEmpty(content model.PostContent) bool {
	return strings.TrimSpace(content.Format) == "" &&
		strings.TrimSpace(content.Text) == "" &&
		content.RichMessage == nil &&
		len(content.Entities) == 0 &&
		len(content.Buttons) == 0
}

func validateContentForChannel(content model.PostContent, channel *model.Channel) error {
	format := strings.ToLower(strings.TrimSpace(content.Format))
	if format == "" {
		format = "message"
	}
	if format != "message" && channel.Provider != model.ChannelProviderTelegram {
		return fmt.Errorf("%w: формат %s поддерживается только Telegram", ErrInvalidPost, format)
	}
	textLength := utf8.RuneCountInString(content.Text)
	if channel.Provider == model.ChannelProviderTelegram && format == "message" && textLength > 4096 {
		return fmt.Errorf("%w: текст Telegram не должен превышать 4096 символов", ErrInvalidPost)
	}
	if channel.Provider == model.ChannelProviderTelegram &&
		(format == "story" || format == "short_video") && textLength > 1024 {
		return fmt.Errorf("%w: подпись к медиа Telegram не должна превышать 1024 символа", ErrInvalidPost)
	}
	if channel.Provider == model.ChannelProviderMAX && textLength > 4000 {
		return fmt.Errorf("%w: текст MAX не должен превышать 4000 символов", ErrInvalidPost)
	}
	return nil
}

func ValidatePostForPublication(post model.Post) error {
	if len(post.Targets) == 0 {
		return fmt.Errorf("%w: выберите хотя бы один канал", ErrInvalidPost)
	}
	for _, target := range post.Targets {
		targetSettings, err := DecodePostTargetSettings(target.Settings)
		if err != nil {
			return err
		}
		content, settings := mergePostTarget(post.Content, post.Settings, targetSettings)
		format := strings.ToLower(strings.TrimSpace(content.Format))
		if format == "" {
			format = "message"
		}
		if isPostContentEmpty(content) && format != "story" && format != "short_video" {
			return fmt.Errorf("%w: введите текст публикации для каждого канала", ErrInvalidPost)
		}
		if format == "story" || format == "short_video" {
			if len(post.Media) != 1 {
				return fmt.Errorf("%w: для формата %s нужен ровно один медиафайл", ErrInvalidPost, format)
			}
		}
		if err := ValidatePostContent(content, settings); err != nil {
			return err
		}
	}
	return nil
}

var telegramHTMLTag = regexp.MustCompile(`(?i)<\s*/?\s*([a-z0-9-]+)(?:\s+[^>]*)?>`)
var telegramAnchorTag = regexp.MustCompile(`(?i)^<\s*a\s+href="https?://[^"]+"\s*>$`)
var telegramCodeTag = regexp.MustCompile(`(?i)^<\s*code\s+class="language-[a-z0-9_+-]+"\s*>$`)
var telegramEmojiTag = regexp.MustCompile(`(?i)^<\s*tg-emoji\s+emoji-id="[1-9][0-9]*"\s*>$`)
var telegramSpoilerTag = regexp.MustCompile(`(?i)^<\s*span\s+class="tg-spoiler"\s*>$`)
var telegramExpandableQuoteTag = regexp.MustCompile(`(?i)^<blockquote expandable>$`)
var telegramCustomEmojiID = regexp.MustCompile(`^[1-9][0-9]*$`)
var telegramAllowedHTMLTags = map[string]bool{
	"b": true, "strong": true, "i": true, "em": true, "u": true, "ins": true,
	"s": true, "strike": true, "del": true, "span": true, "tg-spoiler": true,
	"a": true, "code": true, "pre": true, "blockquote": true, "tg-emoji": true,
}

func validateTelegramHTML(text string) error {
	for _, match := range telegramHTMLTag.FindAllStringSubmatch(text, -1) {
		if len(match) < 2 || !telegramAllowedHTMLTags[strings.ToLower(match[1])] {
			return fmt.Errorf("%w: HTML-тег <%s> не поддерживается Telegram", ErrInvalidPost, match[1])
		}
		tag := strings.ToLower(match[1])
		raw := strings.ToLower(match[0])
		plainOpen := "<" + tag + ">"
		plainClose := "</" + tag + ">"
		allowed := raw == plainOpen || raw == plainClose ||
			(tag == "a" && telegramAnchorTag.MatchString(raw)) ||
			(tag == "code" && telegramCodeTag.MatchString(raw)) ||
			(tag == "tg-emoji" && telegramEmojiTag.MatchString(raw)) ||
			(tag == "span" && telegramSpoilerTag.MatchString(raw)) ||
			(tag == "blockquote" && telegramExpandableQuoteTag.MatchString(raw))
		if !allowed {
			return fmt.Errorf("%w: атрибуты тега <%s> не разрешены", ErrInvalidPost, tag)
		}
	}
	withoutTags := telegramHTMLTag.ReplaceAllString(text, "")
	if strings.ContainsAny(withoutTags, "<>") {
		return fmt.Errorf("%w: некорректная HTML-разметка", ErrInvalidPost)
	}
	return nil
}

func ValidatePostContent(content model.PostContent, settings model.PostSettings) error {
	format := strings.ToLower(strings.TrimSpace(content.Format))
	if format == "" {
		format = "message"
	}
	switch format {
	case "message":
		text := strings.TrimSpace(content.Text)
		if text == "" {
			return fmt.Errorf("%w: введите текст публикации", ErrInvalidPost)
		}
		if utf8.RuneCountInString(text) > 16384 {
			return fmt.Errorf("%w: текст публикации не должен превышать 16384 символов", ErrInvalidPost)
		}
		parseMode := strings.ToUpper(strings.TrimSpace(content.ParseMode))
		if parseMode != "" && parseMode != "HTML" {
			return fmt.Errorf("%w: поддерживается только безопасный HTML или явные entities", ErrInvalidPost)
		}
		if parseMode == "HTML" {
			if len(content.Entities) > 0 {
				return fmt.Errorf("%w: parse_mode и entities нельзя использовать одновременно", ErrInvalidPost)
			}
			if err := validateTelegramHTML(content.Text); err != nil {
				return err
			}
		}
		if err := validateTelegramEntities(content.Text, content.Entities); err != nil {
			return err
		}
		if err := validateTelegramButtons(content.Buttons); err != nil {
			return err
		}
	case "rich_message", "article":
		if content.RichMessage == nil {
			return fmt.Errorf("%w: укажите структуру rich_message", ErrInvalidPost)
		}
		if err := ValidateTelegramRichMessage(*content.RichMessage); err != nil {
			return err
		}
		if err := validateTelegramButtons(content.Buttons); err != nil {
			return err
		}
	case "story", "short_video":
		text := strings.TrimSpace(content.Text)
		if utf8.RuneCountInString(text) > 1024 {
			return fmt.Errorf("%w: подпись к медиа не должна превышать 1024 символа", ErrInvalidPost)
		}
		parseMode := strings.ToUpper(strings.TrimSpace(content.ParseMode))
		if parseMode == "HTML" && text != "" {
			if err := validateTelegramHTML(content.Text); err != nil {
				return err
			}
		}
	default:
		return fmt.Errorf("%w: неизвестный формат публикации", ErrInvalidPost)
	}
	return validatePostSettings(settings)
}

func validatePostSettings(settings model.PostSettings) error {
	if utf8.RuneCountInString(settings.FirstComment) > 4096 {
		return fmt.Errorf("%w: первый комментарий не должен превышать 4096 символов", ErrInvalidPost)
	}
	if settings.Location != nil {
		if settings.Location.Latitude < -90 || settings.Location.Latitude > 90 ||
			settings.Location.Longitude < -180 || settings.Location.Longitude > 180 {
			return fmt.Errorf("%w: некорректные координаты", ErrInvalidPost)
		}
	}
	if settings.Link != nil && strings.TrimSpace(settings.Link.URL) != "" {
		if err := validateHTTPURL(settings.Link.URL); err != nil {
			return fmt.Errorf("%w: некорректная ссылка", ErrInvalidPost)
		}
	}
	if settings.UTM != nil {
		for name, value := range map[string]string{
			"utm_source": settings.UTM.Source,
			"utm_medium": settings.UTM.Medium,
			"utm_campaign": settings.UTM.Campaign,
		} {
			limit := 100
			if name == "utm_campaign" {
				limit = 200
			}
			if utf8.RuneCountInString(value) > limit || !safeUTMValue(value) {
				return fmt.Errorf("%w: некорректное значение %s", ErrInvalidPost, name)
			}
		}
	}
	if settings.Recurrence != nil && settings.Recurrence.Enabled {
		if settings.Recurrence.IntervalDays < 1 {
			return fmt.Errorf("%w: интервал evergreen-повтора должен быть не меньше 1 дня", ErrInvalidPost)
		}
		if settings.Recurrence.MaxRuns != nil && *settings.Recurrence.MaxRuns < 1 {
			return fmt.Errorf("%w: лимит повторов должен быть не меньше 1", ErrInvalidPost)
		}
		if settings.Recurrence.EndsAt != nil && settings.Recurrence.EndsAt.Before(time.Now()) {
			return fmt.Errorf("%w: дата окончания повторов должна быть в будущем", ErrInvalidPost)
		}
	}
	return nil
}

func safeUTMValue(value string) bool {
	for _, r := range value {
		if unicode.IsLetter(r) || unicode.IsNumber(r) || r == ' ' ||
			r == '-' || r == '_' || r == '.' {
			continue
		}
		return false
	}
	return true
}

func ValidateTelegramRichMessage(message model.TelegramRichMessage) error {
	if len(message.Blocks) == 0 {
		return fmt.Errorf("%w: rich_message должен содержать хотя бы один блок", ErrInvalidPost)
	}
	if utf8.RuneCountInString(message.Title) > 256 {
		return fmt.Errorf("%w: rich_message слишком большой", ErrInvalidPost)
	}
	total, count := 0, 0
	if strings.TrimSpace(message.Title) != "" {
		total += utf8.RuneCountInString(message.Title)
		count++
	}
	if err := validateTelegramRichBlocks(message.Blocks, &total, &count, 0); err != nil {
		return err
	}
	if total > 32768 || count > 100 {
		return fmt.Errorf("%w: rich_message слишком большой", ErrInvalidPost)
	}
	return validateTelegramButtons(message.Buttons)
}

func validateTelegramRichBlocks(
	blocks []model.TelegramRichBlock,
	total, count *int,
	depth int,
) error {
	if depth > 3 {
		return fmt.Errorf("%w: слишком глубокая вложенность rich_message", ErrInvalidPost)
	}
	for _, block := range blocks {
		*count++
		if len(block.Entities) > 0 {
			return fmt.Errorf("%w: entities внутри rich blocks пока не поддерживаются", ErrInvalidPost)
		}
		switch block.Type {
		case "paragraph", "footer":
			if strings.TrimSpace(block.Text) == "" {
				return fmt.Errorf("%w: блок %s не может быть пустым", ErrInvalidPost, block.Type)
			}
			*total += utf8.RuneCountInString(block.Text)
		case "heading":
			if strings.TrimSpace(block.Text) == "" || block.Size < 1 || block.Size > 6 {
				return fmt.Errorf("%w: heading требует text и size от 1 до 6", ErrInvalidPost)
			}
			*total += utf8.RuneCountInString(block.Text)
		case "code":
			if strings.TrimSpace(block.Text) == "" || utf8.RuneCountInString(block.Language) > 64 {
				return fmt.Errorf("%w: code требует text и корректный language", ErrInvalidPost)
			}
			*total += utf8.RuneCountInString(block.Text)
		case "quote", "pullquote":
			if strings.TrimSpace(block.Text) == "" || utf8.RuneCountInString(block.Credit) > 256 {
				return fmt.Errorf("%w: %s требует text и короткий credit", ErrInvalidPost, block.Type)
			}
			*total += utf8.RuneCountInString(block.Text) + utf8.RuneCountInString(block.Credit)
		case "divider":
			if block.Text != "" || len(block.Blocks) > 0 || len(block.Items) > 0 {
				return fmt.Errorf("%w: divider не принимает содержимое", ErrInvalidPost)
			}
		case "list":
			if len(block.Items) == 0 || len(block.Items) > 100 {
				return fmt.Errorf("%w: list должен содержать от 1 до 100 элементов", ErrInvalidPost)
			}
			for _, item := range block.Items {
				if err := validateParagraphBlocks(item.Blocks, total, count, depth+1); err != nil {
					return err
				}
			}
		case "details":
			if strings.TrimSpace(block.Summary) == "" || len(block.Blocks) == 0 {
				return fmt.Errorf("%w: details требует summary и blocks", ErrInvalidPost)
			}
			*total += utf8.RuneCountInString(block.Summary)
			if err := validateParagraphBlocks(block.Blocks, total, count, depth+1); err != nil {
				return err
			}
		case "table":
			if len(block.Rows) == 0 || len(block.Rows) > 50 {
				return fmt.Errorf("%w: table должен содержать от 1 до 50 строк", ErrInvalidPost)
			}
			width := len(block.Rows[0])
			if width == 0 || width > 20 {
				return fmt.Errorf("%w: table должен содержать от 1 до 20 колонок", ErrInvalidPost)
			}
			for _, row := range block.Rows {
				if len(row) != width {
					return fmt.Errorf("%w: строки table должны иметь одинаковую длину", ErrInvalidPost)
				}
				for _, cell := range row {
					if cell.Align != "" && cell.Align != "left" {
						return fmt.Errorf("%w: table поддерживает align=left", ErrInvalidPost)
					}
					if cell.VAlign != "" && cell.VAlign != "top" {
						return fmt.Errorf("%w: table поддерживает valign=top", ErrInvalidPost)
					}
					*total += utf8.RuneCountInString(cell.Text)
				}
			}
		case "mathematical_expression":
			if strings.TrimSpace(block.Expression) == "" || utf8.RuneCountInString(block.Expression) > 4096 {
				return fmt.Errorf("%w: mathematical_expression требует expression", ErrInvalidPost)
			}
			*total += utf8.RuneCountInString(block.Expression)
		default:
			return fmt.Errorf("%w: неподдерживаемый тип блока rich_message", ErrInvalidPost)
		}
		if *total > 32768 || *count > 100 {
			return fmt.Errorf("%w: rich_message слишком большой", ErrInvalidPost)
		}
	}
	return nil
}

func validateParagraphBlocks(
	blocks []model.TelegramRichBlock,
	total, count *int,
	depth int,
) error {
	if len(blocks) == 0 || len(blocks) > 100 {
		return fmt.Errorf("%w: вложенный элемент требует blocks", ErrInvalidPost)
	}
	for _, block := range blocks {
		if block.Type != "paragraph" {
			return fmt.Errorf("%w: вложенные blocks должны быть paragraph", ErrInvalidPost)
		}
	}
	return validateTelegramRichBlocks(blocks, total, count, depth)
}

func validateTelegramEntities(text string, entities []model.TelegramMessageEntity) error {
	allowed := map[string]bool{
		"mention": true, "hashtag": true, "cashtag": true, "bot_command": true,
		"url": true, "email": true, "phone_number": true, "bold": true, "italic": true,
		"underline": true, "strikethrough": true, "spoiler": true, "blockquote": true,
		"expandable_blockquote": true, "code": true, "pre": true, "text_link": true,
		"custom_emoji": true,
	}
	textLength := len(utf16.Encode([]rune(text)))
	for _, entity := range entities {
		if !allowed[entity.Type] || entity.Offset < 0 || entity.Length <= 0 ||
			entity.Offset > textLength || entity.Length > textLength-entity.Offset {
			return fmt.Errorf("%w: некорректная разметка текста", ErrInvalidPost)
		}
		if entity.Type == "text_link" && validateHTTPURL(entity.URL) != nil {
			return fmt.Errorf("%w: некорректная ссылка в entities", ErrInvalidPost)
		}
		if entity.Type == "custom_emoji" && !telegramCustomEmojiID.MatchString(entity.CustomEmojiID) {
			return fmt.Errorf("%w: custom_emoji_id должен быть числовым", ErrInvalidPost)
		}
	}
	return nil
}

func validateTelegramButtons(rows [][]model.TelegramInlineButton) error {
	count := 0
	for _, row := range rows {
		if len(row) == 0 || len(row) > 8 {
			return fmt.Errorf("%w: в строке должно быть от 1 до 8 кнопок", ErrInvalidPost)
		}
		for _, button := range row {
			count++
			if strings.TrimSpace(button.Text) == "" || utf8.RuneCountInString(button.Text) > 64 {
				return fmt.Errorf("%w: у кнопки должен быть текст", ErrInvalidPost)
			}
			switch button.Style {
			case "", model.TelegramButtonDefault, model.TelegramButtonPrimary,
				model.TelegramButtonSuccess, model.TelegramButtonDanger:
			default:
				return fmt.Errorf("%w: неподдерживаемый стиль кнопки", ErrInvalidPost)
			}
			if button.IconCustomEmojiID != "" && !telegramCustomEmojiID.MatchString(button.IconCustomEmojiID) {
				return fmt.Errorf("%w: icon_custom_emoji_id должен быть числовым", ErrInvalidPost)
			}
			actions := 0
			for _, value := range []string{button.URL, button.CallbackData, button.CopyText, button.WebAppURL} {
				if strings.TrimSpace(value) != "" {
					actions++
				}
			}
			if actions != 1 {
				return fmt.Errorf("%w: у кнопки должно быть ровно одно действие", ErrInvalidPost)
			}
			if button.URL != "" && validateHTTPURL(button.URL) != nil {
				return fmt.Errorf("%w: некорректная URL-кнопка", ErrInvalidPost)
			}
			if button.WebAppURL != "" && validateHTTPURL(button.WebAppURL) != nil {
				return fmt.Errorf("%w: некорректная Web App ссылка", ErrInvalidPost)
			}
			if len([]byte(button.CallbackData)) > 64 {
				return fmt.Errorf("%w: callback_data не должен превышать 64 байта", ErrInvalidPost)
			}
			if utf8.RuneCountInString(button.CopyText) > 256 {
				return fmt.Errorf("%w: copy_text не должен превышать 256 символов", ErrInvalidPost)
			}
		}
	}
	if count > maxTelegramButtons {
		return fmt.Errorf("%w: можно добавить не более %d кнопок", ErrInvalidPost, maxTelegramButtons)
	}
	return nil
}

func validateHTTPURL(raw string) error {
	parsed, err := url.ParseRequestURI(strings.TrimSpace(raw))
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return errors.New("invalid URL")
	}
	return nil
}

var contentAbsoluteHTTPURL = regexp.MustCompile(`(?i)https?://[^\s<>"']+`)

type textURLReplacement struct {
	oldStart int
	oldEnd   int
	newLen   int
}

func ApplyUTMToContent(content model.PostContent, utm *model.PostUTMSettings) model.PostContent {
	if utm == nil || (utm.Source == "" && utm.Medium == "" && utm.Campaign == "") {
		return content
	}
	var replacements []textURLReplacement
	content.Text, replacements = rewriteTextURLs(content.Text, utm)
	if len(content.Entities) > 0 {
		content.Entities = append([]model.TelegramMessageEntity(nil), content.Entities...)
		adjustTelegramEntities(content.Entities, replacements)
		for i := range content.Entities {
			if content.Entities[i].URL != "" {
				content.Entities[i].URL = rewriteAbsoluteURL(content.Entities[i].URL, utm)
			}
		}
	}
	if content.RichMessage != nil {
		rich := *content.RichMessage
		rich.Title, _ = rewriteTextURLs(rich.Title, utm)
		rich.Blocks = rewriteRichBlocks(rich.Blocks, utm)
		content.RichMessage = &rich
	}
	return content
}

func rewriteRichBlocks(
	blocks []model.TelegramRichBlock,
	utm *model.PostUTMSettings,
) []model.TelegramRichBlock {
	out := make([]model.TelegramRichBlock, len(blocks))
	for i, source := range blocks {
		block := source
		block.Text, _ = rewriteTextURLs(source.Text, utm)
		block.Credit, _ = rewriteTextURLs(source.Credit, utm)
		block.Summary, _ = rewriteTextURLs(source.Summary, utm)
		block.Expression, _ = rewriteTextURLs(source.Expression, utm)
		if source.Blocks != nil {
			block.Blocks = rewriteRichBlocks(source.Blocks, utm)
		}
		if source.Items != nil {
			block.Items = make([]model.TelegramRichListItem, len(source.Items))
			for itemIndex, sourceItem := range source.Items {
				block.Items[itemIndex] = model.TelegramRichListItem{
					Blocks: rewriteRichBlocks(sourceItem.Blocks, utm),
				}
			}
		}
		if source.Rows != nil {
			block.Rows = make([][]model.TelegramRichTableCell, len(source.Rows))
			for rowIndex, sourceRow := range source.Rows {
				block.Rows[rowIndex] = make([]model.TelegramRichTableCell, len(sourceRow))
				for cellIndex, sourceCell := range sourceRow {
					cell := sourceCell
					cell.Text, _ = rewriteTextURLs(sourceCell.Text, utm)
					block.Rows[rowIndex][cellIndex] = cell
				}
			}
		}
		out[i] = block
	}
	return out
}

func rewriteTextURLs(text string, utm *model.PostUTMSettings) (string, []textURLReplacement) {
	matches := contentAbsoluteHTTPURL.FindAllStringIndex(text, -1)
	if len(matches) == 0 {
		return text, nil
	}
	var builder strings.Builder
	last := 0
	replacements := make([]textURLReplacement, 0, len(matches))
	for _, match := range matches {
		start, end := match[0], match[1]
		core, _ := splitURLPunctuation(text[start:end])
		coreEnd := start + len(core)
		rewritten := rewriteAbsoluteURL(core, utm)
		if rewritten == core {
			continue
		}
		builder.WriteString(text[last:start])
		builder.WriteString(rewritten)
		replacements = append(replacements, textURLReplacement{
			oldStart: utf16Length(text[:start]),
			oldEnd:   utf16Length(text[:coreEnd]),
			newLen:   utf16Length(rewritten),
		})
		last = coreEnd
	}
	if len(replacements) == 0 {
		return text, nil
	}
	builder.WriteString(text[last:])
	return builder.String(), replacements
}

func splitURLPunctuation(candidate string) (string, string) {
	core := candidate
	suffix := ""
	for len(core) > 0 {
		last := core[len(core)-1]
		trim := strings.ContainsRune(".,!?;:", rune(last))
		switch last {
		case ')':
			trim = strings.Count(core, ")") > strings.Count(core, "(")
		case ']':
			trim = strings.Count(core, "]") > strings.Count(core, "[")
		case '}':
			trim = strings.Count(core, "}") > strings.Count(core, "{")
		}
		if !trim {
			break
		}
		suffix = string(last) + suffix
		core = core[:len(core)-1]
	}
	return core, suffix
}

func rewriteAbsoluteURL(raw string, utm *model.PostUTMSettings) string {
	if utm == nil {
		return raw
	}
	encodedHTML := strings.Contains(raw, "&amp;")
	candidate := html.UnescapeString(raw)
	parsed, err := url.Parse(candidate)
	if err != nil || parsed.Host == "" {
		return raw
	}
	scheme := strings.ToLower(parsed.Scheme)
	if scheme != "http" && scheme != "https" {
		return raw
	}
	query := parsed.Query()
	if utm.Source != "" {
		query.Set("utm_source", utm.Source)
	}
	if utm.Medium != "" {
		query.Set("utm_medium", utm.Medium)
	}
	if utm.Campaign != "" {
		query.Set("utm_campaign", utm.Campaign)
	}
	parsed.RawQuery = query.Encode()
	rewritten := parsed.String()
	if encodedHTML {
		rewritten = strings.ReplaceAll(rewritten, "&", "&amp;")
	}
	return rewritten
}

func adjustTelegramEntities(entities []model.TelegramMessageEntity, replacements []textURLReplacement) {
	accumulated := 0
	for _, replacement := range replacements {
		start := replacement.oldStart + accumulated
		end := replacement.oldEnd + accumulated
		delta := replacement.newLen - (replacement.oldEnd - replacement.oldStart)
		for i := range entities {
			entityStart := entities[i].Offset
			entityEnd := entityStart + entities[i].Length
			if entityEnd <= start {
				continue
			}
			if entityStart >= end {
				entities[i].Offset += delta
				continue
			}
			newStart := entityStart
			if entityStart > start {
				newStart = start
			}
			newEnd := entityEnd
			if entityEnd >= end {
				newEnd += delta
			} else {
				newEnd = start + replacement.newLen
			}
			entities[i].Offset = newStart
			entities[i].Length = newEnd - newStart
		}
		accumulated += delta
	}
}

func utf16Length(value string) int {
	return len(utf16.Encode([]rune(value)))
}
