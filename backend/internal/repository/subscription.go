package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type SubscriptionRepository struct {
	pool *pgxpool.Pool
}

func NewSubscriptionRepository(pool *pgxpool.Pool) *SubscriptionRepository {
	return &SubscriptionRepository{pool: pool}
}

const subscriptionColumns = `
	id, workspace_id, plan_id, billing_period, period_start, period_end,
	base_amount_cents, auto_renew, status, last_checkout_id, created_at, updated_at
`

func (r *SubscriptionRepository) GetActiveForWorkspace(ctx context.Context, workspaceID string) (*model.WorkspaceSubscription, error) {
	const q = `
		SELECT ` + subscriptionColumns + `
		FROM workspace_subscriptions
		WHERE workspace_id = $1 AND status IN ('active', 'past_due')
		ORDER BY created_at DESC
		LIMIT 1
	`
	s, err := r.scan(r.pool.QueryRow(ctx, q, workspaceID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return s, err
}

func (r *SubscriptionRepository) UpsertActive(ctx context.Context, sub *model.WorkspaceSubscription) (*model.WorkspaceSubscription, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `
		UPDATE workspace_subscriptions
		SET status = 'cancelled', updated_at = NOW()
		WHERE workspace_id = $1 AND status IN ('active', 'past_due')
	`, sub.WorkspaceID)
	if err != nil {
		return nil, err
	}

	const insertQ = `
		INSERT INTO workspace_subscriptions (
			workspace_id, plan_id, billing_period, period_start, period_end,
			base_amount_cents, auto_renew, status, last_checkout_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING ` + subscriptionColumns
	out, err := r.scan(tx.QueryRow(ctx, insertQ,
		sub.WorkspaceID, sub.PlanID, sub.BillingPeriod, sub.PeriodStart, sub.PeriodEnd,
		sub.BaseAmountCents, sub.AutoRenew, sub.Status, sub.LastCheckoutID,
	))
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *SubscriptionRepository) UpdatePeriod(ctx context.Context, id string, periodStart, periodEnd time.Time, baseAmountCents int, checkoutID *string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE workspace_subscriptions
		SET period_start = $2, period_end = $3, base_amount_cents = $4,
		    last_checkout_id = $5, status = 'active', updated_at = NOW()
		WHERE id = $1
	`, id, periodStart, periodEnd, baseAmountCents, checkoutID)
	return err
}

func (r *SubscriptionRepository) SetAutoRenew(ctx context.Context, workspaceID string, autoRenew bool) (*model.WorkspaceSubscription, error) {
	const q = `
		UPDATE workspace_subscriptions
		SET auto_renew = $2, updated_at = NOW()
		WHERE workspace_id = $1 AND status IN ('active', 'past_due')
		RETURNING ` + subscriptionColumns
	s, err := r.scan(r.pool.QueryRow(ctx, q, workspaceID, autoRenew))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return s, err
}

func (r *SubscriptionRepository) SetStatus(ctx context.Context, id string, status model.SubscriptionStatus) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE workspace_subscriptions SET status = $2, updated_at = NOW() WHERE id = $1
	`, id, status)
	return err
}

func (r *SubscriptionRepository) CancelForWorkspace(ctx context.Context, workspaceID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE workspace_subscriptions
		SET status = 'cancelled', auto_renew = false, updated_at = NOW()
		WHERE workspace_id = $1 AND status IN ('active', 'past_due')
	`, workspaceID)
	return err
}

func (r *SubscriptionRepository) ListDueForRenewal(ctx context.Context, before time.Time, limit int) ([]model.WorkspaceSubscription, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := r.pool.Query(ctx, `
		SELECT `+subscriptionColumns+`
		FROM workspace_subscriptions
		WHERE status IN ('active', 'past_due')
		  AND auto_renew = true
		  AND period_end <= $1
		ORDER BY period_end ASC
		LIMIT $2
	`, before, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.WorkspaceSubscription, 0)
	for rows.Next() {
		s, err := r.scan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *s)
	}
	return out, rows.Err()
}

func (r *SubscriptionRepository) ListEndingBetween(ctx context.Context, from, to time.Time, limit int) ([]model.WorkspaceSubscription, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := r.pool.Query(ctx, `
		SELECT `+subscriptionColumns+`
		FROM workspace_subscriptions
		WHERE status IN ('active', 'past_due')
		  AND period_end > $1
		  AND period_end <= $2
		ORDER BY period_end ASC
		LIMIT $3
	`, from, to, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.WorkspaceSubscription, 0)
	for rows.Next() {
		s, err := r.scan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *s)
	}
	return out, rows.Err()
}

func (r *SubscriptionRepository) scan(row pgx.Row) (*model.WorkspaceSubscription, error) {
	var s model.WorkspaceSubscription
	err := row.Scan(
		&s.ID, &s.WorkspaceID, &s.PlanID, &s.BillingPeriod, &s.PeriodStart, &s.PeriodEnd,
		&s.BaseAmountCents, &s.AutoRenew, &s.Status, &s.LastCheckoutID, &s.CreatedAt, &s.UpdatedAt,
	)
	return &s, err
}
