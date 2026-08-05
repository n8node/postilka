package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type UserLoginIdentityRepository struct {
	pool *pgxpool.Pool
}

func NewUserLoginIdentityRepository(pool *pgxpool.Pool) *UserLoginIdentityRepository {
	return &UserLoginIdentityRepository{pool: pool}
}

func (r *UserLoginIdentityRepository) GetByProviderUser(
	ctx context.Context,
	provider model.LoginOAuthProvider,
	providerUserID string,
) (*model.UserLoginIdentity, error) {
	const q = `
		SELECT id, user_id, provider, provider_user_id, display_name, COALESCE(avatar_url, ''), created_at
		FROM user_login_identities
		WHERE provider = $1 AND provider_user_id = $2
	`
	row := r.pool.QueryRow(ctx, q, provider, providerUserID)
	return scanLoginIdentity(row)
}

func (r *UserLoginIdentityRepository) ListByUserID(ctx context.Context, userID string) ([]model.UserLoginIdentity, error) {
	const q = `
		SELECT id, user_id, provider, provider_user_id, display_name, COALESCE(avatar_url, ''), created_at
		FROM user_login_identities
		WHERE user_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]model.UserLoginIdentity, 0)
	for rows.Next() {
		item, err := scanLoginIdentity(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *item)
	}
	return items, rows.Err()
}

func (r *UserLoginIdentityRepository) CountByUserID(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM user_login_identities WHERE user_id = $1
	`, userID).Scan(&count)
	return count, err
}

func (r *UserLoginIdentityRepository) Upsert(
	ctx context.Context,
	userID string,
	provider model.LoginOAuthProvider,
	providerUserID, displayName, avatarURL string,
) (*model.UserLoginIdentity, error) {
	const q = `
		INSERT INTO user_login_identities (user_id, provider, provider_user_id, display_name, avatar_url)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''))
		ON CONFLICT (provider, provider_user_id) DO UPDATE SET
			user_id = EXCLUDED.user_id,
			display_name = EXCLUDED.display_name,
			avatar_url = EXCLUDED.avatar_url,
			updated_at = NOW()
		RETURNING id, user_id, provider, provider_user_id, display_name, COALESCE(avatar_url, ''), created_at
	`
	return scanLoginIdentity(r.pool.QueryRow(ctx, q, userID, provider, providerUserID, displayName, avatarURL))
}

func (r *UserLoginIdentityRepository) UpsertTx(
	ctx context.Context,
	tx pgx.Tx,
	userID string,
	provider model.LoginOAuthProvider,
	providerUserID, displayName, avatarURL string,
) (*model.UserLoginIdentity, error) {
	const q = `
		INSERT INTO user_login_identities (user_id, provider, provider_user_id, display_name, avatar_url)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''))
		ON CONFLICT (provider, provider_user_id) DO UPDATE SET
			user_id = EXCLUDED.user_id,
			display_name = EXCLUDED.display_name,
			avatar_url = EXCLUDED.avatar_url,
			updated_at = NOW()
		RETURNING id, user_id, provider, provider_user_id, display_name, COALESCE(avatar_url, ''), created_at
	`
	return scanLoginIdentity(tx.QueryRow(ctx, q, userID, provider, providerUserID, displayName, avatarURL))
}

func (r *UserLoginIdentityRepository) DeleteByUserProvider(
	ctx context.Context,
	userID string,
	provider model.LoginOAuthProvider,
) error {
	tag, err := r.pool.Exec(ctx, `
		DELETE FROM user_login_identities WHERE user_id = $1 AND provider = $2
	`, userID, provider)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func scanLoginIdentity(row pgx.Row) (*model.UserLoginIdentity, error) {
	var item model.UserLoginIdentity
	var createdAt time.Time
	err := row.Scan(
		&item.ID, &item.UserID, &item.Provider, &item.ProviderUserID,
		&item.DisplayName, &item.AvatarURL, &createdAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	item.CreatedAt = createdAt
	return &item, nil
}
