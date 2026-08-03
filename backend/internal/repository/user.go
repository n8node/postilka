package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

var ErrNotFound = errors.New("not found")

type UserRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

const userColumns = `id, email, name, locale, timezone, is_blocked, created_at`

func (r *UserRepository) Create(ctx context.Context, email, passwordHash, name string) (*model.User, error) {
	const q = `
		INSERT INTO users (email, password_hash, name)
		VALUES ($1, $2, $3)
		RETURNING id, email, name, locale, timezone, is_blocked, created_at
	`
	return scanUser(r.pool.QueryRow(ctx, q, email, passwordHash, name))
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*model.User, string, error) {
	const q = `
		SELECT id, email, password_hash, name, locale, timezone, is_blocked, created_at
		FROM users WHERE email = $1
	`
	var hash string
	row := r.pool.QueryRow(ctx, q, email)
	u, err := scanUserWithHash(row, &hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, "", ErrNotFound
	}
	return u, hash, err
}

func (r *UserRepository) GetByID(ctx context.Context, id string) (*model.User, error) {
	const q = `
		SELECT id, email, name, locale, timezone, is_blocked, created_at
		FROM users WHERE id = $1
	`
	return scanUser(r.pool.QueryRow(ctx, q, id))
}

func (r *UserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`, email).Scan(&exists)
	return exists, err
}

func (r *UserRepository) TouchActive(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `UPDATE users SET updated_at = NOW() WHERE id = $1`, id)
	return err
}

func scanUser(row pgx.Row) (*model.User, error) {
	var u model.User
	var createdAt time.Time
	err := row.Scan(&u.ID, &u.Email, &u.Name, &u.Locale, &u.Timezone, &u.IsBlocked, &createdAt)
	if err != nil {
		return nil, err
	}
	u.CreatedAt = createdAt
	return &u, nil
}

func scanUserWithHash(row pgx.Row, hash *string) (*model.User, error) {
	var u model.User
	var createdAt time.Time
	err := row.Scan(&u.ID, &u.Email, hash, &u.Name, &u.Locale, &u.Timezone, &u.IsBlocked, &createdAt)
	if err != nil {
		return nil, err
	}
	u.CreatedAt = createdAt
	return &u, nil
}
