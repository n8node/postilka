package service

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/repository"
	tzpkg "github.com/postilka/postilka/internal/timezone"
)

type ChannelTestService struct {
	channels       *repository.ChannelRepository
	users          *repository.UserRepository
	botClient      *TelegramBotClient
	youtubeAPI     *YouTubeAPIClient
	socialSettings *SocialProviderSettingsService
	wsSvc          *WorkspaceService
	cipher         *SecretCipher
	maxClient      *oauthclient.MAXBotClient
}

func NewChannelTestService(
	channels *repository.ChannelRepository,
	users *repository.UserRepository,
	botClient *TelegramBotClient,
	youtubeAPI *YouTubeAPIClient,
	socialSettings *SocialProviderSettingsService,
	wsSvc *WorkspaceService,
	cipher *SecretCipher,
) *ChannelTestService {
	return &ChannelTestService{
		channels:       channels,
		users:          users,
		botClient:      botClient,
		youtubeAPI:     youtubeAPI,
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
	req model.ChannelTestMessageRequest,
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

	token, err := s.resolvePublishToken(ctx, ch)
	if err != nil {
		return nil, err
	}

	text := strings.TrimSpace(req.Text)
	title := strings.TrimSpace(req.Title)
	photoURL := strings.TrimSpace(req.PhotoURL)
	videoURL := strings.TrimSpace(req.VideoURL)
	contentType := strings.TrimSpace(req.ContentType)
	if photoURL != "" && videoURL != "" && ch.Provider != model.ChannelProviderRutube {
		return nil, fmt.Errorf("укажите photo_url или video_url, но не оба сразу")
	}
	if ch.Provider == model.ChannelProviderDzen && videoURL != "" {
		return nil, fmt.Errorf("Дзен не поддерживает видео — используйте текст, бриф с картинкой или статью")
	}
	if ch.Provider == model.ChannelProviderRutube {
		ct := strings.ToLower(contentType)
		if ct == "" {
			if videoURL != "" {
				ct = string(oauthclient.RutubeContentVideo)
			} else {
				ct = string(oauthclient.RutubeContentFeed)
			}
			contentType = ct
		}
		if ct == string(oauthclient.RutubeContentVideo) && videoURL == "" {
			return nil, fmt.Errorf("для видео Rutube укажите video_url — Rutube скачает файл по ссылке")
		}
		if ct == string(oauthclient.RutubeContentFeed) && text == "" && photoURL == "" && videoURL == "" {
			text = model.DefaultChannelTestMessage
		}
	}
	if ch.Provider == model.ChannelProviderDzen && strings.EqualFold(contentType, "article") {
		if title == "" {
			title = "Тестовая статья Postilka"
		}
		if text == "" {
			text = "✅ Тестовая публикация от Postilka. Канал подключён корректно."
		}
	} else if text == "" && photoURL == "" && videoURL == "" {
		text = model.DefaultChannelTestMessage
	}

	var publishAt *time.Time
	if ch.Provider == model.ChannelProviderRutube && strings.TrimSpace(req.PublishAt) != "" {
		userTZ := tzpkg.Default
		if s.users != nil {
			if user, err := s.users.GetByID(ctx, userID); err == nil {
				userTZ = tzpkg.Normalize(user.Timezone)
			}
		}
		t, err := tzpkg.ParsePublishAt(req.PublishAt, userTZ)
		if err != nil {
			return nil, err
		}
		publishAt = t
	}

	postID, sendErr := s.publish(ctx, ch, token, text, title, photoURL, videoURL, contentType, publishAt)
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
		result.Message = "Публикация отправлена (ID: " + postID + ")"
	}
	return result, nil
}

func (s *ChannelTestService) publish(
	ctx context.Context,
	ch *model.Channel,
	token, text, title, photoURL, videoURL, contentType string,
	publishAt *time.Time,
) (string, error) {
	if ch.Provider == model.ChannelProviderDzen && videoURL != "" {
		return "", fmt.Errorf("Дзен не поддерживает видео в этой публикации — используйте текст, бриф с картинкой или статью")
	}

	if ch.Provider == model.ChannelProviderTelegram && ch.ChatType == model.TelegramChatTypeBusiness {
		return "", fmt.Errorf("для Telegram Business используйте публикацию истории в композере — тестовое сообщение недоступно")
	}

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
		input := oauthclient.VKWallPostInput{Message: text}
		if photoURL != "" {
			input.Photos = []oauthclient.VKMediaSource{{URL: photoURL}}
		}
		if videoURL != "" {
			input.Video = &oauthclient.VKMediaSource{URL: videoURL}
		}
		client := &oauthclient.VKCommunityClient{}
		postID, err := client.PostWall(ctx, token, ownerID, input)
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
		if photoURL != "" {
			if err := s.maxClient.SendChannelMessage(ctx, token, ch.ChatID, text, []oauthclient.MAXOutgoingAttachment{{
				Type: "image", ImageURL: photoURL,
			}}, nil); err != nil {
				return "", err
			}
			return "", nil
		}
		if videoURL != "" {
			data, filename, err := s.maxClient.DownloadHTTPMedia(ctx, videoURL, oauthclient.MaxMAXVideoBytes, "video.mp4")
			if err != nil {
				return "", err
			}
			videoToken, err := s.maxClient.UploadVideo(ctx, token, data, filename)
			if err != nil {
				return "", err
			}
			if err := s.maxClient.SendChannelMessage(ctx, token, ch.ChatID, text, []oauthclient.MAXOutgoingAttachment{{
				Type: "video", Token: videoToken,
			}}, nil); err != nil {
				return "", err
			}
			return "", nil
		}
		if err := s.maxClient.SendText(ctx, token, ch.ChatID, text); err != nil {
			return "", err
		}
		return "", nil

	case model.ChannelProviderRutube:
		cfg, err := s.socialSettings.GetEffective(ctx, model.SocialProviderRutube)
		if err != nil {
			return "", err
		}
		client := &oauthclient.RutubeClient{
			ClientID:     cfg.OAuthClientID,
			ClientSecret: cfg.OAuthClientSecret,
		}
		return publishToRutube(ctx, client, token, ch.ChatID, contentType, text, title, photoURL, videoURL, publishAt)

	case model.ChannelProviderDzen:
		cfg, err := s.socialSettings.GetEffective(ctx, model.SocialProviderDzen)
		if err != nil {
			return "", err
		}
		client := &oauthclient.DzenClient{
			ClientID: cfg.OAuthClientID, ClientSecret: cfg.OAuthClientSecret,
		}
		ct := strings.TrimSpace(contentType)
		if ct == "" {
			ct = "brief"
		}
		pubID, err := publishToDzen(ctx, client, token, ch.ChatID, ct, text, title, photoURL)
		if err != nil {
			return "", err
		}
		return pubID, nil

	case model.ChannelProviderYouTube:
		row, err := s.channels.GetRowByID(ctx, ch.WorkspaceID, ch.ID)
		if err != nil {
			return "", err
		}
		clientID, clientSecret, err := youtubeOAuthCredentialsFromRow(row, s.cipher)
		if err != nil {
			return "", err
		}
		client := buildYouTubeOAuthClient(s.youtubeAPI, clientID, clientSecret, "")
		verified, err := client.VerifyChannelAccess(ctx, token, ch.ChatID)
		if err != nil {
			return "", err
		}
		return verified.ID, nil

	default:
		return "", fmt.Errorf("провайдер %s не поддерживает тестовую публикацию", ch.Provider)
	}
}

func (s *ChannelTestService) resolvePublishToken(ctx context.Context, ch *model.Channel) (string, error) {
	if ch.Provider == model.ChannelProviderMAX && ch.MaxPostMode == model.MAXPostModePlatform {
		token, _, err := s.socialSettings.ResolveMAXPlatformBotToken(ctx, s.cipher)
		if err != nil {
			return "", fmt.Errorf("бот Postilka для MAX не настроен — обратитесь в поддержку")
		}
		return token, nil
	}

	row, err := s.channels.GetRowByID(ctx, ch.WorkspaceID, ch.ID)
	if err != nil {
		return "", err
	}
	return ensureOAuthAccessToken(ctx, ch, row, s.channels, s.cipher, s.socialSettings)
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
