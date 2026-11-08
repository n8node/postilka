package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type InstagramProviderSettingsRepository struct{ pool *pgxpool.Pool }

func NewInstagramProviderSettingsRepository(pool *pgxpool.Pool) *InstagramProviderSettingsRepository {
	return &InstagramProviderSettingsRepository{pool: pool}
}

func (r *InstagramProviderSettingsRepository) Get(ctx context.Context) (*model.InstagramProviderSettingsRecord, error) {
	var raw []byte
	var out model.InstagramProviderSettingsRecord
	err := r.pool.QueryRow(ctx, `SELECT config, updated_at FROM instagram_provider_settings WHERE id = 1`).Scan(&raw, &out.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, &out.Config); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *InstagramProviderSettingsRepository) Update(ctx context.Context, cfg model.InstagramProviderSettings) (*model.InstagramProviderSettingsRecord, error) {
	raw, err := json.Marshal(cfg)
	if err != nil {
		return nil, err
	}
	var out model.InstagramProviderSettingsRecord
	err = r.pool.QueryRow(ctx, `UPDATE instagram_provider_settings SET config = $1, updated_at = NOW() WHERE id = 1 RETURNING config, updated_at`, raw).Scan(&raw, &out.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, &out.Config); err != nil {
		return nil, err
	}
	return &out, nil
}
