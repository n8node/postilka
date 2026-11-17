package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type AntiFraudTelegramSettingsRepository struct{ pool *pgxpool.Pool }

func NewAntiFraudTelegramSettingsRepository(pool *pgxpool.Pool) *AntiFraudTelegramSettingsRepository {
	return &AntiFraudTelegramSettingsRepository{pool: pool}
}

func (r *AntiFraudTelegramSettingsRepository) Get(ctx context.Context) (*model.AntiFraudTelegramSettingsRecord, error) {
	var raw []byte
	var rec model.AntiFraudTelegramSettingsRecord
	err := r.pool.QueryRow(ctx, `SELECT config, updated_at FROM anti_fraud_telegram_settings WHERE id = 1`).Scan(&raw, &rec.UpdatedAt)
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

func (r *AntiFraudTelegramSettingsRepository) Update(ctx context.Context, cfg model.AntiFraudTelegramSettings) (*model.AntiFraudTelegramSettingsRecord, error) {
	raw, err := json.Marshal(cfg)
	if err != nil {
		return nil, err
	}
	var out []byte
	var rec model.AntiFraudTelegramSettingsRecord
	err = r.pool.QueryRow(ctx, `
UPDATE anti_fraud_telegram_settings SET config = $1, updated_at = NOW() WHERE id = 1
RETURNING config, updated_at`, raw).Scan(&out, &rec.UpdatedAt)
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
