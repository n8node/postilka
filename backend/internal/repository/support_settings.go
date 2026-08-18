package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type SupportSettingsRepository struct {
	pool *pgxpool.Pool
}

func NewSupportSettingsRepository(pool *pgxpool.Pool) *SupportSettingsRepository {
	return &SupportSettingsRepository{pool: pool}
}

func (r *SupportSettingsRepository) Get(ctx context.Context) (*model.SupportSettingsRecord, error) {
	const q = `
		SELECT config, updated_at
		FROM support_settings
		WHERE id = 1
	`
	var raw []byte
	var rec model.SupportSettingsRecord
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

func (r *SupportSettingsRepository) Update(ctx context.Context, config model.SupportSettings) (*model.SupportSettingsRecord, error) {
	raw, err := json.Marshal(config)
	if err != nil {
		return nil, err
	}
	const q = `
		UPDATE support_settings
		SET config = $1, updated_at = NOW()
		WHERE id = 1
		RETURNING config, updated_at
	`
	var out []byte
	var rec model.SupportSettingsRecord
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
