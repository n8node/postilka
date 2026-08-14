package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MetrikaRepository struct {
	pool *pgxpool.Pool
}

func NewMetrikaRepository(pool *pgxpool.Pool) *MetrikaRepository {
	return &MetrikaRepository{pool: pool}
}

type MetrikaConnectionRow struct {
	WorkspaceID           string
	CounterID             int64
	AccessTokenEncrypted  string
	RefreshTokenEncrypted string
	TokenExpiresAt        *time.Time
	ConnectedByUserID     string
	Enabled               bool
	ConnectedAt           time.Time
	UpdatedAt             time.Time
}

type MetrikaOAuthSessionRow struct {
	ID          string
	WorkspaceID string
	UserID      string
	StateToken  string
	CounterID   int64
	ExpiresAt   time.Time
	CreatedAt   time.Time
}

func (r *MetrikaRepository) GetConnection(ctx context.Context, workspaceID string) (*MetrikaConnectionRow, error) {
	var row MetrikaConnectionRow
	err := r.pool.QueryRow(ctx, `
		SELECT workspace_id::text, counter_id, access_token_encrypted,
		       COALESCE(refresh_token_encrypted, ''), token_expires_at,
		       COALESCE(connected_by_user_id::text, ''), enabled, connected_at, updated_at
		FROM workspace_metrika_connections
		WHERE workspace_id = $1
	`, workspaceID).Scan(
		&row.WorkspaceID, &row.CounterID, &row.AccessTokenEncrypted,
		&row.RefreshTokenEncrypted, &row.TokenExpiresAt,
		&row.ConnectedByUserID, &row.Enabled, &row.ConnectedAt, &row.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *MetrikaRepository) UpsertConnection(ctx context.Context, row MetrikaConnectionRow) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO workspace_metrika_connections (
			workspace_id, counter_id, access_token_encrypted, refresh_token_encrypted,
			token_expires_at, connected_by_user_id, enabled, connected_at, updated_at
		) VALUES ($1, $2, $3, NULLIF($4, ''), $5, NULLIF($6, '')::uuid, $7, NOW(), NOW())
		ON CONFLICT (workspace_id) DO UPDATE SET
			counter_id = EXCLUDED.counter_id,
			access_token_encrypted = EXCLUDED.access_token_encrypted,
			refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
			token_expires_at = EXCLUDED.token_expires_at,
			connected_by_user_id = EXCLUDED.connected_by_user_id,
			enabled = EXCLUDED.enabled,
			updated_at = NOW()
	`, row.WorkspaceID, row.CounterID, row.AccessTokenEncrypted, row.RefreshTokenEncrypted,
		row.TokenExpiresAt, row.ConnectedByUserID, row.Enabled)
	return err
}

func (r *MetrikaRepository) DeleteConnection(ctx context.Context, workspaceID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM workspace_metrika_connections WHERE workspace_id = $1`, workspaceID)
	return err
}

func (r *MetrikaRepository) CreateOAuthSession(ctx context.Context, row MetrikaOAuthSessionRow) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO metrika_oauth_sessions (id, workspace_id, user_id, state_token, counter_id, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, row.ID, row.WorkspaceID, row.UserID, row.StateToken, row.CounterID, row.ExpiresAt)
	return err
}

func (r *MetrikaRepository) GetOAuthSessionByState(ctx context.Context, stateToken string) (*MetrikaOAuthSessionRow, error) {
	var row MetrikaOAuthSessionRow
	err := r.pool.QueryRow(ctx, `
		SELECT id::text, workspace_id::text, user_id::text, state_token, counter_id, expires_at, created_at
		FROM metrika_oauth_sessions
		WHERE state_token = $1
	`, stateToken).Scan(
		&row.ID, &row.WorkspaceID, &row.UserID, &row.StateToken, &row.CounterID, &row.ExpiresAt, &row.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *MetrikaRepository) DeleteOAuthSession(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM metrika_oauth_sessions WHERE id = $1`, id)
	return err
}

func (r *MetrikaRepository) CleanupExpiredSessions(ctx context.Context) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM metrika_oauth_sessions WHERE expires_at < NOW()`)
	return err
}
