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
	if job.CombineUploadIDs == nil {
		job.CombineUploadIDs = []string{}
	}
	if job.ReferenceUploadIDs == nil {
		job.ReferenceUploadIDs = []string{}
	}
	if job.ReferenceVideoUploadIDs == nil {
		job.ReferenceVideoUploadIDs = []string{}
	}
	if job.ReferenceAudioUploadIDs == nil {
		job.ReferenceAudioUploadIDs = []string{}
	}
	combineJSON, err := json.Marshal(job.CombineUploadIDs)
	if err != nil {
		return model.AIGenerationJob{}, err
	}
	refJSON, err := json.Marshal(job.ReferenceUploadIDs)
	if err != nil {
		return model.AIGenerationJob{}, err
	}
	refVideoJSON, err := json.Marshal(job.ReferenceVideoUploadIDs)
	if err != nil {
		return model.AIGenerationJob{}, err
	}
	refAudioJSON, err := json.Marshal(job.ReferenceAudioUploadIDs)
	if err != nil {
		return model.AIGenerationJob{}, err
	}
	err = r.pool.QueryRow(ctx, `
		INSERT INTO ai_generation_jobs (
			id, user_id, workspace_id, kie_task_id, status, kie_state, progress, fail_message,
			mode, prompt, model, aspect_ratio, source_upload_id, last_frame_upload_id, combine_upload_ids,
			video_duration_seconds, reference_upload_ids, reference_video_upload_ids, reference_audio_upload_ids,
			credit_cost, wallet_cents_charged, generation_id, poll_after, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13, $14, $15,
			$16, $17, $18, $19,
			$20, $21, $22, $23, now(), now()
		)
		RETURNING created_at, updated_at
	`,
		job.ID, job.UserID, job.WorkspaceID, job.KieTaskID, job.Status, job.KieState, job.Progress, job.FailMessage,
		job.Mode, job.Prompt, job.Model, job.AspectRatio, job.SourceUploadID, job.LastFrameUploadID, combineJSON,
		job.VideoDurationSeconds, refJSON, refVideoJSON, refAudioJSON,
		job.CreditCost, job.WalletCentsCharged, job.GenerationID, job.PollAfter,
	).Scan(&job.CreatedAt, &job.UpdatedAt)
	return job, err
}

func (r *AIGenerationJobRepository) scanJob(row pgx.Row) (model.AIGenerationJob, error) {
	var job model.AIGenerationJob
	var combineRaw, refRaw, refVideoRaw, refAudioRaw []byte
	var genID *string
	err := row.Scan(
		&job.ID, &job.UserID, &job.WorkspaceID, &job.KieTaskID, &job.Status, &job.KieState, &job.Progress, &job.FailMessage,
		&job.Mode, &job.Prompt, &job.Model, &job.AspectRatio, &job.SourceUploadID, &job.LastFrameUploadID, &combineRaw,
		&job.VideoDurationSeconds, &refRaw, &refVideoRaw, &refAudioRaw,
		&job.CreditCost, &job.QuotaCreditsUsed, &job.WalletCentsCharged, &job.DurationMs, &genID, &job.PollAfter, &job.LastPolledAt, &job.LeaseOwner, &job.LeaseUntil, &job.Attempts, &job.LastError, &job.CreatedAt, &job.UpdatedAt,
	)
	if err != nil {
		return model.AIGenerationJob{}, err
	}
	job.GenerationID = genID
	_ = json.Unmarshal(combineRaw, &job.CombineUploadIDs)
	_ = json.Unmarshal(refRaw, &job.ReferenceUploadIDs)
	_ = json.Unmarshal(refVideoRaw, &job.ReferenceVideoUploadIDs)
	_ = json.Unmarshal(refAudioRaw, &job.ReferenceAudioUploadIDs)
	return job, nil
}

func (r *AIGenerationJobRepository) GetByID(ctx context.Context, id, userID string) (model.AIGenerationJob, error) {
	job, err := r.scanJob(r.pool.QueryRow(ctx, `
		SELECT id, user_id, workspace_id, kie_task_id, status, kie_state, progress, fail_message,
			mode, prompt, model, aspect_ratio, source_upload_id, last_frame_upload_id, combine_upload_ids,
			video_duration_seconds, reference_upload_ids, reference_video_upload_ids, reference_audio_upload_ids,
			credit_cost, quota_credits_used, wallet_cents_charged, duration_ms, generation_id, poll_after, last_polled_at, lease_owner, lease_until, attempts, last_error, created_at, updated_at
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
			mode, prompt, model, aspect_ratio, source_upload_id, last_frame_upload_id, combine_upload_ids,
			video_duration_seconds, reference_upload_ids, reference_video_upload_ids, reference_audio_upload_ids,
			credit_cost, quota_credits_used, wallet_cents_charged, duration_ms, generation_id, poll_after, last_polled_at, lease_owner, lease_until, attempts, last_error, created_at, updated_at
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

func (r *AIGenerationJobRepository) ListActiveForAdmin(ctx context.Context) ([]model.AdminAIGenerationJob, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT j.id, j.user_id, COALESCE(u.email, ''), j.workspace_id, COALESCE(w.name, ''),
			j.status, COALESCE(j.kie_state, ''), COALESCE(j.kie_task_id, ''), j.progress,
			COALESCE(j.mode, ''), COALESCE(j.model, ''), COALESCE(j.prompt, ''), j.attempts,
			COALESCE(j.last_error, ''), COALESCE(j.fail_message, ''), j.generation_id,
			j.created_at, j.updated_at, j.last_polled_at, j.poll_after, COALESCE(j.lease_owner, ''), j.lease_until
		FROM ai_generation_jobs j
		LEFT JOIN users u ON u.id = j.user_id
		LEFT JOIN workspaces w ON w.id = j.workspace_id
		WHERE j.status IN ('preparing', 'waiting', 'queuing', 'generating')
		ORDER BY j.created_at ASC, j.id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.AdminAIGenerationJob, 0)
	for rows.Next() {
		var item model.AdminAIGenerationJob
		if err := rows.Scan(&item.ID, &item.UserID, &item.UserEmail, &item.WorkspaceID, &item.WorkspaceName,
			&item.Status, &item.KieState, &item.KieTaskID, &item.Progress, &item.Mode, &item.Model, &item.Prompt,
			&item.Attempts, &item.LastError, &item.FailMessage, &item.GenerationID, &item.CreatedAt, &item.UpdatedAt,
			&item.LastPolledAt, &item.PollAfter, &item.LeaseOwner, &item.LeaseUntil); err != nil {
			return nil, err
		}
		item.Stale, item.StaleReason = adminGenerationStaleness(item)
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *AIGenerationJobRepository) ResetActiveForAdmin(ctx context.Context, id string) (bool, error) {
	tag, err := r.pool.Exec(ctx, `
		UPDATE ai_generation_jobs
		SET lease_owner = '', lease_until = NULL, last_error = '',
			poll_after = now(), updated_at = now(),
			status = CASE WHEN COALESCE(TRIM(kie_task_id), '') = '' THEN 'preparing' ELSE status END,
			kie_state = CASE WHEN COALESCE(TRIM(kie_task_id), '') = '' THEN '' ELSE kie_state END
		WHERE id = $1 AND status IN ('preparing', 'waiting', 'queuing', 'generating')
	`, id)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}

func adminGenerationStaleness(job model.AdminAIGenerationJob) (bool, string) {
	now := time.Now()
	if job.LeaseUntil != nil && job.LeaseUntil.Before(now) {
		return true, "lease_expired"
	}
	if job.PollAfter.Before(now) && now.Sub(job.UpdatedAt) > 5*time.Minute {
		return true, "poll_overdue"
	}
	if now.Sub(job.UpdatedAt) > 30*time.Minute {
		return true, "worker_not_progressing"
	}
	return false, ""
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
	walletCentsCharged, quotaCreditsUsed int,
) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE ai_generation_jobs
		SET status = $2, kie_state = 'success', progress = 100, generation_id = $3,
		    wallet_cents_charged = $4, quota_credits_used = $5, poll_after = now(), updated_at = now()
		WHERE id = $1
	`, id, model.GenJobStatusSucceeded, generationID, walletCentsCharged, quotaCreditsUsed)
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

// TryClaimKieSubmit marks a preparing job as in-flight so only one submitter calls KIE createTask.
func (r *AIGenerationJobRepository) TryClaimKieSubmit(ctx context.Context, id string) (bool, error) {
	tag, err := r.pool.Exec(ctx, `
		UPDATE ai_generation_jobs
		SET kie_state = 'submitting', updated_at = now()
		WHERE id = $1
		  AND status = $2
		  AND COALESCE(TRIM(kie_task_id), '') = ''
		  AND (
			COALESCE(kie_state, '') <> 'submitting'
			OR updated_at < now() - interval '3 minutes'
		  )
	`, id, model.GenJobStatusPreparing)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}

func (r *AIGenerationJobRepository) ReleaseKieSubmitClaim(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE ai_generation_jobs
		SET kie_state = '', updated_at = now()
		WHERE id = $1
		  AND COALESCE(TRIM(kie_task_id), '') = ''
		  AND kie_state = 'submitting'
	`, id)
	return err
}

// ClaimDueJobs atomically leases due generation jobs for one worker instance.
// SKIP LOCKED lets multiple workers take different jobs without waiting.
func (r *AIGenerationJobRepository) ClaimDueJobs(ctx context.Context, owner string, limit int, lease time.Duration) ([]string, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if lease <= 0 {
		lease = 2 * time.Minute
	}
	rows, err := r.pool.Query(ctx, `
		WITH due AS (
			SELECT id
			FROM ai_generation_jobs
			WHERE status IN ('preparing', 'waiting', 'queuing', 'generating')
			  AND poll_after <= now()
			  AND (lease_until IS NULL OR lease_until <= now())
			ORDER BY poll_after ASC, created_at ASC, id
			FOR UPDATE SKIP LOCKED
			LIMIT $2
		)
		UPDATE ai_generation_jobs j
		SET lease_owner = $1,
			lease_until = now() + ($3 * interval '1 second'),
			attempts = j.attempts + 1,
			last_error = '',
			updated_at = now()
		FROM due
		WHERE j.id = due.id
		RETURNING j.id
	`, owner, limit, lease.Seconds())
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

func (r *AIGenerationJobRepository) ReleaseLease(ctx context.Context, id, owner string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE ai_generation_jobs
		SET lease_owner = '', lease_until = NULL, updated_at = now()
		WHERE id = $1 AND lease_owner = $2
	`, id, owner)
	return err
}

func (r *AIGenerationJobRepository) SetLeaseError(ctx context.Context, id, owner string, message string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE ai_generation_jobs
		SET last_error = $3, updated_at = now()
		WHERE id = $1 AND lease_owner = $2
	`, id, owner, message)
	return err
}

func (r *AIGenerationJobRepository) SetKieTask(ctx context.Context, id, kieTaskID, status string, progress int) (bool, error) {
	tag, err := r.pool.Exec(ctx, `
		UPDATE ai_generation_jobs
		SET kie_task_id = $2, status = $3, progress = $4, kie_state = 'waiting',
		    poll_after = now(), updated_at = now()
		WHERE id = $1 AND COALESCE(TRIM(kie_task_id), '') = ''
	`, id, kieTaskID, status, progress)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
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

func (r *AIGenerationJobRepository) ListUsageHistory(ctx context.Context, workspaceID string, limit int) ([]model.AIUsageHistoryItem, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := r.pool.Query(ctx, `
		SELECT
			j.id, j.created_at, j.mode, j.prompt, j.credit_cost, j.quota_credits_used, j.wallet_cents_charged,
			g.id, g.result_content_type, f.id, fo.id
		FROM ai_generation_jobs j
		LEFT JOIN ai_generations g ON g.id = j.generation_id
		LEFT JOIN workspace_files f ON f.id = g.workspace_file_id AND f.deleted_at IS NULL
		LEFT JOIN workspace_folders fo ON fo.workspace_id = j.workspace_id
			AND fo.kind = 'ai_content' AND fo.deleted_at IS NULL AND fo.parent_id IS NULL
		WHERE j.workspace_id = $1 AND j.status = 'succeeded'
		ORDER BY j.created_at DESC
		LIMIT $2
	`, workspaceID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.AIUsageHistoryItem, 0, limit)
	for rows.Next() {
		var item model.AIUsageHistoryItem
		var createdAt time.Time
		var genID, mimeType, fileID, folderID *string
		if err := rows.Scan(
			&item.ID, &createdAt, &item.Mode, &item.Prompt, &item.CreditCost,
			&item.QuotaCreditsUsed, &item.WalletCentsCharged,
			&genID, &mimeType, &fileID, &folderID,
		); err != nil {
			return nil, err
		}
		item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		item.GenerationID = genID
		item.WorkspaceFileID = fileID
		item.AIContentFolderID = folderID
		if mimeType != nil {
			item.MimeType = *mimeType
		}
		if genID != nil && *genID != "" {
			item.PreviewURL = model.AIGenerationMediaPath(*genID)
		}
		out = append(out, item)
	}
	return out, rows.Err()
}
