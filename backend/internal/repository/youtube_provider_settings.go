package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type YouTubeProviderSettingsRepository struct {
	pool *pgxpool.Pool
}

func NewYouTubeProviderSettingsRepository(pool *pgxpool.Pool) *YouTubeProviderSettingsRepository {
	return &YouTubeProviderSettingsRepository{pool: pool}
}

func (r *YouTubeProviderSettingsRepository) Get(ctx context.Context) (*model.YouTubeProviderSettingsRecord, error) {
	const q = `
		SELECT config, updated_at
		FROM youtube_provider_settings
		WHERE id = 1
	`
	var raw []byte
	var rec model.YouTubeProviderSettingsRecord
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

func (r *YouTubeProviderSettingsRepository) Update(ctx context.Context, config model.YouTubeProviderSettings) (*model.YouTubeProviderSettingsRecord, error) {
	raw, err := json.Marshal(config)
	if err != nil {
		return nil, err
	}
	const q = `
		UPDATE youtube_provider_settings
		SET config = $1, updated_at = NOW()
		WHERE id = 1
		RETURNING config, updated_at
	`
	var out []byte
	var rec model.YouTubeProviderSettingsRecord
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
