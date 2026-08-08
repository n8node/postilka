package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type UploadFileSettingsRepository struct {
	pool *pgxpool.Pool
}

func NewUploadFileSettingsRepository(pool *pgxpool.Pool) *UploadFileSettingsRepository {
	return &UploadFileSettingsRepository{pool: pool}
}

func (r *UploadFileSettingsRepository) Get(ctx context.Context) (*model.UploadFileSettingsRecord, error) {
	const q = `
		SELECT config, updated_at
		FROM upload_file_settings
		WHERE id = 1
	`
	var raw []byte
	var rec model.UploadFileSettingsRecord
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

func (r *UploadFileSettingsRepository) Update(ctx context.Context, config model.UploadFileSettings) (*model.UploadFileSettingsRecord, error) {
	raw, err := json.Marshal(config)
	if err != nil {
		return nil, err
	}
	const q = `
		UPDATE upload_file_settings
		SET config = $1, updated_at = NOW()
		WHERE id = 1
		RETURNING config, updated_at
	`
	var out []byte
	var rec model.UploadFileSettingsRecord
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
