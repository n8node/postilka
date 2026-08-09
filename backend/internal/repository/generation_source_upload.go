package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type GenerationSourceUploadRepository struct {
	pool *pgxpool.Pool
}

func NewGenerationSourceUploadRepository(pool *pgxpool.Pool) *GenerationSourceUploadRepository {
	return &GenerationSourceUploadRepository{pool: pool}
}

func (r *GenerationSourceUploadRepository) Create(ctx context.Context, upload model.GenerationSourceUpload) (model.GenerationSourceUpload, error) {
	if upload.ID == "" {
		upload.ID = uuid.NewString()
	}
	err := r.pool.QueryRow(ctx, `
		INSERT INTO generation_source_uploads (id, user_id, workspace_id, s3_key, content_type, created_at)
		VALUES ($1, $2, $3, $4, $5, now())
		RETURNING created_at
	`, upload.ID, upload.UserID, upload.WorkspaceID, upload.S3Key, upload.ContentType).Scan(&upload.CreatedAt)
	return upload, err
}

func (r *GenerationSourceUploadRepository) GetByID(ctx context.Context, id, userID, workspaceID string) (model.GenerationSourceUpload, error) {
	var u model.GenerationSourceUpload
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, workspace_id, s3_key, content_type, created_at
		FROM generation_source_uploads
		WHERE id = $1 AND user_id = $2 AND workspace_id = $3
	`, id, userID, workspaceID).Scan(
		&u.ID, &u.UserID, &u.WorkspaceID, &u.S3Key, &u.ContentType, &u.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return model.GenerationSourceUpload{}, ErrNotFound
		}
		return model.GenerationSourceUpload{}, err
	}
	return u, nil
}
