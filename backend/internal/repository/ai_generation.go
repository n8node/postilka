package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type AIGenerationRepository struct {
	pool *pgxpool.Pool
}

func NewAIGenerationRepository(pool *pgxpool.Pool) *AIGenerationRepository {
	return &AIGenerationRepository{pool: pool}
}

func (r *AIGenerationRepository) Create(ctx context.Context, g model.AIGeneration) (model.AIGeneration, error) {
	if g.ID == "" {
		g.ID = uuid.NewString()
	}
	err := r.pool.QueryRow(ctx, `
		INSERT INTO ai_generations (
			id, user_id, workspace_id, mode, prompt, model, aspect_ratio, result_s3_key, result_content_type, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
		RETURNING created_at
	`, g.ID, g.UserID, g.WorkspaceID, g.Mode, g.Prompt, g.Model, g.AspectRatio, g.ResultS3Key, g.ResultContentType,
	).Scan(&g.CreatedAt)
	return g, err
}

func (r *AIGenerationRepository) GetByID(ctx context.Context, id, userID string) (model.AIGeneration, error) {
	var g model.AIGeneration
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, workspace_id, mode, prompt, model, aspect_ratio, result_s3_key, result_content_type, created_at
		FROM ai_generations
		WHERE id = $1 AND user_id = $2
	`, id, userID).Scan(
		&g.ID, &g.UserID, &g.WorkspaceID, &g.Mode, &g.Prompt, &g.Model, &g.AspectRatio,
		&g.ResultS3Key, &g.ResultContentType, &g.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return model.AIGeneration{}, ErrNotFound
		}
		return model.AIGeneration{}, err
	}
	return g, nil
}

func (r *AIGenerationRepository) ListByWorkspaceWithUsage(ctx context.Context, workspaceID string, limit int) ([]model.AIGenerationWithUsage, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, workspace_id, mode, prompt, model, aspect_ratio, result_s3_key, result_content_type, created_at
		FROM ai_generations
		WHERE workspace_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, workspaceID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.AIGenerationWithUsage, 0, limit)
	for rows.Next() {
		var g model.AIGenerationWithUsage
		if err := rows.Scan(
			&g.ID, &g.UserID, &g.WorkspaceID, &g.Mode, &g.Prompt, &g.Model, &g.AspectRatio,
			&g.ResultS3Key, &g.ResultContentType, &g.CreatedAt,
		); err != nil {
			return nil, err
		}
		g.UsedInPost = false
		out = append(out, g)
	}
	return out, rows.Err()
}

func (r *AIGenerationRepository) ListOwnedByIDs(ctx context.Context, workspaceID string, ids []string) ([]model.AIGeneration, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, workspace_id, mode, prompt, model, aspect_ratio, result_s3_key, result_content_type, created_at
		FROM ai_generations
		WHERE workspace_id = $1 AND id = ANY($2)
	`, workspaceID, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.AIGeneration, 0, len(ids))
	for rows.Next() {
		var g model.AIGeneration
		if err := rows.Scan(
			&g.ID, &g.UserID, &g.WorkspaceID, &g.Mode, &g.Prompt, &g.Model, &g.AspectRatio,
			&g.ResultS3Key, &g.ResultContentType, &g.CreatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, rows.Err()
}

func (r *AIGenerationRepository) DeleteByIDs(ctx context.Context, workspaceID string, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	_, err := r.pool.Exec(ctx, `
		DELETE FROM ai_generations
		WHERE workspace_id = $1 AND id = ANY($2)
	`, workspaceID, ids)
	return err
}

func (r *AIGenerationRepository) SetWorkspaceFileID(ctx context.Context, id, fileID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE ai_generations SET workspace_file_id = $2 WHERE id = $1
	`, id, fileID)
	return err
}
