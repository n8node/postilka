package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type ProviderLogoRepository struct {
	pool *pgxpool.Pool
}

func NewProviderLogoRepository(pool *pgxpool.Pool) *ProviderLogoRepository {
	return &ProviderLogoRepository{pool: pool}
}

func (r *ProviderLogoRepository) List(ctx context.Context) ([]model.ProviderLogoRecord, error) {
	const q = `
		SELECT provider, s3_key, updated_at
		FROM provider_logos
		ORDER BY provider ASC
	`
	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.ProviderLogoRecord
	for rows.Next() {
		var rec model.ProviderLogoRecord
		if err := rows.Scan(&rec.Provider, &rec.S3Key, &rec.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, rec)
	}
	return items, rows.Err()
}

func (r *ProviderLogoRepository) Get(ctx context.Context, provider model.ProviderLogoKey) (*model.ProviderLogoRecord, error) {
	const q = `
		SELECT provider, s3_key, updated_at
		FROM provider_logos
		WHERE provider = $1
	`
	var rec model.ProviderLogoRecord
	err := r.pool.QueryRow(ctx, q, string(provider)).Scan(&rec.Provider, &rec.S3Key, &rec.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &rec, nil
}

func (r *ProviderLogoRepository) Upsert(ctx context.Context, provider model.ProviderLogoKey, s3Key string) (*model.ProviderLogoRecord, error) {
	const q = `
		INSERT INTO provider_logos (provider, s3_key, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (provider) DO UPDATE
		SET s3_key = EXCLUDED.s3_key, updated_at = NOW()
		RETURNING provider, s3_key, updated_at
	`
	var rec model.ProviderLogoRecord
	if err := r.pool.QueryRow(ctx, q, string(provider), s3Key).Scan(&rec.Provider, &rec.S3Key, &rec.UpdatedAt); err != nil {
		return nil, err
	}
	return &rec, nil
}

func (r *ProviderLogoRepository) Delete(ctx context.Context, provider model.ProviderLogoKey) (string, error) {
	const q = `
		DELETE FROM provider_logos
		WHERE provider = $1
		RETURNING s3_key
	`
	var key string
	err := r.pool.QueryRow(ctx, q, string(provider)).Scan(&key)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	if err != nil {
		return "", err
	}
	return key, nil
}
