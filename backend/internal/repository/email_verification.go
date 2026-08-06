package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type EmailVerificationRepository struct {
	pool *pgxpool.Pool
}

func NewEmailVerificationRepository(pool *pgxpool.Pool) *EmailVerificationRepository {
	return &EmailVerificationRepository{pool: pool}
}

func (r *EmailVerificationRepository) Create(ctx context.Context, userID string, tokenHash []byte, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`, userID, tokenHash, expiresAt)
	return err
}

func (r *EmailVerificationRepository) InvalidateActiveForUser(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE email_verification_tokens
		SET used_at = NOW()
		WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()
	`, userID)
	return err
}

type EmailVerificationToken struct {
	ID     string
	UserID string
}

func (r *EmailVerificationRepository) FindValid(ctx context.Context, tokenHash []byte) (*EmailVerificationToken, error) {
	const q = `
		SELECT id, user_id
		FROM email_verification_tokens
		WHERE token_hash = $1
		  AND used_at IS NULL
		  AND expires_at > NOW()
	`
	var t EmailVerificationToken
	err := r.pool.QueryRow(ctx, q, tokenHash).Scan(&t.ID, &t.UserID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *EmailVerificationRepository) MarkUsed(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE email_verification_tokens
		SET used_at = NOW()
		WHERE id = $1 AND used_at IS NULL
	`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
