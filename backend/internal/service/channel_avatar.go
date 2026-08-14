package service

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/repository"
)

var ErrChannelAvatarNotFound = errors.New("channel avatar not found")

func mergeChannelAvatar(meta model.ChannelMetadata, avatarURL string) model.ChannelMetadata {
	avatarURL = strings.TrimSpace(avatarURL)
	if avatarURL != "" {
		meta.AvatarURL = avatarURL
	}
	return meta
}

func parseTelegramBusinessUserID(raw string) int64 {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return 0
	}
	return id
}

func isTelegramBusinessChannel(ch model.Channel) bool {
	if ch.Provider != model.ChannelProviderTelegram {
		return false
	}
	if ch.ChatType == model.TelegramChatTypeBusiness {
		return true
	}
	if strings.TrimSpace(ch.Metadata.BusinessUserID) != "" {
		return true
	}
	if strings.TrimSpace(ch.Metadata.BusinessUserChatID) != "" {
		return true
	}
	return false
}

func telegramUsernameFromPublicURL(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "https://")
	raw = strings.TrimPrefix(raw, "http://")
	if strings.HasPrefix(strings.ToLower(raw), "t.me/") {
		raw = raw[5:]
	}
	raw = strings.TrimPrefix(raw, "@")
	if i := strings.IndexAny(raw, "/?#"); i >= 0 {
		raw = raw[:i]
	}
	return strings.TrimSpace(raw)
}

func avatarDataURI(body []byte, contentType string) string {
	if len(body) == 0 {
		return ""
	}
	if contentType == "" {
		contentType = "image/jpeg"
	}
	return fmt.Sprintf("data:%s;base64,%s", contentType, base64.StdEncoding.EncodeToString(body))
}

func (s *ChannelService) enrichTelegramBusinessConnection(
	ctx context.Context,
	token string,
	ch *model.Channel,
) (userChatID, userID int64, username string) {
	userID = parseTelegramBusinessUserID(ch.Metadata.BusinessUserID)
	userChatID = parseTelegramBusinessUserID(ch.Metadata.BusinessUserChatID)
	username = telegramUsernameFromPublicURL(ch.Metadata.PublicURL)

	conn, err := s.botClient.GetBusinessConnection(ctx, token, ch.ChatID)
	if err != nil || conn == nil {
		return userChatID, userID, username
	}
	if conn.User.ID > 0 {
		userID = conn.User.ID
		ch.Metadata.BusinessUserID = strconv.FormatInt(conn.User.ID, 10)
	}
	if conn.UserChatID > 0 {
		userChatID = conn.UserChatID
		ch.Metadata.BusinessUserChatID = strconv.FormatInt(conn.UserChatID, 10)
	}
	if title := businessConnectionDisplayName(conn.User); title != "" && strings.TrimSpace(ch.Metadata.ProviderTitle) == "" {
		ch.Metadata.ProviderTitle = title
	}
	if u := strings.TrimSpace(conn.User.Username); u != "" {
		username = u
		ch.Metadata.PublicURL = "https://t.me/" + u
		if strings.TrimSpace(ch.Metadata.AvatarURL) == "" {
			ch.Metadata.AvatarURL = telegramUsernameAvatarURL(u)
		}
	}
	if userChatID <= 0 && userID > 0 {
		userChatID = userID
		ch.Metadata.BusinessUserChatID = strconv.FormatInt(userID, 10)
	}
	return userChatID, userID, username
}

func (s *ChannelService) persistTelegramBusinessMetadata(
	ctx context.Context,
	workspaceID string,
	ch *model.Channel,
	body []byte,
	contentType string,
) {
	meta := ch.Metadata
	if len(body) > 0 {
		if dataURI := avatarDataURI(body, contentType); dataURI != "" {
			meta = mergeChannelAvatar(meta, dataURI)
		}
	}
	if meta.AvatarURL == ch.Metadata.AvatarURL &&
		meta.BusinessUserID == ch.Metadata.BusinessUserID &&
		meta.BusinessUserChatID == ch.Metadata.BusinessUserChatID &&
		meta.PublicURL == ch.Metadata.PublicURL &&
		meta.ProviderTitle == ch.Metadata.ProviderTitle {
		return
	}
	_ = s.channels.UpdateChannelMetadata(ctx, workspaceID, ch.ID, meta)
	ch.Metadata = meta
}

func (s *ChannelService) fetchTelegramBusinessAvatar(
	ctx context.Context,
	token string,
	ch *model.Channel,
) ([]byte, string, error) {
	if body, ct, ok := avatarBytesFromMetadata(ch.Metadata.AvatarURL); ok {
		return body, ct, nil
	}

	avatarCtx, cancel := context.WithTimeout(ctx, 25*time.Second)
	defer cancel()

	userChatID, userID, username := s.enrichTelegramBusinessConnection(avatarCtx, token, ch)
	if username == "" && strings.TrimSpace(ch.Metadata.AvatarURL) != "" {
		username = telegramUsernameFromPublicURL(ch.Metadata.AvatarURL)
	}

	if body, contentType, err := s.botClient.FetchBusinessUserAvatar(avatarCtx, token, userChatID, userID, username); err == nil && len(body) > 0 {
		return body, contentType, nil
	}

	if url := strings.TrimSpace(ch.Metadata.AvatarURL); url != "" && !strings.HasPrefix(url, "data:") {
		if body, ct, err := fetchRemoteAvatar(avatarCtx, url); err == nil && len(body) > 0 {
			return body, ct, nil
		}
	}

	return nil, "", ErrChannelAvatarNotFound
}

func channelAvatarInitials(ch model.Channel) string {
	name := strings.TrimSpace(ch.Metadata.ProviderTitle)
	if name == "" {
		name = strings.TrimSpace(ch.Name)
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return "?"
	}
	words := strings.Fields(name)
	if len(words) >= 2 {
		a, _ := utf8.DecodeRuneInString(words[0])
		b, _ := utf8.DecodeRuneInString(words[1])
		if a != utf8.RuneError && b != utf8.RuneError {
			return strings.ToUpper(string([]rune{a, b}))
		}
	}
	runes := []rune(name)
	letters := make([]rune, 0, 2)
	for _, r := range runes {
		if (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') || (r >= 'А' && r <= 'я') || r == 'Ё' || r == 'ё' {
			letters = append(letters, r)
			if len(letters) == 2 {
				break
			}
		}
	}
	if len(letters) == 0 {
		if len(runes) >= 2 {
			return strings.ToUpper(string(runes[:2]))
		}
		return strings.ToUpper(string(runes))
	}
	if len(letters) == 1 {
		return strings.ToUpper(string(letters))
	}
	return strings.ToUpper(string(letters))
}

func generateInitialsAvatarSVG(initials string) []byte {
	initials = strings.TrimSpace(initials)
	if initials == "" {
		initials = "?"
	}
	initials = strings.Map(func(r rune) rune {
		switch r {
		case '"', '\'', '<', '>', '&':
			return -1
		default:
			return r
		}
	}, initials)
	svg := fmt.Sprintf(
		`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="#f4f4f5"/><text x="50%%" y="54%%" dominant-baseline="middle" text-anchor="middle" fill="#52525b" font-family="system-ui,sans-serif" font-size="44" font-weight="600">%s</text></svg>`,
		initials,
	)
	return []byte(svg)
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

	if url := strings.TrimSpace(ch.Metadata.AvatarURL); url != "" &&
		ch.Provider != model.ChannelProviderMAX &&
		ch.Provider != model.ChannelProviderTelegram &&
		ch.Provider != model.ChannelProviderYouTube {
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
		if isTelegramBusinessChannel(ch) {
			body, contentType, err := s.fetchTelegramBusinessAvatar(ctx, token, &ch)
			s.persistTelegramBusinessMetadata(ctx, ws.ID, &ch, body, contentType)
			if err != nil {
				if errors.Is(err, ErrChannelAvatarNotFound) {
					return generateInitialsAvatarSVG(channelAvatarInitials(ch)), "image/svg+xml", nil
				}
				return nil, "", err
			}
			return body, contentType, nil
		}
		if body, ct, ok := avatarBytesFromMetadata(ch.Metadata.AvatarURL); ok {
			return body, ct, nil
		}
		body, contentType, err := s.botClient.FetchChatPhoto(ctx, token, ch.ChatID)
		if err == nil && len(body) > 0 {
			return body, contentType, nil
		}
		chat, chatErr := s.botClient.GetChat(ctx, token, ch.ChatID)
		if chatErr == nil {
			if publicURL := telegramPublicAvatarURL(chat); publicURL != "" {
				if remote, ct, rerr := fetchRemoteAvatar(ctx, publicURL); rerr == nil {
					return remote, ct, nil
				}
			}
		}
		if err != nil {
			return nil, "", err
		}
		return nil, "", ErrChannelAvatarNotFound

	case model.ChannelProviderMAX:
		body, contentType, err := s.maxClient.FetchChatIcon(ctx, token, parseMAXChatID(ch.ChatID))
		if err != nil {
			return nil, "", err
		}
		if len(body) == 0 {
			return nil, "", repository.ErrNotFound
		}
		return body, contentType, nil

	case model.ChannelProviderYouTube:
		if url := strings.TrimSpace(ch.Metadata.AvatarURL); url != "" {
			if body, ct, err := fetchYouTubeRemoteAvatar(ctx, url); err == nil {
				return body, ct, nil
			}
		}
		if avatarURL, err := s.lookupOAuthAvatar(ctx, ch.Provider, token, ch.ChatID); err == nil && avatarURL != "" {
			return fetchYouTubeRemoteAvatar(ctx, avatarURL)
		}
		return nil, "", ErrChannelAvatarNotFound

	default:
		if avatarURL, err := s.lookupOAuthAvatar(ctx, ch.Provider, token, ch.ChatID); err == nil && avatarURL != "" {
			return fetchRemoteAvatar(ctx, avatarURL)
		}
		return nil, "", ErrChannelAvatarNotFound
	}
}

func avatarBytesFromMetadata(raw string) ([]byte, string, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, "", false
	}
	if strings.HasPrefix(raw, "data:") {
		comma := strings.Index(raw, ",")
		if comma <= 0 {
			return nil, "", false
		}
		header := raw[5:comma]
		payload := raw[comma+1:]
		contentType := "image/jpeg"
		if semi := strings.Index(header, ";"); semi >= 0 {
			contentType = header[:semi]
		} else if header != "" && header != "base64" {
			contentType = header
		}
		if !strings.Contains(header, "base64") {
			return nil, "", false
		}
		body, err := base64.StdEncoding.DecodeString(payload)
		if err != nil || len(body) == 0 {
			return nil, "", false
		}
		return body, contentType, true
	}
	return nil, "", false
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
	req.Header.Set("User-Agent", "Postilka/1.0 (+https://postilka.ru)")
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

func fetchYouTubeRemoteAvatar(ctx context.Context, rawURL string) ([]byte, string, error) {
	if defaultYouTubeAPI != nil {
		return defaultYouTubeAPI.FetchRemote(ctx, rawURL)
	}
	return fetchRemoteAvatar(ctx, rawURL)
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

	case model.SocialProviderDzen:
		client := &oauthclient.DzenClient{
			ClientID: cfg.OAuthClientID, ClientSecret: cfg.OAuthClientSecret,
		}
		channels, err := client.ListChannels(ctx, accessToken)
		if err != nil {
			return "", err
		}
		for _, ch := range channels {
			if ch.ID == externalID {
				return strings.TrimSpace(ch.IconURL), nil
			}
		}

	case model.SocialProviderYouTube:
		client := buildYouTubeOAuthClient(defaultYouTubeAPI, "", "", "")
		channel, err := client.VerifyChannelAccess(ctx, accessToken, externalID)
		if err != nil {
			return "", err
		}
		return strings.TrimSpace(channel.ThumbnailURL), nil
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
	case model.ChannelProviderYouTube:
		return model.SocialProviderYouTube, true
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

func lookupOAuthPublicURLFromTargets(targets []model.DiscoveredChannelTarget, externalID string) string {
	for _, t := range targets {
		if t.ExternalID == externalID {
			return strings.TrimSpace(t.PublicURL)
		}
	}
	return ""
}

func oauthChannelChatType(provider model.SocialProvider, externalID string, targets []model.DiscoveredChannelTarget) string {
	for _, t := range targets {
		if t.ExternalID == externalID && strings.TrimSpace(t.Type) != "" {
			return t.Type
		}
	}
	switch provider {
	case model.SocialProviderVK:
		return "group"
	default:
		return "channel"
	}
}
