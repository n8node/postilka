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

type PlanRepository struct {
	pool *pgxpool.Pool
}

func NewPlanRepository(pool *pgxpool.Pool) *PlanRepository {
	return &PlanRepository{pool: pool}
}

const planColumns = `
	id, slug, name, description, is_free, is_active, is_popular,
	price_monthly_cents, price_yearly_cents,
	max_channels, max_posts_per_period, max_seats, storage_bytes, max_file_size_bytes, trash_retention_days,
	ai_text_tokens_quota, ai_media_credits_quota, free_plan_duration_days,
	sort_order, created_at, updated_at
`

func (r *PlanRepository) List(ctx context.Context) ([]model.Plan, error) {
	q := `SELECT ` + planColumns + ` FROM plans ORDER BY sort_order ASC, name ASC`
	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.Plan, 0)
	for rows.Next() {
		p, err := scanPlan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *p)
	}
	return out, rows.Err()
}

func (r *PlanRepository) GetByID(ctx context.Context, id string) (*model.Plan, error) {
	q := `SELECT ` + planColumns + ` FROM plans WHERE id = $1`
	p, err := scanPlan(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return p, err
}

func (r *PlanRepository) GetDefaultFree(ctx context.Context) (*model.Plan, error) {
	q := `
		SELECT ` + planColumns + `
		FROM plans
		WHERE is_free = true AND is_active = true
		ORDER BY sort_order ASC, created_at ASC
		LIMIT 1
	`
	p, err := scanPlan(r.pool.QueryRow(ctx, q))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return p, err
}

func (r *PlanRepository) Create(ctx context.Context, p *model.Plan) (*model.Plan, error) {
	const q = `
		INSERT INTO plans (
			slug, name, description, is_free, is_active, is_popular,
			price_monthly_cents, price_yearly_cents,
			max_channels, max_posts_per_period, max_seats, storage_bytes, max_file_size_bytes, trash_retention_days,
			ai_text_tokens_quota, ai_media_credits_quota, free_plan_duration_days, sort_order
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
		)
		RETURNING ` + planColumns
	return scanPlan(r.pool.QueryRow(ctx, q,
		p.Slug, p.Name, p.Description, p.IsFree, p.IsActive, p.IsPopular,
		p.PriceMonthlyCents, p.PriceYearlyCents,
		p.MaxChannels, p.MaxPostsPerPeriod, p.MaxSeats, p.StorageBytes, p.MaxFileSizeBytes, p.TrashRetentionDays,
		p.AITextTokensQuota, p.AIMediaCreditsQuota, p.FreePlanDurationDays, p.SortOrder,
	))
}

func (r *PlanRepository) Update(ctx context.Context, p *model.Plan) (*model.Plan, error) {
	const q = `
		UPDATE plans SET
			slug = $2,
			name = $3,
			description = $4,
			is_free = $5,
			is_active = $6,
			is_popular = $7,
			price_monthly_cents = $8,
			price_yearly_cents = $9,
			max_channels = $10,
			max_posts_per_period = $11,
			max_seats = $12,
			storage_bytes = $13,
			max_file_size_bytes = $14,
			trash_retention_days = $15,
			ai_text_tokens_quota = $16,
			ai_media_credits_quota = $17,
			free_plan_duration_days = $18,
			sort_order = $19,
			updated_at = NOW()
		WHERE id = $1
		RETURNING ` + planColumns
	out, err := scanPlan(r.pool.QueryRow(ctx, q,
		p.ID, p.Slug, p.Name, p.Description, p.IsFree, p.IsActive, p.IsPopular,
		p.PriceMonthlyCents, p.PriceYearlyCents,
		p.MaxChannels, p.MaxPostsPerPeriod, p.MaxSeats, p.StorageBytes, p.MaxFileSizeBytes, p.TrashRetentionDays,
		p.AITextTokensQuota, p.AIMediaCreditsQuota, p.FreePlanDurationDays, p.SortOrder,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return out, err
}

func (r *PlanRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM plans WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PlanRepository) CountWorkspaces(ctx context.Context, planID string) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM workspaces WHERE plan_id = $1`, planID).Scan(&n)
	return n, err
}

func (r *PlanRepository) SlugExists(ctx context.Context, slug string, excludeID string) (bool, error) {
	var exists bool
	if excludeID == "" {
		err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM plans WHERE slug = $1)`, slug).Scan(&exists)
		return exists, err
	}
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM plans WHERE slug = $1 AND id <> $2)`, slug, excludeID,
	).Scan(&exists)
	return exists, err
}

type planScanner interface {
	Scan(dest ...any) error
}

func scanPlan(row planScanner) (*model.Plan, error) {
	var p model.Plan
	var createdAt, updatedAt time.Time
	err := row.Scan(
		&p.ID, &p.Slug, &p.Name, &p.Description, &p.IsFree, &p.IsActive, &p.IsPopular,
		&p.PriceMonthlyCents, &p.PriceYearlyCents,
		&p.MaxChannels, &p.MaxPostsPerPeriod, &p.MaxSeats, &p.StorageBytes, &p.MaxFileSizeBytes, &p.TrashRetentionDays,
		&p.AITextTokensQuota, &p.AIMediaCreditsQuota, &p.FreePlanDurationDays,
		&p.SortOrder, &createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}
	p.CreatedAt = createdAt
	p.UpdatedAt = updatedAt
	return &p, nil
}

func NormalizePlanSlug(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	var b strings.Builder
	prevDash := false
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			prevDash = false
			continue
		}
		if !prevDash {
			b.WriteByte('-')
			prevDash = true
		}
	}
	out := strings.Trim(b.String(), "-")
	if out == "" {
		return fmt.Sprintf("plan-%d", time.Now().Unix()%100000)
	}
	return out
}
