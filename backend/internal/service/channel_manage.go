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
)

func channelPostModeLabel(ch model.Channel) string {
	if ch.Provider == model.ChannelProviderVK {
		if ch.VKOAuthMode == model.VKOAuthModePlatform {
			return "Приложение Postilka"
		}
		return "Своё приложение"
	}
	if ch.Provider == model.ChannelProviderYouTube {
		return "Своё приложение Google"
	}
	if ch.Provider != model.ChannelProviderMAX {
		if ch.Provider == model.ChannelProviderTelegram {
			return "Свой бот"
		}
		return "OAuth"
	}
	if ch.MaxPostMode == model.MAXPostModePlatform {
		return "Бот Postilka"
	}
	return "Свой бот"
}

func buildChannelListItem(ch model.Channel, tokenEnc string, cipher *SecretCipher) model.ChannelListItem {
	item := model.ChannelListItem{
		Channel:             ch,
		PostModeLabel:       channelPostModeLabel(ch),
		PublishCapabilities: ch.Provider.PublishCapabilities(),
	}
	if ch.Provider == model.ChannelProviderMAX && ch.MaxPostMode == model.MAXPostModePlatform {
		item.BotTokenSet = true
		item.BotTokenHint = "Postilka"
		return item
	}
	if strings.TrimSpace(tokenEnc) != "" {
		item.BotTokenSet = true
		if cipher != nil {
			if plain, err := cipher.Decrypt(tokenEnc); err == nil {
				item.BotTokenHint = maskSecret(plain)
			}
		}
		if item.BotTokenHint == "" {
			item.BotTokenHint = "настроен"
		}
		return item
	}
	if ch.Provider != model.ChannelProviderMAX && ch.Provider != model.ChannelProviderTelegram {
		item.BotTokenSet = true
		item.BotTokenHint = "OAuth"
	}
	return item
}

func parseMAXChatID(raw string) int64 {
	id, _ := strconv.ParseInt(strings.TrimSpace(raw), 10, 64)
	return id
}

func telegramChannelMetadata(chat telegramChat, member telegramChatMember) model.ChannelMetadata {
	canPost := canPostInChat(chat.Type, member)
	meta := model.ChannelMetadata{
		ProviderTitle: strings.TrimSpace(chat.Title),
		CanPost:       &canPost,
	}
	isAdmin := isAdminLikeStatus(member.Status)
	meta.IsAdmin = &isAdmin
	if chat.Username != "" {
		meta.PublicURL = "https://t.me/" + chat.Username
	}
	return meta
}

func maxChannelMetadata(chat *oauthclient.MAXChat, member *oauthclient.MAXBotMembership) model.ChannelMetadata {
	canPost := member.CanPostToChannel()
	isAdmin := member.IsAdmin || member.IsOwner
	meta := model.ChannelMetadata{
		ProviderTitle:  strings.TrimSpace(chat.Title),
		CanPost:        &canPost,
		IsAdmin:        &isAdmin,
		BotPermissions: append([]string(nil), member.Permissions...),
		AvatarURL:      oauthclient.MAXChatAvatarURL(chat),
	}
	link := oauthclient.NormalizeMAXChatLink(chat.Link)
	if link != "" {
		meta.PublicURL = "https://max.ru/" + link
	}
	return meta
}

func (s *ChannelService) Get(ctx context.Context, userID string, r *http.Request, channelID string) (*model.ChannelListItem, error) {
	ws, err := s.requireEditor(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	row, err := s.channels.GetRowByID(ctx, ws.ID, channelID)
	if err != nil {
		return nil, err
	}
	item := buildChannelListItem(row.Channel, row.BotTokenEncrypted, s.cipher)
	return &item, nil
}

func (s *ChannelService) Update(
	ctx context.Context,
	userID string,
	r *http.Request,
	channelID string,
	req model.ChannelUpdateRequest,
) (*model.ChannelListItem, error) {
	ws, err := s.requireAdmin(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if s.cipher == nil {
		return nil, ErrCryptoUnavailable
	}

	row, err := s.channels.GetRowByID(ctx, ws.ID, channelID)
	if err != nil {
		return nil, err
	}
	ch := row.Channel
	tokenEnc := row.BotTokenEncrypted

	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return nil, fmt.Errorf("укажите название канала")
		}
		ch.Name = name
	}

	switch ch.Provider {
	case model.ChannelProviderTelegram:
		if err := s.ensureProviderEnabled(ctx); err != nil {
			return nil, err
		}
		if req.BotToken != nil && strings.TrimSpace(*req.BotToken) != "" {
			botToken := strings.TrimSpace(*req.BotToken)
			bot, err := s.botClient.GetMe(ctx, botToken)
			if err != nil {
				return nil, fmt.Errorf("%w: %s", ErrInvalidBotToken, sanitizeTelegramError(err).Error())
			}
			if _, _, err := s.botClient.VerifyBotInChat(ctx, botToken, ch.ChatID); err != nil {
				return nil, err
			}
			tokenEnc, err = s.cipher.Encrypt(botToken)
			if err != nil {
				return nil, err
			}
			ch.BotUsername = bot.Username
			ch.Status = model.ChannelStatusActive
		}

	case model.ChannelProviderMAX:
		postMode := ch.MaxPostMode
		if req.MaxPostMode != nil {
			postMode = normalizeMAXPostMode(string(*req.MaxPostMode))
		}
		botToken := ""
		if req.BotToken != nil {
			botToken = strings.TrimSpace(*req.BotToken)
		}

		switch postMode {
		case model.MAXPostModePlatform:
			platformToken, platformBot, err := s.socialSettings.ResolveMAXPlatformBotToken(ctx, s.cipher)
			if err != nil {
				return nil, err
			}
			me, err := s.maxClient.GetMe(ctx, platformToken)
			if err != nil {
				return nil, err
			}
			if err := s.maxClient.VerifyChannelPostAccess(ctx, platformToken, parseMAXChatID(ch.ChatID)); err != nil {
				return nil, err
			}
			tokenEnc = ""
			ch.MaxPostMode = model.MAXPostModePlatform
			ch.BotUsername = me.Username
			if platformBot != nil && platformBot.Username != "" {
				ch.BotUsername = platformBot.Username
			}
			ch.Status = model.ChannelStatusActive
		case model.MAXPostModeOwn:
			if botToken == "" && strings.TrimSpace(tokenEnc) == "" && postMode != ch.MaxPostMode {
				return nil, fmt.Errorf("укажите токен бота MAX")
			}
			if botToken != "" {
				me, err := s.maxClient.GetMe(ctx, botToken)
				if err != nil {
					return nil, fmt.Errorf("%w: %s", ErrInvalidBotToken, err.Error())
				}
				if err := s.maxClient.VerifyChannelPostAccess(ctx, botToken, parseMAXChatID(ch.ChatID)); err != nil {
					return nil, err
				}
				tokenEnc, err = s.cipher.Encrypt(botToken)
				if err != nil {
					return nil, err
				}
				ch.BotUsername = me.Username
			} else if postMode != ch.MaxPostMode && strings.TrimSpace(tokenEnc) != "" {
				plain, err := s.cipher.Decrypt(tokenEnc)
				if err != nil {
					return nil, err
				}
				if err := s.maxClient.VerifyChannelPostAccess(ctx, plain, parseMAXChatID(ch.ChatID)); err != nil {
					return nil, err
				}
			}
			ch.MaxPostMode = model.MAXPostModeOwn
			ch.Status = model.ChannelStatusActive
		}

	default:
		if req.BotToken != nil || req.MaxPostMode != nil {
			return nil, fmt.Errorf("смена бота доступна только для Telegram и MAX")
		}
	}

	_, err = s.channels.SaveChannel(ctx, repository.ChannelSaveParams{
		WorkspaceID:         ws.ID,
		ChannelID:           channelID,
		Provider:            ch.Provider,
		Name:                ch.Name,
		ChatType:            ch.ChatType,
		BotUsername:         ch.BotUsername,
		BotTokenEncrypted:   tokenEnc,
		MaxPostMode:         ch.MaxPostMode,
		Status:              ch.Status,
		Metadata:            ch.Metadata,
		MetadataRefreshedAt: ch.MetadataRefreshedAt,
	})
	if err != nil {
		return nil, err
	}

	item, err := s.VerifyAndRefresh(ctx, userID, r, channelID)
	if err == nil {
		return item, nil
	}
	refreshed, gerr := s.channels.GetRowByID(ctx, ws.ID, channelID)
	if gerr != nil {
		return nil, err
	}
	out := buildChannelListItem(refreshed.Channel, refreshed.BotTokenEncrypted, s.cipher)
	return &out, nil
}

func (s *ChannelService) VerifyAndRefresh(
	ctx context.Context,
	userID string,
	r *http.Request,
	channelID string,
) (*model.ChannelListItem, error) {
	ws, err := s.requireAdmin(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if s.cipher == nil {
		return nil, ErrCryptoUnavailable
	}

	row, err := s.channels.GetRowByID(ctx, ws.ID, channelID)
	if err != nil {
		return nil, err
	}
	ch := row.Channel

	var verifyErr error
	meta := ch.Metadata
	now := time.Now()

	switch ch.Provider {
	case model.ChannelProviderTelegram:
		if err := s.ensureProviderEnabled(ctx); err != nil {
			return nil, err
		}
		token, err := resolveChannelPublishToken(ctx, &ch, s.channels, s.cipher, s.socialSettings)
		if err != nil {
			return nil, err
		}
		chat, member, verr := s.botClient.VerifyBotInChat(ctx, token, ch.ChatID)
		if verr != nil {
			verifyErr = verr
			break
		}
		meta = telegramChannelMetadata(chat, member)
		if publicURL := telegramPublicAvatarURL(chat); publicURL != "" {
			meta = mergeChannelAvatar(meta, publicURL)
		} else if uri, err := s.botClient.ChatPhotoDataURI(ctx, token, ch.ChatID); err == nil && uri != "" {
			meta = mergeChannelAvatar(meta, uri)
		}
		if chat.Type != "" {
			ch.ChatType = chat.Type
		}
		ch.ChatID = formatChatID(chat.ID)
		if title := strings.TrimSpace(chat.Title); title != "" && (ch.Name == "" || strings.HasPrefix(ch.Name, "http")) {
			ch.Name = title
		}

	case model.ChannelProviderMAX:
		token, err := resolveChannelPublishToken(ctx, &ch, s.channels, s.cipher, s.socialSettings)
		if err != nil {
			return nil, err
		}
		maxChat, err := s.maxClient.ResolveChat(ctx, token, ch.ChatID)
		if err != nil {
			verifyErr = err
			break
		}
		member, err := s.maxClient.GetBotMembership(ctx, token, maxChat.ChatID)
		if err != nil {
			verifyErr = err
			break
		}
		if err := s.maxClient.VerifyChannelPostAccess(ctx, token, maxChat.ChatID); err != nil {
			verifyErr = err
			break
		}
		meta = maxChannelMetadata(maxChat, member)
		ch.ChatID = strconv.FormatInt(maxChat.ChatID, 10)
		if maxChat.Type != "" {
			ch.ChatType = maxChat.Type
		}
		if title := strings.TrimSpace(maxChat.Title); title != "" && (ch.Name == "" || strings.HasPrefix(ch.Name, "http")) {
			ch.Name = title
		}

	default:
		token, err := resolveChannelPublishToken(ctx, &ch, s.channels, s.cipher, s.socialSettings)
		if err != nil {
			verifyErr = err
			break
		}
		ch.Status = model.ChannelStatusActive
		if avatarURL, err := s.lookupOAuthAvatar(ctx, ch.Provider, token, ch.ChatID); err == nil {
			meta = mergeChannelAvatar(meta, avatarURL)
		}
	}

	if verifyErr != nil {
		_, _ = s.channels.SaveChannel(ctx, repository.ChannelSaveParams{
			WorkspaceID:           ws.ID,
			ChannelID:             channelID,
			Provider:              ch.Provider,
			Name:                  ch.Name,
			ChatType:              ch.ChatType,
			BotUsername:           ch.BotUsername,
			BotTokenEncrypted:     row.BotTokenEncrypted,
			RefreshTokenEncrypted: row.RefreshTokenEncrypted,
			TokenExpiresAt:        row.TokenExpiresAt,
			MaxPostMode:           ch.MaxPostMode,
			VKOAuthMode:           ch.VKOAuthMode,
			Status:                model.ChannelStatusNeedsReconnect,
			Metadata:              meta,
			MetadataRefreshedAt:   ch.MetadataRefreshedAt,
		})
		_ = s.channels.UpdateStatus(ctx, ws.ID, channelID, model.ChannelStatusNeedsReconnect, verifyErr.Error())
		return nil, verifyErr
	}

	ch.Status = model.ChannelStatusActive
	ch.Metadata = meta
	ch.MetadataRefreshedAt = &now

	updated, err := s.channels.SaveChannel(ctx, repository.ChannelSaveParams{
		WorkspaceID:           ws.ID,
		ChannelID:             channelID,
		Provider:              ch.Provider,
		Name:                  ch.Name,
		ChatType:              ch.ChatType,
		BotUsername:           ch.BotUsername,
		BotTokenEncrypted:     row.BotTokenEncrypted,
		RefreshTokenEncrypted: row.RefreshTokenEncrypted,
		TokenExpiresAt:        row.TokenExpiresAt,
		MaxPostMode:           ch.MaxPostMode,
		VKOAuthMode:           ch.VKOAuthMode,
		Status:                ch.Status,
		Metadata:              meta,
		MetadataRefreshedAt:   ch.MetadataRefreshedAt,
	})
	if err != nil {
		return nil, err
	}

	out := buildChannelListItem(*updated, row.BotTokenEncrypted, s.cipher)
	return &out, nil
}
