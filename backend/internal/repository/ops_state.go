package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OpsStateRepository struct {
	pool *pgxpool.Pool
}

func NewOpsStateRepository(pool *pgxpool.Pool) *OpsStateRepository {
	return &OpsStateRepository{pool: pool}
}

func (r *OpsStateRepository) TouchWorkerHeartbeat(ctx context.Context) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE platform_ops_state
		SET worker_heartbeat_at = NOW(), updated_at = NOW()
		WHERE id = 1
	`)
	return err
}

func (r *OpsStateRepository) WorkerHeartbeatAt(ctx context.Context) (*time.Time, error) {
	var at *time.Time
	err := r.pool.QueryRow(ctx, `
		SELECT worker_heartbeat_at
		FROM platform_ops_state
		WHERE id = 1
	`).Scan(&at)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return at, nil
}

func (r *OpsStateRepository) TryClaimDigest(ctx context.Context, day time.Time) (bool, error) {
	tag, err := r.pool.Exec(ctx, `
		UPDATE platform_ops_state
		SET digest_last_sent_on = $1, updated_at = NOW()
		WHERE id = 1
		  AND (digest_last_sent_on IS NULL OR digest_last_sent_on < $1)
	`, day)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func (r *OpsStateRepository) ClearDigestClaim(ctx context.Context, day time.Time) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE platform_ops_state
		SET digest_last_sent_on = NULL, updated_at = NOW()
		WHERE id = 1 AND digest_last_sent_on = $1
	`, day)
	return err
}
