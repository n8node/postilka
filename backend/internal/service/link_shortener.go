package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

const linkCodeAlphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

var botUserAgentPattern = regexp.MustCompile(`(?i)(bot|crawler|spider|preview|facebookexternalhit|telegrambot|whatsapp|slurp|bingpreview)`)

type LinkShortenerService struct {
	repo    *repository.LinkCodeRepository
	baseURL string
}

func NewLinkShortenerService(repo *repository.LinkCodeRepository, baseURL string) *LinkShortenerService {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if baseURL == "" {
		baseURL = "https://postilka.ru/go"
	}
	return &LinkShortenerService{repo: repo, baseURL: baseURL}
}

func (s *LinkShortenerService) BaseURL() string {
	return s.baseURL
}

func (s *LinkShortenerService) ShortURL(code string) string {
	return s.baseURL + "/" + code
}

func (s *LinkShortenerService) EnsureShortLink(
	ctx context.Context,
	workspaceID, postID, targetID, channelID, destinationURL string,
) (string, error) {
	destinationURL = strings.TrimSpace(destinationURL)
	if destinationURL == "" {
		return "", errors.New("empty destination URL")
	}
	if existing, err := s.repo.FindExisting(ctx, workspaceID, postID, targetID, destinationURL); err == nil {
		return s.ShortURL(existing.Code), nil
	} else if !errors.Is(err, repository.ErrNotFound) {
		return "", err
	}
	for attempt := 0; attempt < 5; attempt++ {
		code, err := generateLinkCode(10)
		if err != nil {
			return "", err
		}
		link, err := s.repo.Create(ctx, repository.LinkCodeCreateInput{
			Code: code, DestinationURL: destinationURL, WorkspaceID: workspaceID,
			PostID: postID, TargetID: targetID, ChannelID: channelID,
		})
		if err == nil {
			return s.ShortURL(link.Code), nil
		}
		if !isUniqueViolation(err) {
			return "", err
		}
	}
	return "", fmt.Errorf("failed to allocate link code")
}

func (s *LinkShortenerService) Resolve(
	ctx context.Context,
	code, referrer, userAgent string,
) (string, error) {
	link, err := s.repo.GetByCode(ctx, code)
	if err != nil {
		return "", err
	}
	isBot := isBotUserAgent(userAgent)
	_ = s.repo.RecordClick(ctx, link.ID, hashForLog(referrer), hashForLog(userAgent), isBot)
	return link.DestinationURL, nil
}

type linkShortenContext struct {
	workspaceID string
	postID      string
	targetID    string
	channelID   string
	shortener   *LinkShortenerService
	cache       map[string]string
}

func ApplyLinkShorteningToContent(
	ctx context.Context,
	content model.PostContent,
	shortener *LinkShortenerService,
	workspaceID, postID, targetID, channelID string,
	utm *model.PostUTMSettings,
) (model.PostContent, error) {
	if shortener == nil || utm == nil || !utm.Shorten {
		return content, nil
	}
	lctx := linkShortenContext{
		workspaceID: workspaceID,
		postID:      postID,
		targetID:    targetID,
		channelID:   channelID,
		shortener:   shortener,
		cache:       map[string]string{},
	}
	var err error
	content.Text, err = shortenTextURLs(ctx, content.Text, utm, lctx)
	if err != nil {
		return content, err
	}
	for i := range content.Entities {
		if content.Entities[i].URL != "" {
			rewritten, rewriteErr := shortenAbsoluteURL(ctx, content.Entities[i].URL, utm, lctx)
			if rewriteErr != nil {
				return content, rewriteErr
			}
			content.Entities[i].URL = rewritten
		}
	}
	if content.RichMessage != nil {
		rich := *content.RichMessage
		rich.Title, err = shortenTextURLs(ctx, rich.Title, utm, lctx)
		if err != nil {
			return content, err
		}
		rich.Blocks, err = shortenRichBlocks(ctx, rich.Blocks, utm, lctx)
		if err != nil {
			return content, err
		}
		content.RichMessage = &rich
	}
	if content.Buttons != nil {
		content.Buttons, err = shortenButtons(ctx, content.Buttons, utm, lctx)
		if err != nil {
			return content, err
		}
	}
	return content, nil
}

func shortenButtons(
	ctx context.Context,
	rows [][]model.TelegramInlineButton,
	utm *model.PostUTMSettings,
	lctx linkShortenContext,
) ([][]model.TelegramInlineButton, error) {
	out := make([][]model.TelegramInlineButton, len(rows))
	for rowIndex, row := range rows {
		out[rowIndex] = make([]model.TelegramInlineButton, len(row))
		for buttonIndex, button := range row {
			btn := button
			if btn.URL != "" {
				rewritten, err := shortenAbsoluteURL(ctx, btn.URL, utm, lctx)
				if err != nil {
					return nil, err
				}
				btn.URL = rewritten
			}
			if btn.WebAppURL != "" {
				rewritten, err := shortenAbsoluteURL(ctx, btn.WebAppURL, utm, lctx)
				if err != nil {
					return nil, err
				}
				btn.WebAppURL = rewritten
			}
			out[rowIndex][buttonIndex] = btn
		}
	}
	return out, nil
}

func shortenRichBlocks(
	ctx context.Context,
	blocks []model.TelegramRichBlock,
	utm *model.PostUTMSettings,
	lctx linkShortenContext,
) ([]model.TelegramRichBlock, error) {
	out := make([]model.TelegramRichBlock, len(blocks))
	for i, source := range blocks {
		block := source
		var err error
		block.Text, err = shortenTextURLs(ctx, source.Text, utm, lctx)
		if err != nil {
			return nil, err
		}
		block.Credit, err = shortenTextURLs(ctx, source.Credit, utm, lctx)
		if err != nil {
			return nil, err
		}
		block.Summary, err = shortenTextURLs(ctx, source.Summary, utm, lctx)
		if err != nil {
			return nil, err
		}
		block.Expression, err = shortenTextURLs(ctx, source.Expression, utm, lctx)
		if err != nil {
			return nil, err
		}
		if source.Blocks != nil {
			block.Blocks, err = shortenRichBlocks(ctx, source.Blocks, utm, lctx)
			if err != nil {
				return nil, err
			}
		}
		if source.Items != nil {
			block.Items = make([]model.TelegramRichListItem, len(source.Items))
			for itemIndex, sourceItem := range source.Items {
				block.Items[itemIndex] = model.TelegramRichListItem{
					Blocks: sourceItem.Blocks,
				}
				block.Items[itemIndex].Blocks, err = shortenRichBlocks(ctx, sourceItem.Blocks, utm, lctx)
				if err != nil {
					return nil, err
				}
			}
		}
		if source.Rows != nil {
			block.Rows = make([][]model.TelegramRichTableCell, len(source.Rows))
			for rowIndex, sourceRow := range source.Rows {
				block.Rows[rowIndex] = make([]model.TelegramRichTableCell, len(sourceRow))
				for cellIndex, sourceCell := range sourceRow {
					cell := sourceCell
					cell.Text, err = shortenTextURLs(ctx, sourceCell.Text, utm, lctx)
					if err != nil {
						return nil, err
					}
					block.Rows[rowIndex][cellIndex] = cell
				}
			}
		}
		out[i] = block
	}
	return out, nil
}

func shortenTextURLs(
	ctx context.Context,
	text string,
	utm *model.PostUTMSettings,
	lctx linkShortenContext,
) (string, error) {
	matches := contentAbsoluteHTTPURL.FindAllStringIndex(text, -1)
	if len(matches) == 0 {
		return text, nil
	}
	var builder strings.Builder
	last := 0
	for _, match := range matches {
		start, end := match[0], match[1]
		core, suffix := splitURLPunctuation(text[start:end])
		rewritten, err := shortenAbsoluteURL(ctx, core, utm, lctx)
		if err != nil {
			return text, err
		}
		builder.WriteString(text[last:start])
		builder.WriteString(rewritten)
		builder.WriteString(suffix)
		last = end
	}
	builder.WriteString(text[last:])
	return builder.String(), nil
}

func shortenAbsoluteURL(
	ctx context.Context,
	raw string,
	utm *model.PostUTMSettings,
	lctx linkShortenContext,
) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return raw, nil
	}
	if strings.HasPrefix(strings.ToLower(raw), strings.ToLower(lctx.shortener.baseURL+"/")) {
		return raw, nil
	}
	withUTM := rewriteAbsoluteURL(raw, utm)
	if cached, ok := lctx.cache[withUTM]; ok {
		return cached, nil
	}
	shortURL, err := lctx.shortener.EnsureShortLink(
		ctx, lctx.workspaceID, lctx.postID, lctx.targetID, lctx.channelID, withUTM,
	)
	if err != nil {
		return "", err
	}
	lctx.cache[withUTM] = shortURL
	return shortURL, nil
}

func generateLinkCode(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	out := make([]byte, length)
	for i, b := range bytes {
		out[i] = linkCodeAlphabet[int(b)%len(linkCodeAlphabet)]
	}
	return string(out), nil
}

func hashForLog(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:8])
}

func isBotUserAgent(userAgent string) bool {
	userAgent = strings.TrimSpace(userAgent)
	if userAgent == "" {
		return false
	}
	return botUserAgentPattern.MatchString(userAgent)
}

func isUniqueViolation(err error) bool {
	return err != nil && strings.Contains(strings.ToLower(err.Error()), "duplicate")
}
