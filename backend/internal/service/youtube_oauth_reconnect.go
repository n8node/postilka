package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

const YouTubeOAuthTestingReconnectAfter = 6 * 24 * time.Hour

var ErrYouTubeReconnectNotYetAvailable = errors.New("youtube reconnect not yet available")

func YouTubeOAuthReconnectBy(ch model.Channel) *time.Time {
	if ch.Provider != model.ChannelProviderYouTube {
		return nil
	}
	connectedAt := ch.Metadata.OAuthConnectedAt
	if connectedAt == nil {
		connectedAt = &ch.CreatedAt
	}
	if connectedAt == nil {
		return nil
	}
	t := connectedAt.Add(YouTubeOAuthTestingReconnectAfter)
	return &t
}

func YouTubeOAuthReconnectAllowed(ch model.Channel, now time.Time) bool {
	by := YouTubeOAuthReconnectBy(ch)
	if by == nil {
		return false
	}
	return !now.Before(*by)
}

func YouTubeReconnectNotBeforeError(availableAt time.Time) error {
	return fmt.Errorf(
		"переподключение будет доступно %s",
		availableAt.In(time.Local).Format("02.01.2006 15:04"),
	)
}

func (s *ChannelConnectService) YouTubeReconnectStart(
	ctx context.Context,
	userID string,
	r *http.Request,
	channelID string,
) (*model.ChannelOAuthStartResult, error) {
	ws, err := s.requireAdmin(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	row, err := s.channels.GetRowByID(ctx, ws.ID, channelID)
	if err != nil {
		return nil, err
	}
	if row.Channel.Provider != model.ChannelProviderYouTube {
		return nil, fmt.Errorf("канал не YouTube")
	}
	if by := YouTubeOAuthReconnectBy(row.Channel); by != nil && time.Now().Before(*by) {
		return nil, YouTubeReconnectNotBeforeError(*by)
	}
	clientID, clientSecret, err := youtubeOAuthCredentialsFromRow(row, s.cipher)
	if err != nil {
		return nil, err
	}
	return s.OAuthStart(ctx, userID, r, model.SocialProviderYouTube, model.ChannelOAuthStartRequest{
		OAuthClientID:     clientID,
		OAuthClientSecret: clientSecret,
	})
}

type YouTubeOAuthReconnectNotifier struct {
	channels *repository.ChannelRepository
	ws       *repository.WorkspaceRepository
	email    *EmailService
	cfg      *config.Config
	log      *slog.Logger
}

func NewYouTubeOAuthReconnectNotifier(
	channels *repository.ChannelRepository,
	ws *repository.WorkspaceRepository,
	email *EmailService,
	cfg *config.Config,
	logger *slog.Logger,
) *YouTubeOAuthReconnectNotifier {
	return &YouTubeOAuthReconnectNotifier{
		channels: channels,
		ws:       ws,
		email:    email,
		cfg:      cfg,
		log:      logger,
	}
}

func (n *YouTubeOAuthReconnectNotifier) Process(ctx context.Context) error {
	if n == nil || n.channels == nil || n.email == nil {
		return nil
	}
	channels, err := n.channels.ListActiveByProvider(ctx, model.ChannelProviderYouTube)
	if err != nil {
		return err
	}
	now := time.Now()
	appURL := strings.TrimSuffix(n.cfg.PublicAppURLNormalized(), "/")
	for _, ch := range channels {
		if ch.Metadata.OAuthReconnectNotifiedAt != nil {
			continue
		}
		reconnectBy := YouTubeOAuthReconnectBy(ch)
		if reconnectBy == nil || now.Before(*reconnectBy) {
			continue
		}
		if err := n.notifyWorkspace(ctx, ch, appURL); err != nil && n.log != nil {
			n.log.Warn("youtube reconnect email failed", "channel_id", ch.ID, "error", err)
			continue
		}
		meta := ch.Metadata
		notifiedAt := now
		meta.OAuthReconnectNotifiedAt = &notifiedAt
		if err := n.channels.UpdateChannelMetadata(ctx, ch.WorkspaceID, ch.ID, meta); err != nil && n.log != nil {
			n.log.Warn("youtube reconnect metadata update failed", "channel_id", ch.ID, "error", err)
		}
	}
	return nil
}

func (n *YouTubeOAuthReconnectNotifier) notifyWorkspace(ctx context.Context, ch model.Channel, appURL string) error {
	members, err := n.ws.ListEditorMemberEmails(ctx, ch.WorkspaceID)
	if err != nil {
		return err
	}
	ws, err := n.ws.GetByID(ctx, ch.WorkspaceID)
	if err != nil {
		return err
	}
	wsName := ""
	if ws != nil {
		wsName = ws.Name
	}
	channelName := strings.TrimSpace(ch.Name)
	if channelName == "" {
		channelName = strings.TrimSpace(ch.Metadata.ProviderTitle)
	}
	if channelName == "" {
		channelName = "YouTube-канал"
	}
	reconnectBy := YouTubeOAuthReconnectBy(ch)
	if reconnectBy == nil {
		return nil
	}
	channelsURL := appURL + "/channels"
	body := YouTubeReconnectEmailBody(channelName, wsName, *reconnectBy, channelsURL)
	subject := "Postilka — переподключите YouTube-канал"
	sent := false
	for _, member := range members {
		email := strings.TrimSpace(member.Email)
		if email == "" {
			continue
		}
		if err := n.email.Send(ctx, email, subject, body); err != nil {
			if n.log != nil {
				n.log.Warn("youtube reconnect email send failed", "email", email, "channel_id", ch.ID, "error", err)
			}
			continue
		}
		sent = true
	}
	if !sent {
		return fmt.Errorf("no recipient emails sent")
	}
	return nil
}

func applyYouTubeOAuthReconnectMetadata(meta model.ChannelMetadata) model.ChannelMetadata {
	now := time.Now()
	meta.OAuthConnectedAt = &now
	meta.OAuthReconnectNotifiedAt = nil
	return meta
}
