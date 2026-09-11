package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type CarouselRepository struct {
	pool *pgxpool.Pool
}

func NewCarouselRepository(pool *pgxpool.Pool) *CarouselRepository {
	return &CarouselRepository{pool: pool}
}

const carouselColumns = `
	id, workspace_id, created_by::text, title, topic, caption, slides,
	generation_credits, text_credits, created_at, updated_at
`

func scanCarousel(row pgx.Row) (*model.Carousel, error) {
	var carousel model.Carousel
	var createdBy *string
	var slidesRaw []byte
	if err := row.Scan(
		&carousel.ID, &carousel.WorkspaceID, &createdBy,
		&carousel.Title, &carousel.Topic, &carousel.Caption, &slidesRaw,
		&carousel.GenerationCredits, &carousel.TextCredits,
		&carousel.CreatedAt, &carousel.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	carousel.CreatedBy = createdBy
	if err := json.Unmarshal(slidesRaw, &carousel.Slides); err != nil {
		return nil, fmt.Errorf("decode carousel slides: %w", err)
	}
	return &carousel, nil
}

func (r *CarouselRepository) ListByWorkspace(ctx context.Context, workspaceID string) ([]model.Carousel, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+carouselColumns+` FROM carousels
		WHERE workspace_id = $1
		ORDER BY updated_at DESC
	`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]model.Carousel, 0)
	for rows.Next() {
		item, err := scanCarousel(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *item)
	}
	return items, rows.Err()
}

func (r *CarouselRepository) GetByID(ctx context.Context, id, workspaceID string) (*model.Carousel, error) {
	return scanCarousel(r.pool.QueryRow(ctx, `
		SELECT `+carouselColumns+` FROM carousels
		WHERE id = $1 AND workspace_id = $2
	`, id, workspaceID))
}

func (r *CarouselRepository) Create(ctx context.Context, carousel *model.Carousel) (*model.Carousel, error) {
	slides, err := json.Marshal(carousel.Slides)
	if err != nil {
		return nil, err
	}
	return scanCarousel(r.pool.QueryRow(ctx, `
		INSERT INTO carousels (
			workspace_id, created_by, title, topic, caption, slides,
			generation_credits, text_credits
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING `+carouselColumns,
		carousel.WorkspaceID, carousel.CreatedBy, carousel.Title, carousel.Topic,
		carousel.Caption, slides, carousel.GenerationCredits, carousel.TextCredits,
	))
}

func (r *CarouselRepository) Update(ctx context.Context, carousel *model.Carousel) (*model.Carousel, error) {
	slides, err := json.Marshal(carousel.Slides)
	if err != nil {
		return nil, err
	}
	return scanCarousel(r.pool.QueryRow(ctx, `
		UPDATE carousels SET
			title = $3, topic = $4, caption = $5, slides = $6,
			generation_credits = $7, text_credits = $8, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2
		RETURNING `+carouselColumns,
		carousel.ID, carousel.WorkspaceID, carousel.Title, carousel.Topic,
		carousel.Caption, slides, carousel.GenerationCredits, carousel.TextCredits,
	))
}

func (r *CarouselRepository) Delete(ctx context.Context, id, workspaceID string) error {
	result, err := r.pool.Exec(ctx, `DELETE FROM carousels WHERE id = $1 AND workspace_id = $2`, id, workspaceID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
