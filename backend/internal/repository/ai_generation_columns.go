package repository

import (
	"context"
	"strconv"
	"sync"

	"github.com/jackc/pgx/v5/pgxpool"
)

type aiGenerationColumnFlags struct {
	once          sync.Once
	videoDuration bool
	previewS3Key  bool
}

func (f *aiGenerationColumnFlags) load(ctx context.Context, pool *pgxpool.Pool) {
	f.once.Do(func() {
		f.videoDuration = pgColumnExists(ctx, pool, "ai_generations", "video_duration_seconds")
		f.previewS3Key = pgColumnExists(ctx, pool, "ai_generations", "preview_s3_key")
	})
}

func pgColumnExists(ctx context.Context, pool *pgxpool.Pool, table, column string) bool {
	var exists bool
	err := pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = 'public'
			  AND table_name = $1
			  AND column_name = $2
		)
	`, table, column).Scan(&exists)
	return err == nil && exists
}

func (r *AIGenerationRepository) generationSelectColumns(ctx context.Context) string {
	r.columns.load(ctx, r.pool)
	cols := `id, user_id, workspace_id, mode, prompt, model, aspect_ratio, result_s3_key, result_content_type`
	if r.columns.videoDuration {
		cols += `, video_duration_seconds`
	} else {
		cols += `, 0 AS video_duration_seconds`
	}
	if r.columns.previewS3Key {
		cols += `, COALESCE(preview_s3_key, '') AS preview_s3_key`
	} else {
		cols += `, '' AS preview_s3_key`
	}
	cols += `, created_at`
	return cols
}

func (r *AIGenerationRepository) generationInsertSpec(ctx context.Context) (cols string, argCount int, includePreview bool) {
	r.columns.load(ctx, r.pool)
	cols = `id, user_id, workspace_id, mode, prompt, model, aspect_ratio, result_s3_key, result_content_type`
	argCount = 9
	if r.columns.videoDuration {
		cols += `, video_duration_seconds`
		argCount++
	}
	includePreview = r.columns.previewS3Key
	if includePreview {
		cols += `, preview_s3_key`
		argCount++
	}
	cols += `, created_at`
	return cols, argCount, includePreview
}

func generationInsertPlaceholders(argCount int) string {
	parts := make([]string, argCount)
	for i := range parts {
		parts[i] = "$" + strconv.Itoa(i+1)
	}
	return joinComma(parts) + ", now()"
}

func joinComma(parts []string) string {
	if len(parts) == 0 {
		return ""
	}
	out := parts[0]
	for i := 1; i < len(parts); i++ {
		out += ", " + parts[i]
	}
	return out
}
