package repository

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type SketchStyleRepository struct {
	pool *pgxpool.Pool
}

func NewSketchStyleRepository(pool *pgxpool.Pool) *SketchStyleRepository {
	return &SketchStyleRepository{pool: pool}
}

const sketchStyleSelect = `
	SELECT id, title, description, positive_prompt, negative_prompt, default_strength,
	       aspect_ratio, preview_s3_key, preview_content_type, sort_order, is_published,
	       created_at, updated_at
	FROM sketch_styles
`

const sketchStyleReturning = `
	RETURNING id, title, description, positive_prompt, negative_prompt, default_strength,
	          aspect_ratio, preview_s3_key, preview_content_type, sort_order, is_published,
	          created_at, updated_at
`

func scanSketchStyle(row pgx.Row) (model.SketchStyle, error) {
	var s model.SketchStyle
	err := row.Scan(
		&s.ID, &s.Title, &s.Description, &s.PositivePrompt, &s.NegativePrompt, &s.DefaultStrength,
		&s.AspectRatio, &s.PreviewS3Key, &s.PreviewContentType, &s.SortOrder, &s.IsPublished,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return model.SketchStyle{}, ErrNotFound
		}
		return model.SketchStyle{}, err
	}
	return s, nil
}

func (r *SketchStyleRepository) List(ctx context.Context, publishedOnly bool) ([]model.SketchStyle, error) {
	q := sketchStyleSelect + ` WHERE 1=1`
	if publishedOnly {
		q += ` AND is_published = TRUE`
	}
	q += ` ORDER BY sort_order ASC, created_at DESC`

	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.SketchStyle
	for rows.Next() {
		s, err := scanSketchStyle(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, s)
	}
	return items, rows.Err()
}

func (r *SketchStyleRepository) GetByID(ctx context.Context, id string) (model.SketchStyle, error) {
	row := r.pool.QueryRow(ctx, sketchStyleSelect+` WHERE id = $1`, id)
	return scanSketchStyle(row)
}

func (r *SketchStyleRepository) Create(ctx context.Context, s model.SketchStyle) (model.SketchStyle, error) {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	row := r.pool.QueryRow(ctx, `
		INSERT INTO sketch_styles (
			id, title, description, positive_prompt, negative_prompt, default_strength,
			aspect_ratio, preview_s3_key, preview_content_type, sort_order, is_published
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		`+sketchStyleReturning,
		s.ID, s.Title, s.Description, s.PositivePrompt, s.NegativePrompt, s.DefaultStrength,
		s.AspectRatio, s.PreviewS3Key, s.PreviewContentType, s.SortOrder, s.IsPublished,
	)
	return scanSketchStyle(row)
}

func (r *SketchStyleRepository) Update(ctx context.Context, s model.SketchStyle) (model.SketchStyle, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE sketch_styles SET
			title = $2, description = $3, positive_prompt = $4, negative_prompt = $5,
			default_strength = $6, aspect_ratio = $7, sort_order = $8, is_published = $9,
			updated_at = NOW()
		WHERE id = $1
		`+sketchStyleReturning,
		s.ID, s.Title, s.Description, s.PositivePrompt, s.NegativePrompt, s.DefaultStrength,
		s.AspectRatio, s.SortOrder, s.IsPublished,
	)
	return scanSketchStyle(row)
}

func (r *SketchStyleRepository) UpdatePreview(ctx context.Context, id, s3Key, contentType string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE sketch_styles SET preview_s3_key = $2, preview_content_type = $3, updated_at = NOW()
		WHERE id = $1
	`, id, strings.TrimSpace(s3Key), strings.TrimSpace(contentType))
	return err
}

func (r *SketchStyleRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM sketch_styles WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
