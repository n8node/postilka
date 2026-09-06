package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type UsageRepository struct {
	pool *pgxpool.Pool
}

func NewUsageRepository(pool *pgxpool.Pool) *UsageRepository {
	return &UsageRepository{pool: pool}
}

func (r *UsageRepository) Record(ctx context.Context, workspaceID, metric string, quantity int, periodStart time.Time) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO usage_events (workspace_id, metric, quantity, period_start)
		VALUES ($1, $2, $3, $4::date)
	`, workspaceID, metric, quantity, periodStart.Format("2006-01-02"))
	return err
}

func (r *UsageRepository) RecordAIGeneration(ctx context.Context, workspaceID, generationID, metric string, quantity int, periodStart time.Time) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO usage_events (workspace_id, metric, quantity, period_start, reference_type, reference_id)
		VALUES ($1, $2, $3, $4::date, 'ai_generation', $5)
		ON CONFLICT (reference_type, reference_id, metric) DO NOTHING
	`, workspaceID, metric, quantity, periodStart.Format("2006-01-02"), generationID)
	return err
}

func (r *UsageRepository) SumForPeriod(ctx context.Context, workspaceID, metric string, periodStart time.Time) (int, error) {
	var total int
	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(quantity), 0)
		FROM usage_events
		WHERE workspace_id = $1 AND metric = $2 AND period_start = $3::date
	`, workspaceID, metric, periodStart.Format("2006-01-02")).Scan(&total)
	return total, err
}
