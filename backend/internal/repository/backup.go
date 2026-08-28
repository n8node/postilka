package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type BackupRepository struct {
	pool *pgxpool.Pool
}

func NewBackupRepository(pool *pgxpool.Pool) *BackupRepository {
	return &BackupRepository{pool: pool}
}

func (r *BackupRepository) GetSettings(ctx context.Context) (*model.BackupSettings, error) {
	const q = `
		SELECT enabled, frequency, hour, minute, weekday, retain_count, next_run_at, updated_at
		FROM platform_backup_settings
		WHERE id = 1
	`
	var s model.BackupSettings
	err := r.pool.QueryRow(ctx, q).Scan(
		&s.Enabled, &s.Frequency, &s.Hour, &s.Minute, &s.Weekday, &s.RetainCount, &s.NextRunAt, &s.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *BackupRepository) UpdateSettings(ctx context.Context, s model.BackupSettings) (*model.BackupSettings, error) {
	const q = `
		UPDATE platform_backup_settings
		SET enabled = $1,
		    frequency = $2,
		    hour = $3,
		    minute = $4,
		    weekday = $5,
		    retain_count = $6,
		    next_run_at = $7,
		    updated_at = NOW()
		WHERE id = 1
		RETURNING enabled, frequency, hour, minute, weekday, retain_count, next_run_at, updated_at
	`
	var out model.BackupSettings
	err := r.pool.QueryRow(
		ctx, q,
		s.Enabled, s.Frequency, s.Hour, s.Minute, s.Weekday, s.RetainCount, s.NextRunAt,
	).Scan(
		&out.Enabled, &out.Frequency, &out.Hour, &out.Minute, &out.Weekday, &out.RetainCount, &out.NextRunAt, &out.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *BackupRepository) InsertRun(ctx context.Context, trigger model.BackupTrigger) (*model.BackupRun, error) {
	const q = `
		INSERT INTO platform_backup_runs (trigger, status)
		VALUES ($1, 'queued')
		RETURNING id, trigger, status, s3_key, local_name, size_bytes, media_files, error,
		          started_at, finished_at, created_at
	`
	return scanBackupRun(r.pool.QueryRow(ctx, q, trigger))
}

func (r *BackupRepository) HasActiveRun(ctx context.Context) (bool, error) {
	const q = `
		SELECT EXISTS (
			SELECT 1 FROM platform_backup_runs WHERE status IN ('queued', 'running')
		)
	`
	var exists bool
	if err := r.pool.QueryRow(ctx, q).Scan(&exists); err != nil {
		return false, err
	}
	return exists, nil
}

func (r *BackupRepository) FailStuckRuns(ctx context.Context, olderThan time.Duration) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE platform_backup_runs
		SET status = 'failed',
		    error = 'Прервано: бекап завис',
		    finished_at = NOW()
		WHERE status = 'running'
		  AND started_at IS NOT NULL
		  AND started_at < $1
	`, time.Now().Add(-olderThan))
	return err
}

func (r *BackupRepository) ClaimNextQueued(ctx context.Context) (*model.BackupRun, error) {
	const q = `
		WITH next AS (
			SELECT id
			FROM platform_backup_runs
			WHERE status = 'queued'
			ORDER BY created_at
			LIMIT 1
			FOR UPDATE SKIP LOCKED
		)
		UPDATE platform_backup_runs r
		SET status = 'running', started_at = NOW()
		FROM next
		WHERE r.id = next.id
		RETURNING r.id, r.trigger, r.status, r.s3_key, r.local_name, r.size_bytes, r.media_files, r.error,
		          r.started_at, r.finished_at, r.created_at
	`
	run, err := scanBackupRun(r.pool.QueryRow(ctx, q))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return run, err
}

func (r *BackupRepository) FinishRun(ctx context.Context, id string, status model.BackupRunStatus, s3Key, localName, errMsg string, sizeBytes int64, mediaFiles int) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE platform_backup_runs
		SET status = $2,
		    s3_key = $3,
		    local_name = $4,
		    error = $5,
		    size_bytes = $6,
		    media_files = $7,
		    finished_at = NOW()
		WHERE id = $1
	`, id, status, s3Key, localName, errMsg, sizeBytes, mediaFiles)
	return err
}

func (r *BackupRepository) ListRuns(ctx context.Context, limit int) ([]model.BackupRun, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, trigger, status, s3_key, local_name, size_bytes, media_files, error,
		       started_at, finished_at, created_at
		FROM platform_backup_runs
		ORDER BY created_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []model.BackupRun
	for rows.Next() {
		run, err := scanBackupRun(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *run)
	}
	return out, rows.Err()
}

func (r *BackupRepository) GetRun(ctx context.Context, id string) (*model.BackupRun, error) {
	run, err := scanBackupRun(r.pool.QueryRow(ctx, `
		SELECT id, trigger, status, s3_key, local_name, size_bytes, media_files, error,
		       started_at, finished_at, created_at
		FROM platform_backup_runs
		WHERE id = $1
	`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return run, err
}

func (r *BackupRepository) ListMediaManifest(ctx context.Context) ([]model.MediaManifestFile, error) {
	var out []model.MediaManifestFile
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, workspace_id::text, name, mime_type, size, s3_key, 'workspace_file'
		FROM workspace_files
		WHERE deleted_at IS NULL AND s3_key <> ''
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var f model.MediaManifestFile
		if err := rows.Scan(&f.ID, &f.WorkspaceID, &f.Name, &f.MimeType, &f.Size, &f.S3Key, &f.Kind); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	genRows, err := r.pool.Query(ctx, `
		SELECT id::text, workspace_id::text, COALESCE(result_s3_key, ''), 'ai_generation'
		FROM ai_generations
		WHERE COALESCE(result_s3_key, '') <> ''
	`)
	if err != nil {
		return out, nil
	}
	defer genRows.Close()
	for genRows.Next() {
		var f model.MediaManifestFile
		if err := genRows.Scan(&f.ID, &f.WorkspaceID, &f.S3Key, &f.Kind); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, genRows.Err()
}

type backupRow interface {
	Scan(dest ...any) error
}

func scanBackupRun(row backupRow) (*model.BackupRun, error) {
	var run model.BackupRun
	err := row.Scan(
		&run.ID, &run.Trigger, &run.Status, &run.S3Key, &run.LocalName, &run.SizeBytes, &run.MediaFiles, &run.Error,
		&run.StartedAt, &run.FinishedAt, &run.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &run, nil
}
