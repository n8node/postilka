package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type GenerationNavRepository struct {
	pool *pgxpool.Pool
}

func NewGenerationNavRepository(pool *pgxpool.Pool) *GenerationNavRepository {
	return &GenerationNavRepository{pool: pool}
}

func (r *GenerationNavRepository) GetSettings(ctx context.Context) (model.GenerationNavSettings, error) {
	const q = `
		SELECT title, studio_href, more_href, preview_limit
		FROM generation_nav_settings
		WHERE id = 1
	`
	var out model.GenerationNavSettings
	err := r.pool.QueryRow(ctx, q).Scan(&out.Title, &out.StudioHref, &out.MoreHref, &out.PreviewLimit)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.DefaultGenerationNavSettings(), nil
	}
	return out, err
}

func (r *GenerationNavRepository) UpdateSettings(ctx context.Context, in model.GenerationNavSettings) (model.GenerationNavSettings, error) {
	const q = `
		INSERT INTO generation_nav_settings (id, title, studio_href, more_href, preview_limit, updated_at)
		VALUES (1, $1, $2, $3, $4, NOW())
		ON CONFLICT (id) DO UPDATE
		SET title = EXCLUDED.title,
		    studio_href = EXCLUDED.studio_href,
		    more_href = EXCLUDED.more_href,
		    preview_limit = EXCLUDED.preview_limit,
		    updated_at = NOW()
		RETURNING title, studio_href, more_href, preview_limit
	`
	var out model.GenerationNavSettings
	err := r.pool.QueryRow(ctx, q, in.Title, in.StudioHref, in.MoreHref, in.PreviewLimit).
		Scan(&out.Title, &out.StudioHref, &out.MoreHref, &out.PreviewLimit)
	return out, err
}

func scanNavItem(row interface {
	Scan(dest ...any) error
}) (model.GenerationNavItem, error) {
	var item model.GenerationNavItem
	var s3 *string
	err := row.Scan(
		&item.ID, &item.Title, &item.Subtitle, &item.Href, &item.Position,
		&item.Visible, &item.Featured, &item.IconKind, &item.IconName, &s3,
		&item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return item, err
	}
	if s3 != nil {
		item.S3Key = *s3
	}
	if item.IconKind == model.GenerationNavIconUpload && item.S3Key != "" {
		item.IconURL = model.GenerationNavIconAPIPath(item.ID, item.UpdatedAt)
	}
	return item, nil
}

func (r *GenerationNavRepository) List(ctx context.Context, visibleOnly bool) ([]model.GenerationNavItem, error) {
	q := `
		SELECT id, title, subtitle, href, position, visible, featured, icon_kind, icon_name, s3_key, created_at, updated_at
		FROM generation_nav_items
	`
	if visibleOnly {
		q += ` WHERE visible = TRUE`
	}
	q += ` ORDER BY position ASC, created_at ASC`
	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []model.GenerationNavItem
	for rows.Next() {
		item, err := scanNavItem(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *GenerationNavRepository) Get(ctx context.Context, id string) (*model.GenerationNavItem, error) {
	const q = `
		SELECT id, title, subtitle, href, position, visible, featured, icon_kind, icon_name, s3_key, created_at, updated_at
		FROM generation_nav_items
		WHERE id = $1
	`
	item, err := scanNavItem(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *GenerationNavRepository) Create(ctx context.Context, item model.GenerationNavItem) (*model.GenerationNavItem, error) {
	const q = `
		INSERT INTO generation_nav_items (title, subtitle, href, position, visible, featured, icon_kind, icon_name)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, title, subtitle, href, position, visible, featured, icon_kind, icon_name, s3_key, created_at, updated_at
	`
	out, err := scanNavItem(r.pool.QueryRow(ctx, q,
		item.Title, item.Subtitle, item.Href, item.Position, item.Visible, item.Featured, item.IconKind, item.IconName,
	))
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *GenerationNavRepository) Update(ctx context.Context, id string, item model.GenerationNavItem) (*model.GenerationNavItem, error) {
	const q = `
		UPDATE generation_nav_items
		SET title = $2, subtitle = $3, href = $4, position = $5, visible = $6, featured = $7,
		    icon_kind = $8, icon_name = $9, updated_at = NOW()
		WHERE id = $1
		RETURNING id, title, subtitle, href, position, visible, featured, icon_kind, icon_name, s3_key, created_at, updated_at
	`
	out, err := scanNavItem(r.pool.QueryRow(ctx, q, id,
		item.Title, item.Subtitle, item.Href, item.Position, item.Visible, item.Featured, item.IconKind, item.IconName,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *GenerationNavRepository) UpdateIcon(ctx context.Context, id, kind, name, s3Key string) (*model.GenerationNavItem, error) {
	const q = `
		UPDATE generation_nav_items
		SET icon_kind = $2, icon_name = $3, s3_key = NULLIF($4, ''), updated_at = NOW()
		WHERE id = $1
		RETURNING id, title, subtitle, href, position, visible, featured, icon_kind, icon_name, s3_key, created_at, updated_at
	`
	out, err := scanNavItem(r.pool.QueryRow(ctx, q, id, kind, name, s3Key))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *GenerationNavRepository) Delete(ctx context.Context, id string) (string, error) {
	const q = `DELETE FROM generation_nav_items WHERE id = $1 RETURNING COALESCE(s3_key, '')`
	var key string
	err := r.pool.QueryRow(ctx, q, id).Scan(&key)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return key, err
}

func (r *GenerationNavRepository) Reorder(ctx context.Context, ids []string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	const q = `UPDATE generation_nav_items SET position = $2, updated_at = NOW() WHERE id = $1`
	for i, id := range ids {
		if _, err := tx.Exec(ctx, q, id, i); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *GenerationNavRepository) NextPosition(ctx context.Context) (int, error) {
	const q = `SELECT COALESCE(MAX(position), -1) + 1 FROM generation_nav_items`
	var n int
	err := r.pool.QueryRow(ctx, q).Scan(&n)
	return n, err
}
