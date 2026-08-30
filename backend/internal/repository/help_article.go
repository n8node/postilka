package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type HelpArticleRepository struct {
	pool *pgxpool.Pool
}

func NewHelpArticleRepository(pool *pgxpool.Pool) *HelpArticleRepository {
	return &HelpArticleRepository{pool: pool}
}

const helpArticleColumns = `
	id, title, route_key, body_html, excerpt, is_published, sort_order, created_at, updated_at
`

func (r *HelpArticleRepository) List(ctx context.Context) ([]model.HelpArticle, error) {
	q := `SELECT ` + helpArticleColumns + ` FROM help_articles ORDER BY sort_order ASC, title ASC`
	return r.scanList(ctx, q)
}

func (r *HelpArticleRepository) ListPublished(ctx context.Context) ([]model.HelpArticle, error) {
	q := `SELECT ` + helpArticleColumns + ` FROM help_articles WHERE is_published = true ORDER BY sort_order ASC, title ASC`
	return r.scanList(ctx, q)
}

func (r *HelpArticleRepository) GetByID(ctx context.Context, id string) (*model.HelpArticle, error) {
	q := `SELECT ` + helpArticleColumns + ` FROM help_articles WHERE id = $1`
	a, err := scanHelpArticle(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return a, err
}

func (r *HelpArticleRepository) GetPublishedByID(ctx context.Context, id string) (*model.HelpArticle, error) {
	q := `SELECT ` + helpArticleColumns + ` FROM help_articles WHERE id = $1 AND is_published = true`
	a, err := scanHelpArticle(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return a, err
}

func (r *HelpArticleRepository) GetPublishedByRoute(ctx context.Context, routeKey string) (*model.HelpArticle, error) {
	q := `SELECT ` + helpArticleColumns + ` FROM help_articles WHERE route_key = $1 AND is_published = true`
	a, err := scanHelpArticle(r.pool.QueryRow(ctx, q, routeKey))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return a, err
}

func (r *HelpArticleRepository) RouteTaken(ctx context.Context, routeKey, excludeID string) (bool, error) {
	var exists bool
	if excludeID == "" {
		err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM help_articles WHERE route_key = $1)`, routeKey).Scan(&exists)
		return exists, err
	}
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM help_articles WHERE route_key = $1 AND id <> $2)`, routeKey, excludeID,
	).Scan(&exists)
	return exists, err
}

func (r *HelpArticleRepository) Create(ctx context.Context, a *model.HelpArticle) (*model.HelpArticle, error) {
	const q = `
		INSERT INTO help_articles (title, route_key, body_html, excerpt, is_published, sort_order)
		VALUES ($1,$2,$3,$4,$5,$6)
		RETURNING ` + helpArticleColumns
	return scanHelpArticle(r.pool.QueryRow(ctx, q,
		a.Title, a.RouteKey, a.BodyHTML, a.Excerpt, a.IsPublished, a.SortOrder,
	))
}

func (r *HelpArticleRepository) Update(ctx context.Context, a *model.HelpArticle) (*model.HelpArticle, error) {
	const q = `
		UPDATE help_articles SET
			title = $2,
			route_key = $3,
			body_html = $4,
			excerpt = $5,
			is_published = $6,
			sort_order = $7,
			updated_at = NOW()
		WHERE id = $1
		RETURNING ` + helpArticleColumns
	out, err := scanHelpArticle(r.pool.QueryRow(ctx, q,
		a.ID, a.Title, a.RouteKey, a.BodyHTML, a.Excerpt, a.IsPublished, a.SortOrder,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return out, err
}

func (r *HelpArticleRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM help_articles WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *HelpArticleRepository) CreateImage(ctx context.Context, img *model.HelpImage) (*model.HelpImage, error) {
	const q = `
		INSERT INTO help_images (storage_key, content_type)
		VALUES ($1,$2)
		RETURNING id, storage_key, content_type
	`
	var out model.HelpImage
	err := r.pool.QueryRow(ctx, q, img.StorageKey, img.ContentType).Scan(&out.ID, &out.StorageKey, &out.ContentType)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *HelpArticleRepository) GetImage(ctx context.Context, id string) (*model.HelpImage, error) {
	var out model.HelpImage
	err := r.pool.QueryRow(ctx,
		`SELECT id, storage_key, content_type FROM help_images WHERE id = $1`, id,
	).Scan(&out.ID, &out.StorageKey, &out.ContentType)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &out, err
}

func (r *HelpArticleRepository) scanList(ctx context.Context, q string) ([]model.HelpArticle, error) {
	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.HelpArticle, 0)
	for rows.Next() {
		a, err := scanHelpArticle(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *a)
	}
	return out, rows.Err()
}

type helpArticleScanner interface {
	Scan(dest ...any) error
}

func scanHelpArticle(row helpArticleScanner) (*model.HelpArticle, error) {
	var a model.HelpArticle
	var createdAt, updatedAt time.Time
	err := row.Scan(
		&a.ID, &a.Title, &a.RouteKey, &a.BodyHTML, &a.Excerpt, &a.IsPublished, &a.SortOrder, &createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}
	a.CreatedAt = createdAt
	a.UpdatedAt = updatedAt
	return &a, nil
}
