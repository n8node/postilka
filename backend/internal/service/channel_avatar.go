package service

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/repository"
)

func mergeChannelAvatar(meta model.ChannelMetadata, avatarURL string) model.ChannelMetadata {
	avatarURL = strings.TrimSpace(avatarURL)
	if avatarURL != "" {
		meta.AvatarURL = avatarURL
	}
	return meta
}

func (s *ChannelService) FetchAvatar(
	ctx context.Context,
	userID string,
	r *http.Request,
	channelID string,
) ([]byte, string, error) {
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return nil, "", err
	}
	row, err := s.channels.GetRowByID(ctx, ws.ID, channelID)
	if err != nil {
		return nil, "", err
	}
	ch := row.Channel

	if url := strings.TrimSpace(ch.Metadata.AvatarURL); url != "" {
		return fetchRemoteAvatar(ctx, url)
	}

	if s.cipher == nil {
		return nil, "", ErrCryptoUnavailable
	}

	token, err := resolveChannelPublishToken(ctx, &ch, s.channels, s.cipher, s.socialSettings)
	if err != nil {
		return nil, "", err
	}

	switch ch.Provider {
	case model.ChannelProviderTelegram:
		body, contentType, err := s.botClient.FetchChatPhoto(ctx, token, ch.ChatID)
		if err != nil {
			return nil, "", err
		}
		if len(body) == 0 {
			return nil, "", repository.ErrNotFound
		}
		return body, contentType, nil

	case model.ChannelProviderMAX:
		maxChat, err := s.maxClient.GetChat(ctx, token, parseMAXChatID(ch.ChatID))
		if err != nil {
			return nil, "", err
		}
		if url := oauthclient.MAXChatAvatarURL(maxChat); url != "" {
			return fetchRemoteAvatar(ctx, url)
		}
		return nil, "", repository.ErrNotFound

	default:
		if avatarURL, err := s.lookupOAuthAvatar(ctx, ch.Provider, token, ch.ChatID); err == nil && avatarURL != "" {
			return fetchRemoteAvatar(ctx, avatarURL)
		}
		return nil, "", repository.ErrNotFound
	}
}

func fetchRemoteAvatar(ctx context.Context, rawURL string) ([]byte, string, error) {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return nil, "", repository.ErrNotFound
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, "", err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil, "", fmt.Errorf("avatar fetch: HTTP %d", resp.StatusCode)
	}
	contentType := strings.TrimSpace(resp.Header.Get("Content-Type"))
	if contentType == "" {
		contentType = "image/jpeg"
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, "", err
	}
	if len(body) == 0 {
		return nil, "", repository.ErrNotFound
	}
	return body, contentType, nil
}

func (s *ChannelService) lookupOAuthAvatar(
	ctx context.Context,
	provider model.ChannelProvider,
	accessToken, externalID string,
) (string, error) {
	socialProvider, ok := oauthProviderFromChannel(provider)
	if !ok {
		return "", repository.ErrNotFound
	}
	cfg, err := s.socialSettings.GetEffective(ctx, socialProvider)
	if err != nil {
		return "", err
	}

	switch socialProvider {
	case model.SocialProviderVK:
		client := &oauthclient.VKCommunityClient{
			AppID: cfg.OAuthClientID, AppSecret: cfg.OAuthClientSecret,
		}
		groups, err := client.ListAdminGroups(ctx, accessToken)
		if err != nil {
			return "", err
		}
		for _, g := range groups {
			if oauthclient.VKGroupExternalID(g.ID) == externalID {
				return strings.TrimSpace(g.Photo50), nil
			}
		}

	case model.SocialProviderOK:
		client := &oauthclient.OKClient{
			AppID: cfg.OAuthClientID, AppSecret: cfg.OAuthClientSecret,
		}
		groups, err := client.ListManagedGroups(ctx, accessToken)
		if err != nil {
			return "", err
		}
		for _, g := range groups {
			if oauthclient.OKGroupExternalID(g.GroupID) == externalID {
				return strings.TrimSpace(g.PhotoURL), nil
			}
		}

	case model.SocialProviderRutube:
		client := &oauthclient.RutubeClient{
			ClientID: cfg.OAuthClientID, ClientSecret: cfg.OAuthClientSecret,
		}
		channels, err := client.ListChannels(ctx, accessToken)
		if err != nil {
			return "", err
		}
		for _, ch := range channels {
			if oauthclient.RutubeChannelExternalID(ch.ID) == externalID {
				return strings.TrimSpace(ch.Icon), nil
			}
		}
	}

	return "", repository.ErrNotFound
}

func oauthProviderFromChannel(provider model.ChannelProvider) (model.SocialProvider, bool) {
	switch provider {
	case model.ChannelProviderVK:
		return model.SocialProviderVK, true
	case model.ChannelProviderOK:
		return model.SocialProviderOK, true
	case model.ChannelProviderRutube:
		return model.SocialProviderRutube, true
	case model.ChannelProviderDzen:
		return model.SocialProviderDzen, true
	default:
		return "", false
	}
}

func lookupOAuthAvatarFromTargets(targets []model.DiscoveredChannelTarget, externalID string) string {
	for _, t := range targets {
		if t.ExternalID == externalID {
			return strings.TrimSpace(t.AvatarURL)
		}
	}
	return ""
}
