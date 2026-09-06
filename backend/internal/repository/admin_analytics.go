package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type AdminAnalyticsRepository struct {
	pool *pgxpool.Pool
}

func NewAdminAnalyticsRepository(pool *pgxpool.Pool) *AdminAnalyticsRepository {
	return &AdminAnalyticsRepository{pool: pool}
}

func (r *AdminAnalyticsRepository) Overview(ctx context.Context, from, to time.Time) (*model.AdminAnalyticsOverview, error) {
	out := &model.AdminAnalyticsOverview{
		DailyRegistrations: []model.AdminAnalyticsDailyCount{},
		DailyAIGenerations: []model.AdminAnalyticsDailyAI{},
		DailyTopups:        []model.AdminAnalyticsDailyMoney{},
		DailyCheckouts:     []model.AdminAnalyticsDailyMoney{},
		DailyNewFiles:      []model.AdminAnalyticsDailyCount{},
		AIByMode:           []model.AdminAnalyticsBreakdown{},
		ChannelsByProvider: []model.AdminAnalyticsBreakdown{},
		FilesByType:        []model.AdminAnalyticsBreakdownBytes{},
	}

	err := r.pool.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM users),
			(SELECT COUNT(*) FROM users WHERE created_at >= $1 AND created_at <= $2),
			(SELECT COUNT(*) FROM workspaces),
			(SELECT COUNT(*) FROM channels),
			(SELECT COUNT(*) FROM channels WHERE status = 'active'),
			(SELECT COUNT(*) FROM workspace_files WHERE deleted_at IS NULL),
			(SELECT COALESCE(SUM(size), 0) FROM workspace_files WHERE deleted_at IS NULL),
			(SELECT COALESCE(SUM(size), 0) FROM workspace_files WHERE deleted_at IS NOT NULL)
	`, from, to).Scan(
		&out.UsersTotal, &out.UsersNew, &out.WorkspacesTotal,
		&out.ChannelsTotal, &out.ChannelsActive,
		&out.FilesTotal, &out.StorageBytes, &out.TrashBytes,
	)
	if err != nil {
		return nil, err
	}

	if err := r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE status = 'succeeded'),
			COUNT(*) FILTER (WHERE status = 'failed'),
			COALESCE(SUM(credit_cost) FILTER (WHERE status = 'succeeded'), 0),
			COALESCE(SUM(wallet_cents_charged) FILTER (WHERE status = 'succeeded'), 0)
		FROM ai_generation_jobs
		WHERE created_at >= $1 AND created_at <= $2
	`, from, to).Scan(
		&out.AIGenerationsTotal, &out.AIGenerationsSucceeded, &out.AIGenerationsFailed,
		&out.AICreditsSpent, &out.AIWalletCentsSpent,
	); err != nil {
		return nil, fmt.Errorf("admin analytics ai totals: %w", err)
	}

	if err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount_cents), 0)
		FROM wallet_topups
		WHERE status = 'paid' AND paid_at >= $1 AND paid_at <= $2
	`, from, to).Scan(&out.TopupsCents); err != nil {
		return nil, fmt.Errorf("admin analytics topups: %w", err)
	}

	if err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount_cents), 0)
		FROM plan_checkouts
		WHERE status = 'paid' AND paid_at >= $1 AND paid_at <= $2
	`, from, to).Scan(&out.CheckoutsCents); err != nil {
		return nil, fmt.Errorf("admin analytics checkouts: %w", err)
	}

	if out.DailyRegistrations, err = r.dailyCounts(ctx, `
		SELECT to_char(d::date, 'YYYY-MM-DD'), COALESCE(c.cnt, 0)
		FROM generate_series($1::date, $2::date, '1 day') d
		LEFT JOIN (
			SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS cnt
			FROM users WHERE created_at >= $1 AND created_at <= $2
			GROUP BY 1
		) c ON c.day = d::date
		ORDER BY d
	`, from, to); err != nil {
		return nil, fmt.Errorf("admin analytics daily registrations: %w", err)
	}

	if out.DailyAIGenerations, err = r.dailyAI(ctx, from, to); err != nil {
		return nil, fmt.Errorf("admin analytics daily ai: %w", err)
	}

	if out.DailyTopups, err = r.dailyMoney(ctx, `
		SELECT to_char(d::date, 'YYYY-MM-DD'), COALESCE(t.amount, 0), COALESCE(t.cnt, 0)
		FROM generate_series($1::date, $2::date, '1 day') d
		LEFT JOIN (
			SELECT date_trunc('day', paid_at)::date AS day,
				SUM(amount_cents)::int AS amount, COUNT(*)::int AS cnt
			FROM wallet_topups
			WHERE status = 'paid' AND paid_at >= $1 AND paid_at <= $2
			GROUP BY 1
		) t ON t.day = d::date
		ORDER BY d
	`, from, to); err != nil {
		return nil, fmt.Errorf("admin analytics daily topups: %w", err)
	}

	if out.DailyCheckouts, err = r.dailyMoney(ctx, `
		SELECT to_char(d::date, 'YYYY-MM-DD'), COALESCE(t.amount, 0), COALESCE(t.cnt, 0)
		FROM generate_series($1::date, $2::date, '1 day') d
		LEFT JOIN (
			SELECT date_trunc('day', paid_at)::date AS day,
				SUM(amount_cents)::int AS amount, COUNT(*)::int AS cnt
			FROM plan_checkouts
			WHERE status = 'paid' AND paid_at >= $1 AND paid_at <= $2
			GROUP BY 1
		) t ON t.day = d::date
		ORDER BY d
	`, from, to); err != nil {
		return nil, fmt.Errorf("admin analytics daily checkouts: %w", err)
	}

	if out.DailyNewFiles, err = r.dailyCounts(ctx, `
		SELECT to_char(d::date, 'YYYY-MM-DD'), COALESCE(c.cnt, 0)
		FROM generate_series($1::date, $2::date, '1 day') d
		LEFT JOIN (
			SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS cnt
			FROM workspace_files WHERE created_at >= $1 AND created_at <= $2
			GROUP BY 1
		) c ON c.day = d::date
		ORDER BY d
	`, from, to); err != nil {
		return nil, fmt.Errorf("admin analytics daily files: %w", err)
	}

	if out.AIByMode, err = r.breakdown(ctx, `
		SELECT mode, COUNT(*)::int FROM ai_generation_jobs
		WHERE status = 'succeeded' AND created_at >= $1 AND created_at <= $2
		GROUP BY mode ORDER BY COUNT(*) DESC
	`, from, to); err != nil {
		return nil, fmt.Errorf("admin analytics ai modes: %w", err)
	}

	if out.ChannelsByProvider, err = r.breakdownStatic(ctx, `
		SELECT provider, COUNT(*)::int FROM channels GROUP BY provider ORDER BY COUNT(*) DESC
	`); err != nil {
		return nil, fmt.Errorf("admin analytics channels: %w", err)
	}

	if out.FilesByType, err = r.filesByType(ctx); err != nil {
		return nil, fmt.Errorf("admin analytics file types: %w", err)
	}

	return out, nil
}

func (r *AdminAnalyticsRepository) dailyCounts(ctx context.Context, q string, from, to time.Time) ([]model.AdminAnalyticsDailyCount, error) {
	rows, err := r.pool.Query(ctx, q, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []model.AdminAnalyticsDailyCount
	for rows.Next() {
		var item model.AdminAnalyticsDailyCount
		if err := rows.Scan(&item.Date, &item.Count); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *AdminAnalyticsRepository) dailyMoney(ctx context.Context, q string, from, to time.Time) ([]model.AdminAnalyticsDailyMoney, error) {
	rows, err := r.pool.Query(ctx, q, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []model.AdminAnalyticsDailyMoney
	for rows.Next() {
		var item model.AdminAnalyticsDailyMoney
		if err := rows.Scan(&item.Date, &item.AmountCents, &item.Count); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *AdminAnalyticsRepository) dailyAI(ctx context.Context, from, to time.Time) ([]model.AdminAnalyticsDailyAI, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			to_char(d::date, 'YYYY-MM-DD'),
			COALESCE(j.total, 0),
			COALESCE(j.succeeded, 0),
			COALESCE(j.failed, 0),
			COALESCE(j.credits, 0),
			COALESCE(j.quota, 0),
			COALESCE(j.wallet, 0)
		FROM generate_series($1::date, $2::date, '1 day') d
		LEFT JOIN (
			SELECT date_trunc('day', created_at)::date AS day,
				COUNT(*)::int AS total,
				COUNT(*) FILTER (WHERE status = 'succeeded')::int AS succeeded,
				COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
				COALESCE(SUM(credit_cost) FILTER (WHERE status = 'succeeded'), 0)::int AS credits,
				COALESCE(SUM(quota_credits_used) FILTER (WHERE status = 'succeeded'), 0)::int AS quota,
				COALESCE(SUM(wallet_cents_charged) FILTER (WHERE status = 'succeeded'), 0)::int AS wallet
			FROM ai_generation_jobs
			WHERE created_at >= $1 AND created_at <= $2
			GROUP BY 1
		) j ON j.day = d::date
		ORDER BY d
	`, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []model.AdminAnalyticsDailyAI
	for rows.Next() {
		var item model.AdminAnalyticsDailyAI
		if err := rows.Scan(
			&item.Date, &item.Total, &item.Succeeded, &item.Failed,
			&item.Credits, &item.QuotaCredits, &item.WalletCents,
		); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *AdminAnalyticsRepository) breakdown(ctx context.Context, q string, from, to time.Time) ([]model.AdminAnalyticsBreakdown, error) {
	rows, err := r.pool.Query(ctx, q, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []model.AdminAnalyticsBreakdown
	for rows.Next() {
		var item model.AdminAnalyticsBreakdown
		if err := rows.Scan(&item.Label, &item.Count); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *AdminAnalyticsRepository) breakdownStatic(ctx context.Context, q string) ([]model.AdminAnalyticsBreakdown, error) {
	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []model.AdminAnalyticsBreakdown
	for rows.Next() {
		var item model.AdminAnalyticsBreakdown
		if err := rows.Scan(&item.Label, &item.Count); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *AdminAnalyticsRepository) filesByType(ctx context.Context) ([]model.AdminAnalyticsBreakdownBytes, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			CASE
				WHEN mime_type LIKE 'image/%' THEN 'image'
				WHEN mime_type LIKE 'video/%' THEN 'video'
				WHEN mime_type LIKE 'audio/%' THEN 'audio'
				ELSE 'other'
			END AS kind,
			COALESCE(SUM(size), 0)::bigint,
			COUNT(*)::int
		FROM workspace_files
		WHERE deleted_at IS NULL
		GROUP BY 1
		ORDER BY SUM(size) DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []model.AdminAnalyticsBreakdownBytes
	for rows.Next() {
		var item model.AdminAnalyticsBreakdownBytes
		if err := rows.Scan(&item.Label, &item.Bytes, &item.Count); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}
