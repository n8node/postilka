package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type AIGenerationJobRepository struct {
	pool *pgxpool.Pool
}

func NewAIGenerationJobRepository(pool *pgxpool.Pool) *AIGenerationJobRepository {
	return &AIGenerationJobRepository{pool: pool}
}

func (r *AIGenerationJobRepository) Create(ctx context.Context, job model.AIGenerationJob) (model.AIGenerationJob, error) {
	if job.ID == "" {
		job.ID = uuid.NewString()
	}
	combineJSON, err := json.Marshal(job.CombineUploadIDs)
	if err != nil {
		return model.AIGenerationJob{}, err
	}
	err = r.pool.QueryRow(ctx, `
		INSERT INTO ai_generation_jobs (
			id, user_id, workspace_id, kie_task_id, status, kie_state, progress, fail_message,
			mode, prompt, model, aspect_ratio, source_upload_id, combine_upload_ids,
			credit_cost, wallet_cents_charged, generation_id, poll_after, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13, $14,
			$15, $16, $17, $18, now(), now()
		)
		RETURNING created_at, updated_at
	`,
		job.ID, job.UserID, job.WorkspaceID, job.KieTaskID, job.Status, job.KieState, job.Progress, job.FailMessage,
		job.Mode, job.Prompt, job.Model, job.AspectRatio, job.SourceUploadID, combineJSON,
		job.CreditCost, job.WalletCentsCharged, job.GenerationID, job.PollAfter,
	).Scan(&job.CreatedAt, &job.UpdatedAt)
	return job, err
}

func (r *AIGenerationJobRepository) scanJob(row pgx.Row) (model.AIGenerationJob, error) {
	var job model.AIGenerationJob
	var combineRaw []byte
	var genID *string
	err := row.Scan(
		&job.ID, &job.UserID, &job.WorkspaceID, &job.KieTaskID, &job.Status, &job.KieState, &job.Progress, &job.FailMessage,
		&job.Mode, &job.Prompt, &job.Model, &job.AspectRatio, &job.SourceUploadID, &combineRaw,
		&job.CreditCost, &job.WalletCentsCharged, &job.DurationMs, &genID, &job.PollAfter, &job.LastPolledAt, &job.CreatedAt, &job.UpdatedAt,
	)
	if err != nil {
		return model.AIGenerationJob{}, err
	}
	job.GenerationID = genID
	_ = json.Unmarshal(combineRaw, &job.CombineUploadIDs)
	return job, nil
}

func (r *AIGenerationJobRepository) GetByID(ctx context.Context, id, userID string) (model.AIGenerationJob, error) {
	job, err := r.scanJob(r.pool.QueryRow(ctx, `
		SELECT id, user_id, workspace_id, kie_task_id, status, kie_state, progress, fail_message,
			mode, prompt, model, aspect_ratio, source_upload_id, combine_upload_ids,
			credit_cost, wallet_cents_charged, duration_ms, generation_id, poll_after, last_polled_at, created_at, updated_at
		FROM ai_generation_jobs
		WHERE id = $1 AND user_id = $2
	`, id, userID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return model.AIGenerationJob{}, ErrNotFound
		}
		return model.AIGenerationJob{}, err
	}
	return job, nil
}

func (r *AIGenerationJobRepository) GetByIDInternal(ctx context.Context, id string) (model.AIGenerationJob, error) {
	job, err := r.scanJob(r.pool.QueryRow(ctx, `
		SELECT id, user_id, workspace_id, kie_task_id, status, kie_state, progress, fail_message,
			mode, prompt, model, aspect_ratio, source_upload_id, combine_upload_ids,
			credit_cost, wallet_cents_charged, duration_ms, generation_id, poll_after, last_polled_at, created_at, updated_at
		FROM ai_generation_jobs
		WHERE id = $1
	`, id))
	if err != nil {
		if err == pgx.ErrNoRows {
			return model.AIGenerationJob{}, ErrNotFound
		}
		return model.AIGenerationJob{}, err
	}
	return job, nil
}

func (r *AIGenerationJobRepository) UpdateProgress(
	ctx context.Context,
	id string,
	status, kieState string,
	progress int,
	failMessage string,
	pollAfter time.Time,
) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE ai_generation_jobs
		SET status = $2, kie_state = $3, progress = $4, fail_message = $5,
		    poll_after = $6, last_polled_at = now(), updated_at = now()
		WHERE id = $1
	`, id, status, kieState, progress, failMessage, pollAfter)
	return err
}

func (r *AIGenerationJobRepository) SetDuration(ctx context.Context, id string, durationMs int) error {
	if durationMs < 0 {
		durationMs = 0
	}
	_, err := r.pool.Exec(ctx, `
		UPDATE ai_generation_jobs
		SET duration_ms = $2, updated_at = now()
		WHERE id = $1
	`, id, durationMs)
	return err
}

func (r *AIGenerationJobRepository) MarkSucceeded(
	ctx context.Context,
	id string,
	generationID string,
	walletCentsCharged int,
) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE ai_generation_jobs
		SET status = $2, kie_state = 'success', progress = 100, generation_id = $3,
		    wallet_cents_charged = $4, poll_after = now(), updated_at = now()
		WHERE id = $1
	`, id, model.GenJobStatusSucceeded, generationID, walletCentsCharged)
	return err
}

func (r *AIGenerationJobRepository) MarkFailed(ctx context.Context, id string, failMessage string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE ai_generation_jobs
		SET status = $2, progress = 0, fail_message = $3, updated_at = now()
		WHERE id = $1
	`, id, model.GenJobStatusFailed, failMessage)
	return err
}

func (r *AIGenerationJobRepository) SetKieTask(ctx context.Context, id, kieTaskID, status string, progress int) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE ai_generation_jobs
		SET kie_task_id = $2, status = $3, progress = $4, poll_after = now(), updated_at = now()
		WHERE id = $1
	`, id, kieTaskID, status, progress)
	return err
}

func (r *AIGenerationJobRepository) ListDueForPoll(ctx context.Context, limit int) ([]string, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id FROM ai_generation_jobs
		WHERE status IN ('preparing', 'waiting', 'queuing', 'generating')
		  AND poll_after <= now()
		ORDER BY poll_after ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := make([]string, 0, limit)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}
