package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/repository"
)

const oauthTokenRefreshSkew = 5 * time.Minute

type channelOAuthCredentials struct {
	AccessTokenEncrypted  string
	RefreshTokenEncrypted string
	TokenExpiresAt        *time.Time
}

func (s *ChannelConnectService) oauthCredentialsFromSession(session *model.ChannelOAuthSession) channelOAuthCredentials {
	return channelOAuthCredentials{
		AccessTokenEncrypted:  session.AccessTokenEncrypted,
		RefreshTokenEncrypted: session.RefreshTokenEncrypted,
		TokenExpiresAt:        session.TokenExpiresAt,
	}
}

func resolveChannelPublishToken(
	ctx context.Context,
	ch *model.Channel,
	channels *repository.ChannelRepository,
	cipher *SecretCipher,
	social *SocialProviderSettingsService,
) (string, error) {
	if ch.Provider == model.ChannelProviderMAX && ch.MaxPostMode == model.MAXPostModePlatform {
		token, _, err := social.ResolveMAXPlatformBotToken(ctx, cipher)
		if err != nil {
			return "", fmt.Errorf("бот Postilka для MAX не настроен — обратитесь в поддержку")
		}
		return token, nil
	}

	row, err := channels.GetRowByID(ctx, ch.WorkspaceID, ch.ID)
	if err != nil {
		return "", err
	}
	return ensureOAuthAccessToken(ctx, ch, row, channels, cipher, social)
}

func ensureOAuthAccessToken(
	ctx context.Context,
	ch *model.Channel,
	row *repository.ChannelRow,
	channels *repository.ChannelRepository,
	cipher *SecretCipher,
	social *SocialProviderSettingsService,
) (string, error) {
	if strings.TrimSpace(row.BotTokenEncrypted) == "" {
		return "", fmt.Errorf("токен канала не сохранён — переподключите канал")
	}

	accessToken, err := cipher.Decrypt(row.BotTokenEncrypted)
	if err != nil {
		return "", err
	}

	provider, ok := oauthProviderFromChannel(ch.Provider)
	if !ok || !providerUsesOAuthRefresh(provider) {
		return accessToken, nil
	}
	if row.TokenExpiresAt == nil || time.Now().Add(oauthTokenRefreshSkew).Before(*row.TokenExpiresAt) {
		return accessToken, nil
	}
	if strings.TrimSpace(row.RefreshTokenEncrypted) == "" {
		return accessToken, nil
	}

	refreshPlain, err := cipher.Decrypt(row.RefreshTokenEncrypted)
	if err != nil {
		return "", err
	}

	cfg, err := social.GetEffective(ctx, provider)
	if err != nil {
		return "", err
	}

	var (
		newAccess  string
		newRefresh string
		expiresIn  int
	)
	switch provider {
	case model.SocialProviderDzen:
		client := &oauthclient.DzenClient{
			ClientID:     cfg.OAuthClientID,
			ClientSecret: cfg.OAuthClientSecret,
		}
		token, err := client.RefreshToken(ctx, refreshPlain)
		if err != nil {
			return "", fmt.Errorf("не удалось обновить токен Дзен — переподключите канал: %w", err)
		}
		newAccess = token.AccessToken
		newRefresh = token.RefreshToken
		expiresIn = token.ExpiresIn

	case model.SocialProviderRutube:
		client := &oauthclient.RutubeClient{
			ClientID:     cfg.OAuthClientID,
			ClientSecret: cfg.OAuthClientSecret,
		}
		token, err := client.RefreshToken(ctx, refreshPlain)
		if err != nil {
			return "", fmt.Errorf("не удалось обновить токен Rutube — переподключите канал: %w", err)
		}
		newAccess = token.AccessToken
		newRefresh = token.RefreshToken
		expiresIn = token.ExpiresIn

	default:
		return accessToken, nil
	}

	encAccess, err := cipher.Encrypt(newAccess)
	if err != nil {
		return "", err
	}
	encRefresh := row.RefreshTokenEncrypted
	if newRefresh != "" {
		encRefresh, err = cipher.Encrypt(newRefresh)
		if err != nil {
			return "", err
		}
	}
	var expiresAt *time.Time
	if expiresIn > 0 {
		t := time.Now().Add(time.Duration(expiresIn) * time.Second)
		expiresAt = &t
	}
	if err := channels.UpdateOAuthTokens(ctx, ch.WorkspaceID, ch.ID, encAccess, encRefresh, expiresAt); err != nil {
		return "", err
	}
	return newAccess, nil
}

func providerUsesOAuthRefresh(provider model.SocialProvider) bool {
	switch provider {
	case model.SocialProviderDzen, model.SocialProviderRutube:
		return true
	default:
		return false
	}
}

func publishToDzen(
	ctx context.Context,
	client *oauthclient.DzenClient,
	token, channelID string,
	contentType, text, title, photoURL string,
) (string, error) {
	input := oauthclient.DzenPublicationInput{
		ChannelID: channelID,
		Text:      text,
		Title:     title,
	}
	switch strings.TrimSpace(strings.ToLower(contentType)) {
	case string(oauthclient.DzenContentArticle):
		input.ContentType = oauthclient.DzenContentArticle
		if photoURL != "" {
			input.CoverURL = photoURL
		}
	default:
		input.ContentType = oauthclient.DzenContentBrief
		if photoURL != "" {
			input.ImageURL = photoURL
		}
	}
	return client.Publish(ctx, token, input)
}

func publishToRutube(
	ctx context.Context,
	client *oauthclient.RutubeClient,
	token, channelID, contentType, text, title, photoURL, videoURL string,
	publishAt *time.Time,
) (string, error) {
	ct := oauthclient.RutubeContentType(strings.TrimSpace(strings.ToLower(contentType)))
	if ct == "" {
		if strings.TrimSpace(videoURL) != "" {
			ct = oauthclient.RutubeContentVideo
		} else {
			ct = oauthclient.RutubeContentFeed
		}
	}
	return client.Publish(ctx, token, oauthclient.RutubePublishInput{
		ChannelID:   channelID,
		ContentType: ct,
		Text:        text,
		Title:       title,
		PhotoURL:    photoURL,
		VideoURL:    videoURL,
		PublishAt:   publishAt,
	})
}
