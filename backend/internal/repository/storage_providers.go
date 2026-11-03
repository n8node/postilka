package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type StorageProvidersRepository struct{ pool *pgxpool.Pool }

func NewStorageProvidersRepository(pool *pgxpool.Pool) *StorageProvidersRepository {
	return &StorageProvidersRepository{pool: pool}
}

func (r *StorageProvidersRepository) List(ctx context.Context) ([]model.StorageProvider, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, name, endpoint, bucket, region, access_key, secret_key, use_ssl, path_style, enabled, created_at, updated_at FROM s3_storage_providers ORDER BY created_at, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.StorageProvider{}
	for rows.Next() {
		var item model.StorageProvider
		if err := rows.Scan(&item.ID, &item.Name, &item.Endpoint, &item.Bucket, &item.Region, &item.AccessKey, &item.SecretKey, &item.UseSSL, &item.PathStyle, &item.Enabled, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *StorageProvidersRepository) Get(ctx context.Context, id string) (*model.StorageProvider, error) {
	var item model.StorageProvider
	err := r.pool.QueryRow(ctx, `SELECT id, name, endpoint, bucket, region, access_key, secret_key, use_ssl, path_style, enabled, created_at, updated_at FROM s3_storage_providers WHERE id = $1`, id).Scan(&item.ID, &item.Name, &item.Endpoint, &item.Bucket, &item.Region, &item.AccessKey, &item.SecretKey, &item.UseSSL, &item.PathStyle, &item.Enabled, &item.CreatedAt, &item.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *StorageProvidersRepository) Save(ctx context.Context, id string, req model.StorageProviderUpdateRequest, secret string) (*model.StorageProvider, error) {
	if id == "" {
		id = uuid.NewString()
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if req.Enabled {
		if _, err = tx.Exec(ctx, `UPDATE s3_storage_providers SET enabled = FALSE, updated_at = NOW()`); err != nil {
			return nil, err
		}
	}
	_, err = tx.Exec(ctx, `INSERT INTO s3_storage_providers (id, name, endpoint, bucket, region, access_key, secret_key, use_ssl, path_style, enabled) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO UPDATE SET name=$2, endpoint=$3, bucket=$4, region=$5, access_key=$6, secret_key=CASE WHEN $7 = '' THEN s3_storage_providers.secret_key ELSE $7 END, use_ssl=$8, path_style=$9, enabled=$10, updated_at=NOW()`, id, req.Name, req.Endpoint, req.Bucket, req.Region, req.AccessKey, secret, req.UseSSL, req.PathStyle, req.Enabled)
	if err != nil {
		return nil, err
	}
	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.Get(ctx, id)
}

func (r *StorageProvidersRepository) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM s3_storage_providers WHERE id = $1`, id)
	return err
}
