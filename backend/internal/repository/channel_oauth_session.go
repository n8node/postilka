package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type ChannelOAuthSessionRepository struct {
	pool *pgxpool.Pool
}

func NewChannelOAuthSessionRepository(pool *pgxpool.Pool) *ChannelOAuthSessionRepository {
	return &ChannelOAuthSessionRepository{pool: pool}
}

type ChannelOAuthSessionCreateParams struct {
	UserID                string
	WorkspaceID           string
	Provider              model.SocialProvider
	StateToken            string
	AccessTokenEncrypted  string
	RefreshTokenEncrypted string
	TokenExpiresAt        *time.Time
	Metadata              map[string]any
	ExpiresAt             time.Time
}

func (r *ChannelOAuthSessionRepository) Create(ctx context.Context, p ChannelOAuthSessionCreateParams) (*model.ChannelOAuthSession, error) {
	meta := p.Metadata
	if meta == nil {
		meta = map[string]any{}
	}
	raw, err := json.Marshal(meta)
	if err != nil {
		return nil, err
	}
	const q = `
		INSERT INTO channel_oauth_sessions (
			user_id, workspace_id, provider, state_token,
			access_token_encrypted, refresh_token_encrypted, token_expires_at,
			metadata, expires_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, user_id, workspace_id, provider, state_token,
		          access_token_encrypted, refresh_token_encrypted, token_expires_at,
		          metadata, expires_at, created_at
	`
	return r.scanSession(r.pool.QueryRow(ctx, q,
		p.UserID, p.WorkspaceID, string(p.Provider), p.StateToken,
		nullIfEmpty(p.AccessTokenEncrypted), nullIfEmpty(p.RefreshTokenEncrypted), p.TokenExpiresAt,
		raw, p.ExpiresAt,
	))
}

func (r *ChannelOAuthSessionRepository) GetByState(ctx context.Context, stateToken string) (*model.ChannelOAuthSession, error) {
	const q = `
		SELECT id, user_id, workspace_id, provider, state_token,
		       access_token_encrypted, refresh_token_encrypted, token_expires_at,
		       metadata, expires_at, created_at
		FROM channel_oauth_sessions
		WHERE state_token = $1
	`
	return r.scanSession(r.pool.QueryRow(ctx, q, stateToken))
}

func (r *ChannelOAuthSessionRepository) GetByID(ctx context.Context, id, userID string) (*model.ChannelOAuthSession, error) {
	const q = `
		SELECT id, user_id, workspace_id, provider, state_token,
		       access_token_encrypted, refresh_token_encrypted, token_expires_at,
		       metadata, expires_at, created_at
		FROM channel_oauth_sessions
		WHERE id = $1 AND user_id = $2
	`
	return r.scanSession(r.pool.QueryRow(ctx, q, id, userID))
}

func (r *ChannelOAuthSessionRepository) UpdateTokens(
	ctx context.Context,
	id string,
	accessTokenEncrypted, refreshTokenEncrypted string,
	tokenExpiresAt *time.Time,
	metadata map[string]any,
) error {
	raw, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	const q = `
		UPDATE channel_oauth_sessions
		SET access_token_encrypted = $2,
		    refresh_token_encrypted = $3,
		    token_expires_at = $4,
		    metadata = $5
		WHERE id = $1
	`
	ct, err := r.pool.Exec(ctx, q, id,
		nullIfEmpty(accessTokenEncrypted), nullIfEmpty(refreshTokenEncrypted),
		tokenExpiresAt, raw,
	)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *ChannelOAuthSessionRepository) Delete(ctx context.Context, id string) error {
	const q = `DELETE FROM channel_oauth_sessions WHERE id = $1`
	_, err := r.pool.Exec(ctx, q, id)
	return err
}

func (r *ChannelOAuthSessionRepository) scanSession(row pgx.Row) (*model.ChannelOAuthSession, error) {
	var s model.ChannelOAuthSession
	var provider string
	var accessToken, refreshToken *string
	var raw []byte
	err := row.Scan(
		&s.ID, &s.UserID, &s.WorkspaceID, &provider, &s.StateToken,
		&accessToken, &refreshToken, &s.TokenExpiresAt,
		&raw, &s.ExpiresAt, &s.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	s.Provider = model.SocialProvider(provider)
	if accessToken != nil {
		s.AccessTokenEncrypted = *accessToken
	}
	if refreshToken != nil {
		s.RefreshTokenEncrypted = *refreshToken
	}
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &s.Metadata)
	}
	if s.Metadata == nil {
		s.Metadata = map[string]any{}
	}
	return &s, nil
}

func nullIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
