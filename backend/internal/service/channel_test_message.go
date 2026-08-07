package service

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/repository"
)

type ChannelTestService struct {
	channels       *repository.ChannelRepository
	botClient      *TelegramBotClient
	socialSettings *SocialProviderSettingsService
	wsSvc          *WorkspaceService
	cipher         *SecretCipher
	maxClient      *oauthclient.MAXBotClient
}

func NewChannelTestService(
	channels *repository.ChannelRepository,
	botClient *TelegramBotClient,
	socialSettings *SocialProviderSettingsService,
	wsSvc *WorkspaceService,
	cipher *SecretCipher,
) *ChannelTestService {
	return &ChannelTestService{
		channels:       channels,
		botClient:      botClient,
		socialSettings: socialSettings,
		wsSvc:          wsSvc,
		cipher:         cipher,
		maxClient:      oauthclient.NewMAXBotClient(),
	}
}

func (s *ChannelTestService) SendTestMessage(
	ctx context.Context,
	userID string,
	r *http.Request,
	channelID string,
	text string,
) (*model.ChannelTestMessageResult, error) {
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
	if strings.TrimSpace(enc) == "" {
		return nil, fmt.Errorf("токен канала не сохранён — переподключите канал")
	}
	token, err := s.cipher.Decrypt(enc)
	if err != nil {
		return nil, err
	}

	text = strings.TrimSpace(text)
	if text == "" {
		text = model.DefaultChannelTestMessage
	}

	postID, sendErr := s.publish(ctx, ch, token, text)
	if sendErr != nil {
		_ = s.channels.UpdateStatus(ctx, ws.ID, channelID, model.ChannelStatusNeedsReconnect, sendErr.Error())
		return nil, sendErr
	}

	_ = s.channels.UpdateStatus(ctx, ws.ID, channelID, model.ChannelStatusActive, "")
	result := &model.ChannelTestMessageResult{
		Success: true,
		Message: "Тестовое сообщение отправлено",
	}
	if postID != "" {
		result.ProviderPostID = postID
	}
	return result, nil
}

func (s *ChannelTestService) publish(ctx context.Context, ch *model.Channel, token, text string) (string, error) {
	switch ch.Provider {
	case model.ChannelProviderTelegram:
		if err := s.botClient.SendMessage(ctx, token, ch.ChatID, text); err != nil {
			return "", err
		}
		return "", nil

	case model.ChannelProviderVK:
		ownerID, err := strconv.ParseInt(strings.TrimSpace(ch.ChatID), 10, 64)
		if err != nil {
			return "", fmt.Errorf("некорректный ID сообщества VK")
		}
		client := &oauthclient.VKCommunityClient{}
		postID, err := client.PostWallMessage(ctx, token, ownerID, text)
		if err != nil {
			return "", err
		}
		return strconv.FormatInt(postID, 10), nil

	case model.ChannelProviderOK:
		cfg, err := s.socialSettings.GetEffective(ctx, model.SocialProviderOK)
		if err != nil {
			return "", err
		}
		client := &oauthclient.OKClient{AppID: cfg.OAuthClientID, AppSecret: cfg.OAuthClientSecret}
		if err := client.PostGroupText(ctx, token, ch.ChatID, text); err != nil {
			return "", err
		}
		return "", nil

	case model.ChannelProviderMAX:
		if err := s.maxClient.SendText(ctx, token, ch.ChatID, text); err != nil {
			return "", err
		}
		return "", nil

	case model.ChannelProviderRutube:
		client := &oauthclient.RutubeClient{}
		if err := client.PostChannelText(ctx, token, ch.ChatID, text); err != nil {
			return "", err
		}
		return "", nil

	case model.ChannelProviderDzen:
		client := &oauthclient.DzenClient{}
		pubID, err := client.PostBrief(ctx, token, ch.ChatID, text)
		if err != nil {
			return "", err
		}
		return pubID, nil

	default:
		return "", fmt.Errorf("провайдер %s не поддерживает тестовую публикацию", ch.Provider)
	}
}

func (s *ChannelTestService) requireAdmin(ctx context.Context, userID string, r *http.Request) (*model.Workspace, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleAdmin); err != nil {
		return nil, err
	}
	return ws, nil
}
