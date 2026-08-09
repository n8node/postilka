package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type YandexGptConfigRepository struct {
	pool *pgxpool.Pool
}

func NewYandexGptConfigRepository(pool *pgxpool.Pool) *YandexGptConfigRepository {
	return &YandexGptConfigRepository{pool: pool}
}

func (r *YandexGptConfigRepository) Get(ctx context.Context) (*model.YandexGptConfigRecord, error) {
	const q = `
		SELECT config, updated_at
		FROM yandex_gpt_config
		WHERE id = 1
	`
	var raw []byte
	var rec model.YandexGptConfigRecord
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

func (r *YandexGptConfigRepository) Update(ctx context.Context, config model.YandexGptStoredConfig) (*model.YandexGptConfigRecord, error) {
	raw, err := json.Marshal(config)
	if err != nil {
		return nil, err
	}
	const q = `
		UPDATE yandex_gpt_config
		SET config = $1, updated_at = NOW()
		WHERE id = 1
		RETURNING config, updated_at
	`
	var out []byte
	var rec model.YandexGptConfigRecord
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
