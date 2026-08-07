package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type PublicPageRepository struct {
	pool *pgxpool.Pool
}

func NewPublicPageRepository(pool *pgxpool.Pool) *PublicPageRepository {
	return &PublicPageRepository{pool: pool}
}

const publicPageColumns = `
	id, title, slug, meta_description, external_url, category, provider,
	is_published, sort_order, created_at, updated_at
`

func (r *PublicPageRepository) List(ctx context.Context) ([]model.PublicPage, error) {
	q := `SELECT ` + publicPageColumns + ` FROM public_pages ORDER BY sort_order ASC, title ASC`
	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.PublicPage, 0)
	for rows.Next() {
		p, err := scanPublicPage(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *p)
	}
	return out, rows.Err()
}

func (r *PublicPageRepository) GetByID(ctx context.Context, id string) (*model.PublicPage, error) {
	q := `SELECT ` + publicPageColumns + ` FROM public_pages WHERE id = $1`
	p, err := scanPublicPage(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return p, err
}

func (r *PublicPageRepository) Create(ctx context.Context, p *model.PublicPage) (*model.PublicPage, error) {
	const q = `
		INSERT INTO public_pages (
			title, slug, meta_description, external_url, category, provider,
			is_published, sort_order
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING ` + publicPageColumns
	return scanPublicPage(r.pool.QueryRow(ctx, q,
		p.Title, p.Slug, p.MetaDescription, p.ExternalURL, p.Category, p.Provider,
		p.IsPublished, p.SortOrder,
	))
}

func (r *PublicPageRepository) Update(ctx context.Context, p *model.PublicPage) (*model.PublicPage, error) {
	const q = `
		UPDATE public_pages SET
			title = $2,
			slug = $3,
			meta_description = $4,
			external_url = $5,
			category = $6,
			provider = $7,
			is_published = $8,
			sort_order = $9,
			updated_at = NOW()
		WHERE id = $1
		RETURNING ` + publicPageColumns
	out, err := scanPublicPage(r.pool.QueryRow(ctx, q,
		p.ID, p.Title, p.Slug, p.MetaDescription, p.ExternalURL, p.Category, p.Provider,
		p.IsPublished, p.SortOrder,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return out, err
}

func (r *PublicPageRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM public_pages WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PublicPageRepository) SlugExists(ctx context.Context, slug string, excludeID string) (bool, error) {
	var exists bool
	if excludeID == "" {
		err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM public_pages WHERE slug = $1)`, slug).Scan(&exists)
		return exists, err
	}
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM public_pages WHERE slug = $1 AND id <> $2)`, slug, excludeID,
	).Scan(&exists)
	return exists, err
}

type publicPageScanner interface {
	Scan(dest ...any) error
}

func scanPublicPage(row publicPageScanner) (*model.PublicPage, error) {
	var p model.PublicPage
	var createdAt, updatedAt time.Time
	err := row.Scan(
		&p.ID, &p.Title, &p.Slug, &p.MetaDescription, &p.ExternalURL, &p.Category, &p.Provider,
		&p.IsPublished, &p.SortOrder, &createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}
	p.CreatedAt = createdAt
	p.UpdatedAt = updatedAt
	return &p, nil
}

func NormalizePublicPageSlug(raw string) string {
	s := strings.ToLower(strings.TrimSpace(raw))
	var b strings.Builder
	prevDash := false
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			prevDash = false
			continue
		}
		if r == '/' {
			if !prevDash && b.Len() > 0 {
				b.WriteByte('/')
			}
			prevDash = false
			continue
		}
		if !prevDash {
			b.WriteByte('-')
			prevDash = true
		}
	}
	out := strings.Trim(b.String(), "-/")
	if out == "" {
		return fmt.Sprintf("page-%d", time.Now().Unix()%100000)
	}
	return out
}
