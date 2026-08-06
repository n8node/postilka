package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type TelegramSettingsRepository struct {
	pool *pgxpool.Pool
}

func NewTelegramSettingsRepository(pool *pgxpool.Pool) *TelegramSettingsRepository {
	return &TelegramSettingsRepository{pool: pool}
}

func (r *TelegramSettingsRepository) Get(ctx context.Context) (*model.TelegramSettingsRecord, error) {
	const q = `
		SELECT config, updated_at
		FROM telegram_settings
		WHERE id = 1
	`
	var raw []byte
	var rec model.TelegramSettingsRecord
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

func (r *TelegramSettingsRepository) Update(ctx context.Context, config model.TelegramSettings) (*model.TelegramSettingsRecord, error) {
	raw, err := json.Marshal(config)
	if err != nil {
		return nil, err
	}
	const q = `
		UPDATE telegram_settings
		SET config = $1, updated_at = NOW()
		WHERE id = 1
		RETURNING config, updated_at
	`
	var out []byte
	var rec model.TelegramSettingsRecord
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
