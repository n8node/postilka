package service

import (
	"fmt"
	"strings"

	oauthclient "github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/repository"
)

var defaultYouTubeAPI *YouTubeAPIClient

func SetYouTubeAPIClient(c *YouTubeAPIClient) {
	defaultYouTubeAPI = c
}

func buildYouTubeOAuthClient(
	youtubeAPI *YouTubeAPIClient,
	clientID, clientSecret, redirectURI string,
) *oauthclient.YouTubeClient {
	client := &oauthclient.YouTubeClient{
		ClientID:     strings.TrimSpace(clientID),
		ClientSecret: strings.TrimSpace(clientSecret),
		RedirectURI:  redirectURI,
	}
	if youtubeAPI != nil {
		client.HTTP = youtubeAPI.HTTPClient()
	}
	return client
}

func youtubeOAuthCredentialsFromRow(row *repository.ChannelRow, cipher *SecretCipher) (string, string, error) {
	if row == nil || cipher == nil {
		return "", "", fmt.Errorf("oauth credentials unavailable")
	}
	clientID := strings.TrimSpace(row.OAuthClientID)
	encSecret := strings.TrimSpace(row.OAuthClientSecretEncrypted)
	if clientID == "" || encSecret == "" {
		return "", "", fmt.Errorf("ключи Google OAuth не сохранены — переподключите канал")
	}
	secret, err := cipher.Decrypt(encSecret)
	if err != nil {
		return "", "", err
	}
	return clientID, secret, nil
}

func youtubeOAuthCredentialsFromSession(sessionMeta map[string]any, cipher *SecretCipher) (string, string, error) {
	if cipher == nil {
		return "", "", ErrCryptoUnavailable
	}
	rawID, _ := sessionMeta["oauth_app_id"].(string)
	rawSecret, _ := sessionMeta["oauth_app_secret_encrypted"].(string)
	clientID := strings.TrimSpace(rawID)
	if clientID == "" || strings.TrimSpace(rawSecret) == "" {
		return "", "", fmt.Errorf("сессия OAuth не содержит ключи Google — начните подключение заново")
	}
	secret, err := cipher.Decrypt(rawSecret)
	if err != nil {
		return "", "", err
	}
	return clientID, secret, nil
}
