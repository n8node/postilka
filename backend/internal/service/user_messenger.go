package service

import (
	"context"
	"log/slog"
	"strings"

	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/repository"
)

// UserMessengerService sends best-effort DMs to a user via MAX and Telegram
// only when that messenger is linked to the account. Failures never abort the
// calling flow.
type UserMessengerService struct {
	identities       *repository.UserLoginIdentityRepository
	oauthSettings    *repository.OAuthSettingsRepository
	telegramSettings *TelegramSettingsService
	telegram         *TelegramBotClient
	max              *oauthclient.MAXBotClient
	log              *slog.Logger
}

func NewUserMessengerService(
	identities *repository.UserLoginIdentityRepository,
	oauthSettings *repository.OAuthSettingsRepository,
	telegramSettings *TelegramSettingsService,
	telegram *TelegramBotClient,
	max *oauthclient.MAXBotClient,
	logger *slog.Logger,
) *UserMessengerService {
	if logger == nil {
		logger = slog.Default()
	}
	return &UserMessengerService{
		identities:       identities,
		oauthSettings:    oauthSettings,
		telegramSettings: telegramSettings,
		telegram:         telegram,
		max:              max,
		log:              logger,
	}
}

type messengerMessage struct {
	Text       string
	ButtonText string
	URL        string
}

func (s *UserMessengerService) Notify(ctx context.Context, userID string, msg messengerMessage) {
	if s == nil || strings.TrimSpace(userID) == "" {
		return
	}
	identities, err := s.identities.ListByUserID(ctx, userID)
	if err != nil {
		s.warn("list login identities", userID, err)
		return
	}
	for _, ident := range identities {
		switch ident.Provider {
		case model.LoginProviderMAX:
			s.sendMAX(ctx, userID, ident.ProviderUserID, msg)
		}
	}
	s.sendTelegramIfLinked(ctx, userID, identities, msg)
}

func (s *UserMessengerService) sendMAX(ctx context.Context, userID, providerUserID string, msg messengerMessage) {
	providerUserID = strings.TrimSpace(providerUserID)
	if s.max == nil || providerUserID == "" {
		return
	}
	token := s.maxLoginBotToken(ctx)
	if token == "" {
		return
	}
	text := strings.TrimSpace(msg.Text)
	if text == "" {
		return
	}
	button := strings.TrimSpace(msg.ButtonText)
	if button == "" {
		button = "Открыть Postilka"
	}
	link := strings.TrimSpace(msg.URL)
	if link != "" {
		if err := s.max.SendMessageLink(ctx, token, providerUserID, "", text, button, link); err != nil {
			s.warn("max dm failed, fallback to text", userID, err)
			_ = s.max.SendText(ctx, token, providerUserID, text+"\n"+link)
		}
		return
	}
	if err := s.max.SendText(ctx, token, providerUserID, text); err != nil {
		s.warn("max dm failed", userID, err)
	}
}

func (s *UserMessengerService) sendTelegramIfLinked(
	ctx context.Context,
	userID string,
	identities []model.UserLoginIdentity,
	msg messengerMessage,
) {
	if s.telegram == nil || s.telegramSettings == nil {
		return
	}
	chatID := telegramChatIDFromIdentities(identities)
	if chatID == "" {
		return
	}
	cfg, err := s.telegramSettings.GetEffective(ctx)
	if err != nil {
		s.warn("telegram settings", userID, err)
		return
	}
	token := strings.TrimSpace(cfg.BotToken)
	if token == "" {
		return
	}
	text := strings.TrimSpace(msg.Text)
	if text == "" {
		return
	}
	input := TelegramMessageInput{Text: text}
	if u := strings.TrimSpace(msg.URL); u != "" {
		button := strings.TrimSpace(msg.ButtonText)
		if button == "" {
			button = "Открыть Postilka"
		}
		input.Buttons = [][]model.TelegramInlineButton{{{Text: button, URL: u}}}
	}
	if _, err := s.telegram.SendFormattedMessage(ctx, token, chatID, input); err != nil {
		fallback := text
		if u := strings.TrimSpace(msg.URL); u != "" {
			fallback = text + "\n" + u
		}
		if sendErr := s.telegram.SendMessage(ctx, token, chatID, fallback); sendErr != nil {
			s.warn("telegram dm failed", userID, sendErr)
		}
	}
}

func (s *UserMessengerService) maxLoginBotToken(ctx context.Context) string {
	if s.oauthSettings == nil {
		return ""
	}
	cfg, err := s.oauthSettings.GetMAX(ctx)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(cfg.BotToken)
}

func telegramChatIDFromIdentities(identities []model.UserLoginIdentity) string {
	for _, ident := range identities {
		if strings.EqualFold(string(ident.Provider), "telegram") {
			return strings.TrimSpace(ident.ProviderUserID)
		}
	}
	return ""
}

func (s *UserMessengerService) warn(msg, userID string, err error) {
	if s.log != nil {
		s.log.Warn(msg, "user_id", userID, "error", err)
	}
}
