package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type MetrikaPlatformConfigRepository struct {
	pool *pgxpool.Pool
}

func NewMetrikaPlatformConfigRepository(pool *pgxpool.Pool) *MetrikaPlatformConfigRepository {
	return &MetrikaPlatformConfigRepository{pool: pool}
}

func (r *MetrikaPlatformConfigRepository) Get(ctx context.Context) (*model.MetrikaPlatformConfigRecord, error) {
	const q = `
		SELECT config, updated_at
		FROM metrika_platform_config
		WHERE id = 1
	`
	var raw []byte
	var rec model.MetrikaPlatformConfigRecord
	err := r.pool.QueryRow(ctx, q).Scan(&raw, &rec.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, &rec.Config); err != nil {
		return nil, err
	}
	return &rec, nil
}

func (r *MetrikaPlatformConfigRepository) Update(ctx context.Context, config model.MetrikaPlatformStoredConfig) (*model.MetrikaPlatformConfigRecord, error) {
	raw, err := json.Marshal(config)
	if err != nil {
		return nil, err
	}
	const q = `
		UPDATE metrika_platform_config
		SET config = $1, updated_at = NOW()
		WHERE id = 1
		RETURNING config, updated_at
	`
	var out []byte
	var rec model.MetrikaPlatformConfigRecord
	err = r.pool.QueryRow(ctx, q, raw).Scan(&out, &rec.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(out, &rec.Config); err != nil {
		return nil, err
	}
	return &rec, nil
}
