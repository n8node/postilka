package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrTelegramProviderDisabled = errors.New("telegram channel provider disabled")
	ErrInvalidBotToken          = errors.New("invalid bot token")
	ErrChannelAlreadyConnected  = errors.New("channel already connected")
)

type ChannelService struct {
	channels       *repository.ChannelRepository
	provider       *TelegramProviderSettingsService
	socialSettings *SocialProviderSettingsService
	botClient      *TelegramBotClient
	maxClient      *oauthclient.MAXBotClient
	wsSvc          *WorkspaceService
	quota          *QuotaService
	cipher         *SecretCipher
	business       *TelegramBusinessService
}

func NewChannelService(
	channels *repository.ChannelRepository,
	provider *TelegramProviderSettingsService,
	socialSettings *SocialProviderSettingsService,
	botClient *TelegramBotClient,
	wsSvc *WorkspaceService,
	quota *QuotaService,
	cipher *SecretCipher,
) *ChannelService {
	return &ChannelService{
		channels:       channels,
		provider:       provider,
		socialSettings: socialSettings,
		botClient:      botClient,
		maxClient:      oauthclient.NewMAXBotClient(),
		wsSvc:          wsSvc,
		quota:          quota,
		cipher:         cipher,
	}
}

func (s *ChannelService) SetTelegramBusinessService(business *TelegramBusinessService) {
	s.business = business
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
	rows, err := s.channels.ListRowsByWorkspace(ctx, ws.ID)
	if err != nil {
		return nil, err
	}
	out := make([]model.ChannelListItem, 0, len(rows))
	for _, row := range rows {
		out = append(out, buildChannelListItem(row.Channel, row.BotTokenEncrypted, s.cipher))
	}
	return out, nil
}

func (s *ChannelService) DiscoverTelegram(ctx context.Context, userID string, r *http.Request, botToken string) (*model.TelegramDiscoverResult, error) {
	if err := s.ensureProviderEnabled(ctx); err != nil {
		return nil, err
	}
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	botToken = strings.TrimSpace(botToken)
	if botToken == "" {
		return nil, ErrInvalidBotToken
	}
	result, err := s.botClient.DiscoverAdminChats(ctx, botToken)
	if err != nil {
		return nil, err
	}
	if s.business != nil && result.Bot.ID != 0 {
		_ = s.business.RestoreWebhookForWorkspaceBot(ctx, ws.ID, result.Bot.ID)
	}
	return result, nil
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
		rawChatID := strings.TrimSpace(input.ChatID)
		if rawChatID == "" {
			continue
		}

		chat, member, err := s.botClient.VerifyBotInChat(ctx, botToken, rawChatID)
		if err != nil {
			return nil, err
		}
		normalizedChatID := formatChatID(chat.ID)

		name := strings.TrimSpace(input.Name)
		if name == "" {
			name = strings.TrimSpace(chat.Title)
		}
		if name == "" && chat.Username != "" {
			name = "@" + chat.Username
		}
		if name == "" {
			name = normalizedChatID
		}

		meta := s.telegramConnectMetadata(ctx, botToken, normalizedChatID, chat, member)
		now := time.Now()

		existing, err := s.findTelegramChannel(ctx, ws.ID, normalizedChatID, rawChatID)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			if existing.Provider != model.ChannelProviderTelegram {
				existing = nil
			}
		}
		if existing != nil {
			updated, err := s.channels.SaveChannel(ctx, repository.ChannelSaveParams{
				WorkspaceID:         ws.ID,
				ChannelID:           existing.ID,
				Provider:            model.ChannelProviderTelegram,
				Name:                name,
				ChatType:          chat.Type,
				BotUsername:       bot.Username,
				BotTokenEncrypted: encrypted,
				MaxPostMode:       existing.MaxPostMode,
				Status:              model.ChannelStatusActive,
				Metadata:            meta,
				MetadataRefreshedAt: &now,
			})
			if err != nil {
				return nil, err
			}
			result.Connected = append(result.Connected, model.ChannelListItem{
				Channel:      *updated,
				BotTokenSet:  true,
				BotTokenHint: maskSecret(botToken),
			})
			continue
		}

		if err := s.quota.CheckChannelQuota(ctx, ws.ID, currentCount+len(result.Connected)); err != nil {
			return nil, err
		}

		created, err := s.channels.Create(ctx, repository.ChannelCreateParams{
			WorkspaceID:         ws.ID,
			Provider:            model.ChannelProviderTelegram,
			Name:                name,
			ChatID:              normalizedChatID,
			ChatType:            chat.Type,
			BotUsername:         bot.Username,
			BotTokenEncrypted:   encrypted,
			Status:              model.ChannelStatusActive,
			Metadata:            meta,
			MetadataRefreshedAt: &now,
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

	if len(result.Connected) == 0 {
		return nil, fmt.Errorf("не удалось подключить каналы")
	}
	return result, nil
}

func (s *ChannelService) findTelegramChannel(
	ctx context.Context,
	workspaceID, normalizedChatID, rawChatID string,
) (*model.Channel, error) {
	for _, id := range []string{normalizedChatID, rawChatID} {
		if strings.TrimSpace(id) == "" {
			continue
		}
		ch, err := s.channels.GetByChat(ctx, workspaceID, string(model.ChannelProviderTelegram), id)
		if err == nil {
			return ch, nil
		}
		if !errors.Is(err, repository.ErrNotFound) {
			return nil, err
		}
	}
	return nil, nil
}

func (s *ChannelService) telegramConnectMetadata(
	ctx context.Context,
	botToken, chatID string,
	chat telegramChat,
	member telegramChatMember,
) model.ChannelMetadata {
	meta := telegramChannelMetadata(chat, member)
	if publicURL := telegramPublicAvatarURL(chat); publicURL != "" {
		meta = mergeChannelAvatar(meta, publicURL)
	} else if uri, err := s.botClient.ChatPhotoDataURI(ctx, botToken, chatID); err == nil && uri != "" {
		meta = mergeChannelAvatar(meta, uri)
	}
	return meta
}

func (s *ChannelService) Verify(ctx context.Context, userID string, r *http.Request, channelID string) (*model.ChannelListItem, error) {
	return s.VerifyAndRefresh(ctx, userID, r, channelID)
}

func (s *ChannelService) Delete(ctx context.Context, userID string, r *http.Request, channelID string) error {
	ws, err := s.requireAdmin(ctx, userID, r)
	if err != nil {
		return err
	}
	return s.channels.Delete(ctx, ws.ID, channelID)
}

func (s *ChannelService) ProviderInfo(ctx context.Context) model.ChannelProviderInfo {
	return s.provider.ChannelProviderInfo(ctx)
}

func (s *ChannelService) UpdateTelegramToken(ctx context.Context, userID string, r *http.Request, channelID, botToken string) (*model.ChannelListItem, error) {
	botToken = strings.TrimSpace(botToken)
	if botToken == "" {
		return nil, ErrInvalidBotToken
	}
	return s.Update(ctx, userID, r, channelID, model.ChannelUpdateRequest{
		BotToken: &botToken,
	})
}
