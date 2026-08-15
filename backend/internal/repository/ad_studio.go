package repository

import (
	"context"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type AdStudioRepository struct {
	pool *pgxpool.Pool
}

func NewAdStudioRepository(pool *pgxpool.Pool) *AdStudioRepository {
	return &AdStudioRepository{pool: pool}
}

const adStudioSelect = `
	SELECT id, title, description, category, media_kind, generation_mode, aspect_ratio, duration,
	       system_prompt, preview_s3_key, preview_content_type, preview_thumb_s3_key,
	       requires_product, requires_avatar, sort_order, is_published,
	       created_at, updated_at
	FROM ad_studio_templates
`

const adStudioReturning = `
		RETURNING id, title, description, category, media_kind, generation_mode, aspect_ratio, duration,
		          system_prompt, preview_s3_key, preview_content_type, preview_thumb_s3_key,
		          requires_product, requires_avatar, sort_order, is_published,
		          created_at, updated_at
`

func scanAdStudioTemplate(row pgx.Row) (model.AdStudioTemplate, error) {
	var t model.AdStudioTemplate
	err := row.Scan(
		&t.ID, &t.Title, &t.Description, &t.Category, &t.MediaKind, &t.GenerationMode, &t.AspectRatio, &t.Duration,
		&t.SystemPrompt, &t.PreviewS3Key, &t.PreviewContentType, &t.PreviewThumbS3Key,
		&t.RequiresProduct, &t.RequiresAvatar, &t.SortOrder, &t.IsPublished,
		&t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return model.AdStudioTemplate{}, ErrNotFound
		}
		return model.AdStudioTemplate{}, err
	}
	return t, nil
}

func (r *AdStudioRepository) List(ctx context.Context, category string, publishedOnly bool) ([]model.AdStudioTemplate, error) {
	q := adStudioSelect + ` WHERE 1=1`
	args := []any{}
	n := 1
	if publishedOnly {
		q += ` AND is_published = TRUE`
	}
	if cat := strings.TrimSpace(category); cat != "" {
		q += ` AND category = $` + strconv.Itoa(n)
		args = append(args, cat)
		n++
	}
	q += ` ORDER BY sort_order ASC, created_at DESC`

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.AdStudioTemplate
	for rows.Next() {
		t, err := scanAdStudioTemplate(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, t)
	}
	return items, rows.Err()
}

func (r *AdStudioRepository) GetByID(ctx context.Context, id string) (model.AdStudioTemplate, error) {
	return scanAdStudioTemplate(r.pool.QueryRow(ctx, adStudioSelect+` WHERE id = $1`, id))
}

func (r *AdStudioRepository) Create(ctx context.Context, t model.AdStudioTemplate) (model.AdStudioTemplate, error) {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	return scanAdStudioTemplate(r.pool.QueryRow(ctx, `
		INSERT INTO ad_studio_templates (
			id, title, description, category, media_kind, generation_mode, aspect_ratio, duration,
			system_prompt, preview_s3_key, preview_content_type, preview_thumb_s3_key,
			requires_product, requires_avatar, sort_order, is_published
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12,
			$13, $14, $15, $16
		)`+adStudioReturning, t.ID, t.Title, t.Description, t.Category, t.MediaKind, t.GenerationMode, t.AspectRatio, t.Duration,
		t.SystemPrompt, t.PreviewS3Key, t.PreviewContentType, t.PreviewThumbS3Key,
		t.RequiresProduct, t.RequiresAvatar, t.SortOrder, t.IsPublished,
	))
}

func (r *AdStudioRepository) Update(ctx context.Context, t model.AdStudioTemplate) (model.AdStudioTemplate, error) {
	return scanAdStudioTemplate(r.pool.QueryRow(ctx, `
		UPDATE ad_studio_templates SET
			title = $2,
			description = $3,
			category = $4,
			media_kind = $5,
			generation_mode = $6,
			aspect_ratio = $7,
			duration = $8,
			system_prompt = $9,
			requires_product = $10,
			requires_avatar = $11,
			sort_order = $12,
			is_published = $13,
			updated_at = NOW()
		WHERE id = $1`+adStudioReturning,
		t.ID, t.Title, t.Description, t.Category, t.MediaKind, t.GenerationMode, t.AspectRatio, t.Duration,
		t.SystemPrompt, t.RequiresProduct, t.RequiresAvatar, t.SortOrder, t.IsPublished,
	))
}

func (r *AdStudioRepository) UpdatePreview(ctx context.Context, id, s3Key, contentType, thumbKey string) (model.AdStudioTemplate, error) {
	return scanAdStudioTemplate(r.pool.QueryRow(ctx, `
		UPDATE ad_studio_templates SET
			preview_s3_key = $2,
			preview_content_type = $3,
			preview_thumb_s3_key = $4,
			updated_at = NOW()
		WHERE id = $1`+adStudioReturning, id, s3Key, contentType, thumbKey))
}

func (r *AdStudioRepository) UpdatePreviewThumb(ctx context.Context, id, thumbKey string) (model.AdStudioTemplate, error) {
	return scanAdStudioTemplate(r.pool.QueryRow(ctx, `
		UPDATE ad_studio_templates SET
			preview_thumb_s3_key = $2,
			updated_at = NOW()
		WHERE id = $1`+adStudioReturning, id, thumbKey))
}

func (r *AdStudioRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM ad_studio_templates WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
