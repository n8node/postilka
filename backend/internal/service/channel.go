package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrTelegramProviderDisabled = errors.New("telegram channel provider disabled")
	ErrInvalidBotToken          = errors.New("invalid bot token")
	ErrChannelAlreadyConnected  = errors.New("channel already connected")
)

type ChannelService struct {
	channels  *repository.ChannelRepository
	provider  *TelegramProviderSettingsService
	botClient *TelegramBotClient
	wsSvc     *WorkspaceService
	quota     *QuotaService
	cipher    *SecretCipher
}

func NewChannelService(
	channels *repository.ChannelRepository,
	provider *TelegramProviderSettingsService,
	botClient *TelegramBotClient,
	wsSvc *WorkspaceService,
	quota *QuotaService,
	cipher *SecretCipher,
) *ChannelService {
	return &ChannelService{
		channels:  channels,
		provider:  provider,
		botClient: botClient,
		wsSvc:     wsSvc,
		quota:     quota,
		cipher:    cipher,
	}
}

func (s *ChannelService) ensureProviderEnabled(ctx context.Context) error {
	cfg, err := s.provider.GetEffective(ctx)
	if err != nil {
		return err
	}
	if !cfg.Enabled {
		return ErrTelegramProviderDisabled
	}
	return nil
}

func (s *ChannelService) requireEditor(ctx context.Context, userID string, r *http.Request) (*model.Workspace, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleEditor); err != nil {
		return nil, err
	}
	return ws, nil
}

func (s *ChannelService) requireAdmin(ctx context.Context, userID string, r *http.Request) (*model.Workspace, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleAdmin); err != nil {
		return nil, err
	}
	return ws, nil
}

func (s *ChannelService) List(ctx context.Context, userID string, r *http.Request) ([]model.ChannelListItem, error) {
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	items, err := s.channels.ListByWorkspace(ctx, ws.ID)
	if err != nil {
		return nil, err
	}
	out := make([]model.ChannelListItem, 0, len(items))
	for _, ch := range items {
		out = append(out, model.ChannelListItem{
			Channel:     ch,
			BotTokenSet: true,
		})
	}
	return out, nil
}

func (s *ChannelService) DiscoverTelegram(ctx context.Context, userID string, r *http.Request, botToken string) (*model.TelegramDiscoverResult, error) {
	if err := s.ensureProviderEnabled(ctx); err != nil {
		return nil, err
	}
	if _, err := s.requireEditor(ctx, userID, r); err != nil {
		return nil, err
	}
	botToken = strings.TrimSpace(botToken)
	if botToken == "" {
		return nil, ErrInvalidBotToken
	}
	return s.botClient.DiscoverAdminChats(ctx, botToken)
}

func (s *ChannelService) ConnectTelegram(ctx context.Context, userID string, r *http.Request, req model.TelegramConnectRequest) (*model.TelegramConnectResult, error) {
	if err := s.ensureProviderEnabled(ctx); err != nil {
		return nil, err
	}
	ws, err := s.requireAdmin(ctx, userID, r)
	if err != nil {
		return nil, err
	}

	botToken := strings.TrimSpace(req.BotToken)
	if botToken == "" {
		return nil, ErrInvalidBotToken
	}
	if len(req.Channels) == 0 {
		return nil, fmt.Errorf("выберите хотя бы один чат")
	}
	if s.cipher == nil {
		return nil, ErrCryptoUnavailable
	}

	bot, err := s.botClient.GetMe(ctx, botToken)
	if err != nil {
		return nil, fmt.Errorf("%w: %s", ErrInvalidBotToken, sanitizeTelegramError(err).Error())
	}

	encrypted, err := s.cipher.Encrypt(botToken)
	if err != nil {
		return nil, err
	}

	currentCount, err := s.channels.CountByWorkspace(ctx, ws.ID)
	if err != nil {
		return nil, err
	}

	result := &model.TelegramConnectResult{
		Connected: []model.ChannelListItem{},
		Skipped:   []string{},
	}

	for _, input := range req.Channels {
		chatID := strings.TrimSpace(input.ChatID)
		if chatID == "" {
			continue
		}
		exists, err := s.channels.ExistsByChat(ctx, ws.ID, string(model.ChannelProviderTelegram), chatID)
		if err != nil {
			return nil, err
		}
		if exists {
			result.Skipped = append(result.Skipped, chatID)
			continue
		}
		if err := s.quota.CheckChannelQuota(ctx, ws.ID, currentCount+len(result.Connected)); err != nil {
			return nil, err
		}

		chat, _, err := s.botClient.VerifyBotInChat(ctx, botToken, chatID)
		if err != nil {
			return nil, err
		}
		name := strings.TrimSpace(input.Name)
		if name == "" {
			name = strings.TrimSpace(chat.Title)
		}
		if name == "" && chat.Username != "" {
			name = "@" + chat.Username
		}
		if name == "" {
			name = chatID
		}

		created, err := s.channels.Create(ctx, repository.ChannelCreateParams{
			WorkspaceID:       ws.ID,
			Provider:          model.ChannelProviderTelegram,
			Name:              name,
			ChatID:            chatID,
			ChatType:          chat.Type,
			BotUsername:       bot.Username,
			BotTokenEncrypted: encrypted,
			Status:            model.ChannelStatusActive,
		})
		if err != nil {
			return nil, err
		}
		result.Connected = append(result.Connected, model.ChannelListItem{
			Channel:      *created,
			BotTokenSet:  true,
			BotTokenHint: maskSecret(botToken),
		})
	}

	if len(result.Connected) == 0 && len(result.Skipped) > 0 {
		return result, ErrChannelAlreadyConnected
	}
	if len(result.Connected) == 0 {
		return nil, fmt.Errorf("не удалось подключить каналы")
	}
	return result, nil
}

func (s *ChannelService) Verify(ctx context.Context, userID string, r *http.Request, channelID string) (*model.ChannelListItem, error) {
	ws, err := s.requireAdmin(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	ch, err := s.channels.GetByID(ctx, ws.ID, channelID)
	if err != nil {
		return nil, err
	}
	if s.cipher == nil {
		return nil, ErrCryptoUnavailable
	}
	enc, err := s.channels.GetTokenEncrypted(ctx, ws.ID, channelID)
	if err != nil {
		return nil, err
	}
	token, err := s.cipher.Decrypt(enc)
	if err != nil {
		return nil, err
	}
	if _, _, verr := s.botClient.VerifyBotInChat(ctx, token, ch.ChatID); verr != nil {
		_ = s.channels.UpdateStatus(ctx, ws.ID, channelID, model.ChannelStatusNeedsReconnect, verr.Error())
		return nil, verr
	}
	if err := s.channels.UpdateStatus(ctx, ws.ID, channelID, model.ChannelStatusActive, ""); err != nil {
		return nil, err
	}
	refreshed, err := s.channels.GetByID(ctx, ws.ID, channelID)
	if err != nil {
		return nil, err
	}
	return &model.ChannelListItem{Channel: *refreshed, BotTokenSet: true}, nil
}

func (s *ChannelService) Delete(ctx context.Context, userID string, r *http.Request, channelID string) error {
	ws, err := s.requireAdmin(ctx, userID, r)
	if err != nil {
		return err
	}
	return s.channels.Delete(ctx, ws.ID, channelID)
}

func (s *ChannelService) ProviderHelp(ctx context.Context) (string, bool, error) {
	cfg, err := s.provider.GetEffective(ctx)
	if err != nil {
		return "", false, err
	}
	return strings.TrimSpace(cfg.ConnectHelpText), cfg.Enabled, nil
}

func (s *ChannelService) UpdateTelegramToken(ctx context.Context, userID string, r *http.Request, channelID, botToken string) (*model.ChannelListItem, error) {
	ws, err := s.requireAdmin(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if err := s.ensureProviderEnabled(ctx); err != nil {
		return nil, err
	}
	botToken = strings.TrimSpace(botToken)
	if botToken == "" {
		return nil, ErrInvalidBotToken
	}
	if s.cipher == nil {
		return nil, ErrCryptoUnavailable
	}
	ch, err := s.channels.GetByID(ctx, ws.ID, channelID)
	if err != nil {
		return nil, err
	}
	bot, err := s.botClient.GetMe(ctx, botToken)
	if err != nil {
		return nil, fmt.Errorf("%w: %s", ErrInvalidBotToken, sanitizeTelegramError(err).Error())
	}
	if _, _, err := s.botClient.VerifyBotInChat(ctx, botToken, ch.ChatID); err != nil {
		return nil, err
	}
	encrypted, err := s.cipher.Encrypt(botToken)
	if err != nil {
		return nil, err
	}
	updated, err := s.channels.UpdateToken(ctx, ws.ID, channelID, encrypted, bot.Username, model.ChannelStatusActive)
	if err != nil {
		return nil, err
	}
	return &model.ChannelListItem{
		Channel:      *updated,
		BotTokenSet:  true,
		BotTokenHint: maskSecret(botToken),
	}, nil
}
