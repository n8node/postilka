package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type AIGenerationRepository struct {
	pool    *pgxpool.Pool
	columns aiGenerationColumnFlags
}

func NewAIGenerationRepository(pool *pgxpool.Pool) *AIGenerationRepository {
	return &AIGenerationRepository{pool: pool}
}

func (r *AIGenerationRepository) Create(ctx context.Context, g model.AIGeneration) (model.AIGeneration, error) {
	if g.ID == "" {
		g.ID = uuid.NewString()
	}
	cols, argCount, includePreview := r.generationInsertSpec(ctx)
	query := fmt.Sprintf(`
		INSERT INTO ai_generations (%s)
		VALUES (%s)
		RETURNING created_at
	`, cols, generationInsertPlaceholders(argCount))

	args := []any{
		g.ID, g.UserID, g.WorkspaceID, g.Mode, g.Prompt, g.Model, g.AspectRatio,
		g.ResultS3Key, g.ResultContentType,
	}
	if r.columns.videoDuration {
		args = append(args, g.VideoDurationSeconds)
	}
	if includePreview {
		args = append(args, emptyStringToNull(g.PreviewS3Key))
	}

	err := r.pool.QueryRow(ctx, query, args...).Scan(&g.CreatedAt)
	return g, err
}

func (r *AIGenerationRepository) GetByID(ctx context.Context, id, userID string) (model.AIGeneration, error) {
	var g model.AIGeneration
	cols := r.generationSelectColumns(ctx)
	query := fmt.Sprintf(`
		SELECT %s
		FROM ai_generations
		WHERE id = $1 AND user_id = $2
	`, cols)
	err := r.pool.QueryRow(ctx, query, id, userID).Scan(
		&g.ID, &g.UserID, &g.WorkspaceID, &g.Mode, &g.Prompt, &g.Model, &g.AspectRatio,
		&g.ResultS3Key, &g.ResultContentType, &g.VideoDurationSeconds, &g.PreviewS3Key, &g.CreatedAt,
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
	return r.listByWorkspace(ctx, workspaceID, limit, "image")
}

func (r *AIGenerationRepository) ListVideoByWorkspace(ctx context.Context, workspaceID string, limit int) ([]model.AIGenerationWithUsage, error) {
	return r.listByWorkspace(ctx, workspaceID, limit, "video")
}

func (r *AIGenerationRepository) listByWorkspace(ctx context.Context, workspaceID string, limit int, mediaKind string) ([]model.AIGenerationWithUsage, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	modeFilter := `mode NOT IN ('text-to-video', 'image-to-video', 'reference-to-video') AND (result_content_type IS NULL OR result_content_type NOT LIKE 'video/%')`
	if mediaKind == "video" {
		modeFilter = `(mode IN ('text-to-video', 'image-to-video', 'reference-to-video') OR (result_content_type IS NOT NULL AND result_content_type LIKE 'video/%'))`
	}
	cols := r.generationSelectColumns(ctx)
	query := fmt.Sprintf(`
		SELECT %s
		FROM ai_generations
		WHERE workspace_id = $1 AND %s
		ORDER BY created_at DESC
		LIMIT $2
	`, cols, modeFilter)
	rows, err := r.pool.Query(ctx, query, workspaceID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.AIGenerationWithUsage, 0, limit)
	for rows.Next() {
		var g model.AIGenerationWithUsage
		if err := rows.Scan(
			&g.ID, &g.UserID, &g.WorkspaceID, &g.Mode, &g.Prompt, &g.Model, &g.AspectRatio,
			&g.ResultS3Key, &g.ResultContentType, &g.VideoDurationSeconds, &g.PreviewS3Key, &g.CreatedAt,
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
	cols := r.generationSelectColumns(ctx)
	rows, err := r.pool.Query(ctx, fmt.Sprintf(`
		SELECT %s
		FROM ai_generations
		WHERE workspace_id = $1 AND id = ANY($2)
	`, cols), workspaceID, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.AIGeneration, 0, len(ids))
	for rows.Next() {
		var g model.AIGeneration
		if err := rows.Scan(
			&g.ID, &g.UserID, &g.WorkspaceID, &g.Mode, &g.Prompt, &g.Model, &g.AspectRatio,
			&g.ResultS3Key, &g.ResultContentType, &g.VideoDurationSeconds, &g.PreviewS3Key, &g.CreatedAt,
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

func emptyStringToNull(s string) any {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return s
}
