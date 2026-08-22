package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrMetrikaNotConfigured = errors.New("metrika oauth not configured")
	ErrMetrikaNotConnected  = errors.New("metrika not connected")
)

type MetrikaConnectionService struct {
	repo     *repository.MetrikaRepository
	wsSvc    *WorkspaceService
	platform *MetrikaPlatformConfigService
	cipher   *SecretCipher
	cfg      *config.Config
	quota    *QuotaService
}

func NewMetrikaConnectionService(
	repo *repository.MetrikaRepository,
	wsSvc *WorkspaceService,
	platform *MetrikaPlatformConfigService,
	cipher *SecretCipher,
	cfg *config.Config,
	quota *QuotaService,
) *MetrikaConnectionService {
	return &MetrikaConnectionService{
		repo:     repo,
		wsSvc:    wsSvc,
		platform: platform,
		cipher:   cipher,
		cfg:      cfg,
		quota:    quota,
	}
}

func (s *MetrikaConnectionService) ensureAnalyticsAccess(ctx context.Context, workspaceID string) error {
	if s.quota == nil {
		return nil
	}
	return s.quota.CheckAnalyticsAccess(ctx, workspaceID)
}

func (s *MetrikaConnectionService) OAuthReady(ctx context.Context) (bool, error) {
	if s.platform == nil {
		return strings.TrimSpace(s.cfg.YandexMetrikaClientID) != "" &&
			strings.TrimSpace(s.cfg.YandexMetrikaClientSecret) != "", nil
	}
	return s.platform.OAuthReady(ctx)
}

func (s *MetrikaConnectionService) Status(
	ctx context.Context,
	userID string,
	r *http.Request,
) (*model.WorkspaceMetrikaStatus, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if ws == nil {
		return nil, ErrWorkspaceNotFound
	}
	if err := s.ensureAnalyticsAccess(ctx, ws.ID); err != nil {
		return nil, err
	}
	oauthReady, err := s.OAuthReady(ctx)
	if err != nil {
		return nil, err
	}
	status := &model.WorkspaceMetrikaStatus{
		OAuthReady: oauthReady,
		Counters:   []model.MetrikaCounterSummary{},
	}
	rows, err := s.repo.ListConnections(ctx, ws.ID)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		status.Counters = append(status.Counters, model.MetrikaCounterSummary{
			CounterID:   row.CounterID,
			Label:       strings.TrimSpace(row.Label),
			Enabled:     row.Enabled,
			ConnectedAt: row.ConnectedAt,
		})
	}
	return status, nil
}

func (s *MetrikaConnectionService) ListEnabledConnections(ctx context.Context, workspaceID string) ([]repository.MetrikaConnectionRow, error) {
	return s.repo.ListEnabledConnections(ctx, workspaceID)
}

func (s *MetrikaConnectionService) ConnectStart(
	ctx context.Context,
	userID, workspaceID string,
	counterID int64,
) (authorizeURL, state string, err error) {
	if _, err := s.wsSvc.RequireMembership(ctx, userID, workspaceID, model.RoleEditor); err != nil {
		return "", "", err
	}
	if err := s.ensureAnalyticsAccess(ctx, workspaceID); err != nil {
		return "", "", err
	}
	oauthReady, err := s.OAuthReady(ctx)
	if err != nil {
		return "", "", err
	}
	if !oauthReady {
		return "", "", ErrMetrikaNotConfigured
	}
	if counterID <= 0 {
		return "", "", fmt.Errorf("укажите номер счётчика Яндекс Метрики")
	}

	state, err = randomStateToken(24)
	if err != nil {
		return "", "", err
	}
	sessionID, err := randomStateToken(16)
	if err != nil {
		return "", "", err
	}
	if err := s.repo.CreateOAuthSession(ctx, repository.MetrikaOAuthSessionRow{
		ID:          sessionID,
		WorkspaceID: workspaceID,
		UserID:      userID,
		StateToken:  state,
		CounterID:   counterID,
		ExpiresAt:   time.Now().UTC().Add(15 * time.Minute),
	}); err != nil {
		return "", "", err
	}

	client, err := s.metrikaClient(ctx)
	if err != nil {
		return "", "", err
	}
	return client.AuthorizeURL(state), state, nil
}

func (s *MetrikaConnectionService) ConnectComplete(ctx context.Context, userID, state, code, label string) error {
	code = strings.TrimSpace(code)
	if code == "" {
		return fmt.Errorf("код авторизации не получен")
	}
	session, err := s.repo.GetOAuthSessionByState(ctx, state)
	if err != nil {
		return err
	}
	if session.UserID != userID {
		return fmt.Errorf("сессия подключения не найдена")
	}
	return s.finishOAuthSession(ctx, session, code, label)
}

func (s *MetrikaConnectionService) ConnectCallback(ctx context.Context, state, code string) error {
	if strings.TrimSpace(code) == "" {
		return fmt.Errorf("код авторизации не получен")
	}
	session, err := s.repo.GetOAuthSessionByState(ctx, state)
	if err != nil {
		return err
	}
	return s.finishOAuthSession(ctx, session, code, "")
}

func (s *MetrikaConnectionService) finishOAuthSession(
	ctx context.Context,
	session *repository.MetrikaOAuthSessionRow,
	code, label string,
) error {
	if err := s.ensureAnalyticsAccess(ctx, session.WorkspaceID); err != nil {
		return err
	}
	if time.Now().After(session.ExpiresAt) {
		_ = s.repo.DeleteOAuthSession(ctx, session.ID)
		return fmt.Errorf("сессия подключения Метрики истекла — повторите попытку")
	}

	client, err := s.metrikaClient(ctx)
	if err != nil {
		return err
	}
	token, err := client.ExchangeCode(ctx, code)
	if err != nil {
		return err
	}
	if err := client.VerifyCounterAccess(ctx, token.AccessToken, session.CounterID); err != nil {
		return fmt.Errorf("нет доступа к счётчику %d: %w", session.CounterID, err)
	}

	encAccess, err := s.cipher.Encrypt(token.AccessToken)
	if err != nil {
		return err
	}
	var encRefresh string
	if strings.TrimSpace(token.RefreshToken) != "" {
		encRefresh, err = s.cipher.Encrypt(token.RefreshToken)
		if err != nil {
			return err
		}
	}
	var expiresAt *time.Time
	if token.ExpiresIn > 0 {
		t := time.Now().UTC().Add(time.Duration(token.ExpiresIn) * time.Second)
		expiresAt = &t
	}
	if err := s.repo.UpsertConnection(ctx, repository.MetrikaConnectionRow{
		WorkspaceID:           session.WorkspaceID,
		CounterID:             session.CounterID,
		Label:                 strings.TrimSpace(label),
		AccessTokenEncrypted:  encAccess,
		RefreshTokenEncrypted: encRefresh,
		TokenExpiresAt:        expiresAt,
		ConnectedByUserID:     session.UserID,
		Enabled:               true,
	}); err != nil {
		return err
	}
	_ = s.repo.DeleteOAuthSession(ctx, session.ID)
	return nil
}

func (s *MetrikaConnectionService) Disconnect(ctx context.Context, userID string, r *http.Request) error {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil || ws == nil {
		return ErrWorkspaceNotFound
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleAdmin); err != nil {
		return err
	}
	if err := s.ensureAnalyticsAccess(ctx, ws.ID); err != nil {
		return err
	}
	return s.repo.DeleteConnection(ctx, ws.ID)
}

func (s *MetrikaConnectionService) DisconnectCounter(
	ctx context.Context,
	userID string,
	r *http.Request,
	counterID int64,
) error {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil || ws == nil {
		return ErrWorkspaceNotFound
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleAdmin); err != nil {
		return err
	}
	if err := s.ensureAnalyticsAccess(ctx, ws.ID); err != nil {
		return err
	}
	if counterID <= 0 {
		return fmt.Errorf("укажите номер счётчика")
	}
	return s.repo.DeleteConnectionByCounter(ctx, ws.ID, counterID)
}

func (s *MetrikaConnectionService) UTMCampaignStats(
	ctx context.Context,
	workspaceID, campaign string,
	from, to time.Time,
) (*oauthclient.MetrikaUTMStats, error) {
	connections, err := s.repo.ListEnabledConnections(ctx, workspaceID)
	if err != nil || len(connections) == 0 {
		return &oauthclient.MetrikaUTMStats{}, nil
	}
	total := &oauthclient.MetrikaUTMStats{}
	for _, row := range connections {
		stats, err := s.UTMCampaignStatsForCounter(ctx, workspaceID, row.CounterID, campaign, from, to)
		if err != nil {
			return nil, err
		}
		total.Visits += stats.Visits
		total.Users += stats.Users
		total.Goals += stats.Goals
	}
	return total, nil
}

func (s *MetrikaConnectionService) UTMCampaignStatsForCounter(
	ctx context.Context,
	workspaceID string,
	counterID int64,
	campaign string,
	from, to time.Time,
) (*oauthclient.MetrikaUTMStats, error) {
	row, err := s.repo.GetConnectionByCounter(ctx, workspaceID, counterID)
	if errors.Is(err, repository.ErrNotFound) || row == nil || !row.Enabled {
		return &oauthclient.MetrikaUTMStats{}, nil
	}
	token, err := s.ensureAccessToken(ctx, row)
	if err != nil {
		return nil, err
	}
	client, err := s.metrikaClient(ctx)
	if err != nil {
		return nil, err
	}
	return client.GetUTMCampaignStats(ctx, token, row.CounterID, campaign, from, to)
}

func (s *MetrikaConnectionService) ensureAccessToken(ctx context.Context, row *repository.MetrikaConnectionRow) (string, error) {
	access, err := s.cipher.Decrypt(row.AccessTokenEncrypted)
	if err != nil {
		return "", err
	}
	if row.TokenExpiresAt == nil || time.Now().Add(5*time.Minute).Before(*row.TokenExpiresAt) {
		return access, nil
	}
	if strings.TrimSpace(row.RefreshTokenEncrypted) == "" {
		return access, nil
	}
	refresh, err := s.cipher.Decrypt(row.RefreshTokenEncrypted)
	if err != nil {
		return "", err
	}
	client, err := s.metrikaClient(ctx)
	if err != nil {
		return "", err
	}
	token, err := client.RefreshToken(ctx, refresh)
	if err != nil {
		return "", err
	}
	encAccess, err := s.cipher.Encrypt(token.AccessToken)
	if err != nil {
		return "", err
	}
	var encRefresh string
	if strings.TrimSpace(token.RefreshToken) != "" {
		encRefresh, err = s.cipher.Encrypt(token.RefreshToken)
		if err != nil {
			return "", err
		}
	} else {
		encRefresh = row.RefreshTokenEncrypted
	}
	var expiresAt *time.Time
	if token.ExpiresIn > 0 {
		t := time.Now().UTC().Add(time.Duration(token.ExpiresIn) * time.Second)
		expiresAt = &t
	}
	if err := s.repo.UpsertConnection(ctx, repository.MetrikaConnectionRow{
		WorkspaceID:           row.WorkspaceID,
		CounterID:             row.CounterID,
		Label:                 row.Label,
		AccessTokenEncrypted:  encAccess,
		RefreshTokenEncrypted: encRefresh,
		TokenExpiresAt:        expiresAt,
		ConnectedByUserID:     row.ConnectedByUserID,
		Enabled:               row.Enabled,
		ConnectedAt:           row.ConnectedAt,
	}); err != nil {
		return "", err
	}
	return token.AccessToken, nil
}

func (s *MetrikaConnectionService) metrikaClient(ctx context.Context) (*oauthclient.MetrikaClient, error) {
	if s.platform != nil {
		clientID, clientSecret, redirectURI, err := s.platform.ResolveOAuthCredentials(ctx)
		if err != nil {
			return nil, ErrMetrikaNotConfigured
		}
		return &oauthclient.MetrikaClient{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			RedirectURI:  redirectURI,
		}, nil
	}
	return &oauthclient.MetrikaClient{
		ClientID:     s.cfg.YandexMetrikaClientID,
		ClientSecret: s.cfg.YandexMetrikaClientSecret,
		RedirectURI:  s.cfg.MetrikaOAuthRedirectURI(),
	}, nil
}

func randomStateToken(nBytes int) (string, error) {
	buf := make([]byte, nBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
