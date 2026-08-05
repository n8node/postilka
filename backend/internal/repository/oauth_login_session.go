package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type OAuthLoginSessionRepository struct {
	pool *pgxpool.Pool
}

func NewOAuthLoginSessionRepository(pool *pgxpool.Pool) *OAuthLoginSessionRepository {
	return &OAuthLoginSessionRepository{pool: pool}
}

func (r *OAuthLoginSessionRepository) Create(
	ctx context.Context,
	provider model.LoginOAuthProvider,
	stateToken, mode, userID, redirectPath, codeVerifier string,
	ttl time.Duration,
) error {
	const q = `
		INSERT INTO oauth_login_sessions (
			provider, state_token, mode, user_id, redirect_path, code_verifier, expires_at
		)
		VALUES ($1::login_oauth_provider, $2, $3, NULLIF($4, '')::uuid, $5, NULLIF($6, ''), $7)
	`
	expiresAt := time.Now().Add(ttl)
	_, err := r.pool.Exec(
		ctx, q,
		string(provider), stateToken, mode, userID, redirectPath, codeVerifier, expiresAt,
	)
	return err
}

func (r *OAuthLoginSessionRepository) GetByStateToken(ctx context.Context, stateToken string) (*model.OAuthLoginSession, error) {
	const q = `
		SELECT id, provider::text, state_token, mode, COALESCE(user_id::text, ''), redirect_path,
			COALESCE(code_verifier, ''), expires_at, completed_at, COALESCE(completed_user_id::text, ''),
			COALESCE(provider_user_id, '')
		FROM oauth_login_sessions
		WHERE state_token = $1
	`
	row := r.pool.QueryRow(ctx, q, stateToken)
	return scanOAuthSession(row)
}

func (r *OAuthLoginSessionRepository) Complete(
	ctx context.Context,
	stateToken, userID, providerUserID string,
) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE oauth_login_sessions
		SET completed_at = NOW(),
		    completed_user_id = $2::uuid,
		    provider_user_id = $3
		WHERE state_token = $1
		  AND completed_at IS NULL
		  AND expires_at > NOW()
	`, stateToken, userID, providerUserID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func scanOAuthSession(row pgx.Row) (*model.OAuthLoginSession, error) {
	var s model.OAuthLoginSession
	var provider string
	err := row.Scan(
		&s.ID, &provider, &s.StateToken, &s.Mode, &s.UserID, &s.RedirectPath,
		&s.CodeVerifier, &s.ExpiresAt, &s.CompletedAt, &s.CompletedUserID, &s.ProviderUserID,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	s.Provider = model.LoginOAuthProvider(provider)
	return &s, nil
}
