package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type HelpSettingsRepository struct {
	pool *pgxpool.Pool
}

func NewHelpSettingsRepository(pool *pgxpool.Pool) *HelpSettingsRepository {
	return &HelpSettingsRepository{pool: pool}
}

func (r *HelpSettingsRepository) Get(ctx context.Context) (*model.HelpSettings, error) {
	const q = `SELECT enabled, updated_at FROM help_settings WHERE id = 1`
	var settings model.HelpSettings
	err := r.pool.QueryRow(ctx, q).Scan(&settings.Enabled, &settings.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &settings, nil
}

func (r *HelpSettingsRepository) Update(ctx context.Context, enabled bool) (*model.HelpSettings, error) {
	const q = `
		UPDATE help_settings
		SET enabled = $1, updated_at = NOW()
		WHERE id = 1
		RETURNING enabled, updated_at
	`
	var settings model.HelpSettings
	err := r.pool.QueryRow(ctx, q, enabled).Scan(&settings.Enabled, &settings.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &settings, nil
}
