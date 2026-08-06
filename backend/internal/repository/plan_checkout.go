package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type PlanCheckoutRepository struct {
	pool *pgxpool.Pool
}

func NewPlanCheckoutRepository(pool *pgxpool.Pool) *PlanCheckoutRepository {
	return &PlanCheckoutRepository{pool: pool}
}

func (r *PlanCheckoutRepository) Create(
	ctx context.Context,
	userID, workspaceID, planID, provider string,
	period model.BillingPeriod,
	amountCents int,
) (*model.PlanCheckout, error) {
	const q = `
		INSERT INTO plan_checkouts (user_id, workspace_id, plan_id, provider, billing_period, amount_cents, status)
		VALUES ($1, $2, $3, $4, $5, $6, 'pending')
		RETURNING id, user_id, workspace_id, plan_id, provider, billing_period, amount_cents, status,
		          external_id, inv_id, created_at, paid_at
	`
	return r.scan(r.pool.QueryRow(ctx, q, userID, workspaceID, planID, provider, period, amountCents))
}

func (r *PlanCheckoutRepository) NextInvID(ctx context.Context) (int64, error) {
	var id int64
	err := r.pool.QueryRow(ctx, `SELECT nextval('billing_inv_id_seq')`).Scan(&id)
	return id, err
}

func (r *PlanCheckoutRepository) SetExternal(ctx context.Context, id, externalID string, invID *int64) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE plan_checkouts SET external_id = $2, inv_id = $3 WHERE id = $1
	`, id, externalID, invID)
	return err
}

func (r *PlanCheckoutRepository) GetByID(ctx context.Context, id string) (*model.PlanCheckout, error) {
	const q = `
		SELECT id, user_id, workspace_id, plan_id, provider, billing_period, amount_cents, status,
		       external_id, inv_id, created_at, paid_at
		FROM plan_checkouts WHERE id = $1
	`
	c, err := r.scan(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return c, err
}

func (r *PlanCheckoutRepository) GetByInvID(ctx context.Context, invID int64) (*model.PlanCheckout, error) {
	const q = `
		SELECT id, user_id, workspace_id, plan_id, provider, billing_period, amount_cents, status,
		       external_id, inv_id, created_at, paid_at
		FROM plan_checkouts WHERE inv_id = $1
	`
	c, err := r.scan(r.pool.QueryRow(ctx, q, invID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return c, err
}

func (r *PlanCheckoutRepository) MarkPaid(ctx context.Context, id string) (*model.PlanCheckout, error) {
	const q = `
		UPDATE plan_checkouts
		SET status = 'paid', paid_at = NOW()
		WHERE id = $1 AND status = 'pending'
		RETURNING id, user_id, workspace_id, plan_id, provider, billing_period, amount_cents, status,
		          external_id, inv_id, created_at, paid_at
	`
	c, err := r.scan(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return r.GetByID(ctx, id)
	}
	return c, err
}

func (r *PlanCheckoutRepository) ListForUser(ctx context.Context, userID string, limit int) ([]model.PlanCheckout, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	const q = `
		SELECT id, user_id, workspace_id, plan_id, provider, billing_period, amount_cents, status,
		       external_id, inv_id, created_at, paid_at
		FROM plan_checkouts
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, q, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.PlanCheckout, 0)
	for rows.Next() {
		c, err := r.scan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}

func (r *PlanCheckoutRepository) scan(row pgx.Row) (*model.PlanCheckout, error) {
	var c model.PlanCheckout
	err := row.Scan(
		&c.ID, &c.UserID, &c.WorkspaceID, &c.PlanID, &c.Provider, &c.BillingPeriod,
		&c.AmountCents, &c.Status, &c.ExternalID, &c.InvID, &c.CreatedAt, &c.PaidAt,
	)
	return &c, err
}
