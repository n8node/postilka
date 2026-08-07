package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/repository"
)

var ErrMAXPlatformBotNotConfigured = errors.New("max platform bot not configured")

func normalizeMAXPostMode(raw string) model.MAXPostMode {
	switch model.MAXPostMode(strings.TrimSpace(raw)) {
	case model.MAXPostModePlatform:
		return model.MAXPostModePlatform
	default:
		return model.MAXPostModeOwn
	}
}

func (s *SocialProviderSettingsService) GetMAXPlatformBotAdmin(ctx context.Context, cipher *SecretCipher) (*model.MAXPlatformBotAdminView, error) {
	rec, err := s.repo.GetMAXPlatformBot(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return &model.MAXPlatformBotAdminView{}, nil
		}
		return nil, err
	}
	return buildMAXPlatformBotAdminView(rec, cipher, nil), nil
}

func (s *SocialProviderSettingsService) UpdateMAXPlatformBotAdmin(
	ctx context.Context,
	req model.MAXPlatformBotAdminUpdateRequest,
	cipher *SecretCipher,
	maxClient *oauthclient.MAXBotClient,
) (*model.MAXPlatformBotAdminView, error) {
	if cipher == nil {
		return nil, ErrCryptoUnavailable
	}
	rec, err := s.repo.GetMAXPlatformBot(ctx)
	if err != nil {
		return nil, err
	}

	cfg := rec.Config
	cfg.PlatformBotEnabled = req.Enabled

	tokenPlain := strings.TrimSpace(req.BotToken)
	tokenEncrypted := rec.PlatformBotTokenEnc
	botUsername := rec.PlatformBotUsername

	if tokenPlain != "" {
		if maxClient == nil {
			maxClient = oauthclient.NewMAXBotClient()
		}
		me, err := maxClient.GetMe(ctx, tokenPlain)
		if err != nil {
			return nil, fmt.Errorf("%w: %s", ErrInvalidBotToken, err.Error())
		}
		tokenEncrypted, err = cipher.Encrypt(tokenPlain)
		if err != nil {
			return nil, err
		}
		botUsername = strings.TrimPrefix(strings.TrimSpace(me.Username), "@")
		updated, err := s.repo.SaveMAXPlatformBot(ctx, cfg, tokenEncrypted, botUsername)
		if err != nil {
			return nil, err
		}
		view := buildMAXPlatformBotAdminView(updated, cipher, maxDiscoverBotInfo(me))
		if tokenPlain != "" {
			view.BotTokenHint = maskSecret(tokenPlain)
		}
		return view, nil
	}

	if cfg.PlatformBotEnabled && strings.TrimSpace(tokenEncrypted) == "" {
		return nil, fmt.Errorf("%w: укажите токен бота Postilka", ErrInvalidSocialProviderSettings)
	}

	updated, err := s.repo.SaveMAXPlatformBot(ctx, cfg, tokenEncrypted, botUsername)
	if err != nil {
		return nil, err
	}
	return buildMAXPlatformBotAdminView(updated, cipher, nil), nil
}

func buildMAXPlatformBotAdminView(
	rec *repository.MAXPlatformBotRecord,
	cipher *SecretCipher,
	bot *model.MAXDiscoverBot,
) *model.MAXPlatformBotAdminView {
	view := &model.MAXPlatformBotAdminView{
		Enabled:     rec.Config.PlatformBotEnabled,
		BotTokenSet: strings.TrimSpace(rec.PlatformBotTokenEnc) != "",
		UpdatedAt:   rec.UpdatedAt,
	}
	if view.BotTokenSet && cipher != nil {
		if plain, err := cipher.Decrypt(rec.PlatformBotTokenEnc); err == nil {
			view.BotTokenHint = maskSecret(plain)
		}
	}
	if bot != nil {
		view.Bot = bot
	} else if rec.PlatformBotUsername != "" {
		view.Bot = maxDiscoverBotFromUsername(rec.PlatformBotUsername, rec.PlatformBotUsername, 0)
	}
	return view
}

func (s *SocialProviderSettingsService) MAXPlatformBotPublicInfo(ctx context.Context) (*model.MAXDiscoverBot, bool) {
	rec, err := s.repo.GetMAXPlatformBot(ctx)
	if err != nil || !rec.Config.PlatformBotEnabled || strings.TrimSpace(rec.PlatformBotTokenEnc) == "" {
		return nil, false
	}
	if rec.PlatformBotUsername == "" {
		return nil, false
	}
	return maxDiscoverBotFromUsername(rec.PlatformBotUsername, rec.PlatformBotUsername, 0), true
}

func (s *SocialProviderSettingsService) ResolveMAXPlatformBotToken(
	ctx context.Context,
	cipher *SecretCipher,
) (string, *model.MAXDiscoverBot, error) {
	if cipher == nil {
		return "", nil, ErrCryptoUnavailable
	}
	rec, err := s.repo.GetMAXPlatformBot(ctx)
	if err != nil {
		return "", nil, err
	}
	if !rec.Config.PlatformBotEnabled || strings.TrimSpace(rec.PlatformBotTokenEnc) == "" {
		return "", nil, ErrMAXPlatformBotNotConfigured
	}
	token, err := cipher.Decrypt(rec.PlatformBotTokenEnc)
	if err != nil {
		return "", nil, err
	}
	bot := maxDiscoverBotFromUsername(rec.PlatformBotUsername, rec.PlatformBotUsername, 0)
	return token, bot, nil
}

func maxDiscoverBotFromUsername(username, name string, userID int64) *model.MAXDiscoverBot {
	username = strings.TrimPrefix(strings.TrimSpace(username), "@")
	name = strings.TrimSpace(name)
	searchQuery := ""
	profileURL := ""
	if username != "" {
		searchQuery = "@" + username
		profileURL = "https://max.ru/" + username
	}
	return &model.MAXDiscoverBot{
		Username:    username,
		Name:        name,
		UserID:      userID,
		ProfileURL:  profileURL,
		SearchQuery: searchQuery,
	}
}
