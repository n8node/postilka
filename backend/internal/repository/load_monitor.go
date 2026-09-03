package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type LoadMonitorRepository struct {
	pool *pgxpool.Pool
}

func NewLoadMonitorRepository(pool *pgxpool.Pool) *LoadMonitorRepository {
	return &LoadMonitorRepository{pool: pool}
}

func (r *LoadMonitorRepository) InsertSnapshot(ctx context.Context, s model.LoadSnapshot) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO platform_load_snapshots (
			collected_at, publish_backlog, posts_due_next_hour, gen_jobs_active,
			workflow_runs_running, db_pool_max, db_pool_acquired, worker_heartbeat_age_sec
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`,
		s.CollectedAt,
		s.PublishBacklog,
		s.PostsDueNextHour,
		s.GenJobsActive,
		s.WorkflowRunsRunning,
		s.DBPoolMax,
		s.DBPoolAcquired,
		s.WorkerHeartbeatAgeSec,
	)
	return err
}

func (r *LoadMonitorRepository) LatestSnapshotAt(ctx context.Context) (*time.Time, error) {
	var at *time.Time
	err := r.pool.QueryRow(ctx, `
		SELECT collected_at FROM platform_load_snapshots
		ORDER BY collected_at DESC
		LIMIT 1
	`).Scan(&at)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return at, nil
}

func (r *LoadMonitorRepository) ListDailyAggregates(ctx context.Context, days int) ([]model.LoadDailyAggregate, error) {
	if days <= 0 {
		days = 14
	}
	rows, err := r.pool.Query(ctx, `
		SELECT
			date_trunc('day', collected_at AT TIME ZONE 'Europe/Moscow') AS day,
			COALESCE(AVG(publish_backlog), 0),
			COALESCE(MAX(publish_backlog), 0),
			COALESCE(AVG(gen_jobs_active), 0),
			COALESCE(MAX(gen_jobs_active), 0),
			COALESCE(AVG(
				CASE WHEN db_pool_max > 0
					THEN db_pool_acquired::float / db_pool_max::float
					ELSE 0
				END
			), 0)
		FROM platform_load_snapshots
		WHERE collected_at >= NOW() - ($1::int * INTERVAL '1 day')
		GROUP BY 1
		ORDER BY 1 ASC
	`, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.LoadDailyAggregate, 0)
	for rows.Next() {
		var item model.LoadDailyAggregate
		if err := rows.Scan(
			&item.Day,
			&item.AvgPublishBacklog,
			&item.MaxPublishBacklog,
			&item.AvgGenJobsActive,
			&item.MaxGenJobsActive,
			&item.AvgDBPoolUtil,
		); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *LoadMonitorRepository) PruneOlderThan(ctx context.Context, days int) error {
	if days <= 0 {
		days = 30
	}
	_, err := r.pool.Exec(ctx, `
		DELETE FROM platform_load_snapshots
		WHERE collected_at < NOW() - ($1::int * INTERVAL '1 day')
	`, days)
	return err
}

func (r *LoadMonitorRepository) CountActiveGenerationJobs(ctx context.Context) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)::int FROM ai_generation_jobs
		WHERE status IN ('preparing', 'waiting', 'queuing', 'generating')
	`).Scan(&n)
	return n, err
}

func (r *LoadMonitorRepository) CountRunningWorkflowRuns(ctx context.Context) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)::int FROM workflow_runs
		WHERE status = 'running'
	`).Scan(&n)
	return n, err
}

func (r *LoadMonitorRepository) CountPostsDueNextHour(ctx context.Context) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)::int FROM posts
		WHERE status = 'scheduled'
		  AND due_at IS NOT NULL
		  AND due_at <= NOW() + INTERVAL '1 hour'
	`).Scan(&n)
	return n, err
}
