package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type ShortsRepository struct{ pool *pgxpool.Pool }

func NewShortsRepository(pool *pgxpool.Pool) *ShortsRepository { return &ShortsRepository{pool: pool} }

const shortsProjectColumns = `id, workspace_id, created_by_user_id, source_file_id, content_type, language, status,
 source_duration_seconds, processing_minutes_reserved, processing_minutes_consumed, source_expires_at,
 audio_file_id, audio_expires_at, settings, created_at, updated_at`

func scanShortsProject(row pgx.Row) (*model.ShortsProject, error) {
	var p model.ShortsProject
	var contentType, status string
	var settings []byte
	if err := row.Scan(&p.ID, &p.WorkspaceID, &p.CreatedByUserID, &p.SourceFileID, &contentType, &p.Language,
		&status, &p.SourceDurationSeconds, &p.ProcessingMinutesReserved, &p.ProcessingMinutesConsumed,
		&p.SourceExpiresAt, &p.AudioFileID, &p.AudioExpiresAt, &settings, &p.CreatedAt, &p.UpdatedAt); err != nil {
		return nil, err
	}
	p.ContentType = model.ShortsContentType(contentType)
	p.Status = model.ShortsProjectStatus(status)
	p.Settings = json.RawMessage(settings)
	return &p, nil
}

func (r *ShortsRepository) GetProject(ctx context.Context, workspaceID, projectID string) (*model.ShortsProject, error) {
	p, err := scanShortsProject(r.pool.QueryRow(ctx, `SELECT `+shortsProjectColumns+` FROM shorts_projects WHERE id = $1 AND workspace_id = $2`, projectID, workspaceID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return p, err
}

func (r *ShortsRepository) CreateProject(ctx context.Context, p *model.ShortsProject) (*model.ShortsProject, error) {
	if p.Settings == nil {
		p.Settings = json.RawMessage(`{}`)
	}
	row := r.pool.QueryRow(ctx, `
		INSERT INTO shorts_projects (workspace_id, created_by_user_id, source_file_id, content_type, language, status,
			source_duration_seconds, processing_minutes_reserved, source_expires_at, settings)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING `+shortsProjectColumns,
		p.WorkspaceID, p.CreatedByUserID, p.SourceFileID, p.ContentType, p.Language, p.Status,
		p.SourceDurationSeconds, p.ProcessingMinutesReserved, p.SourceExpiresAt, []byte(p.Settings))
	return scanShortsProject(row)
}

func (r *ShortsRepository) UpdateProjectStatus(ctx context.Context, workspaceID, projectID string, status model.ShortsProjectStatus, step string) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_projects SET status = $1, settings = jsonb_set(settings, '{current_step}', to_jsonb($2::text), true), updated_at = now() WHERE id = $3 AND workspace_id = $4`, status, step, projectID, workspaceID)
	return err
}

func (r *ShortsRepository) SetTranscript(ctx context.Context, workspaceID, projectID string, transcript any) error {
	raw, err := json.Marshal(transcript)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `UPDATE shorts_projects SET settings = jsonb_set(settings, '{transcript}', $1::jsonb, true), updated_at = now() WHERE id = $2 AND workspace_id = $3`, raw, projectID, workspaceID)
	return err
}

func (r *ShortsRepository) ListClips(ctx context.Context, workspaceID, projectID string) ([]model.ShortsClip, error) {
	rows, err := r.pool.Query(ctx, `SELECT c.id, c.project_id, c.start_seconds, c.end_seconds, c.transcript_text, c.score, c.score_details, c.crop_config, c.subtitle_config, c.overlay_config, c.status, c.draft_file_id, c.final_file_id, c.created_at, c.updated_at FROM shorts_clips c JOIN shorts_projects p ON p.id = c.project_id WHERE c.project_id = $1 AND p.workspace_id = $2 ORDER BY c.score DESC, c.start_seconds`, projectID, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.ShortsClip, 0)
	for rows.Next() {
		var c model.ShortsClip
		var scoreDetails, crop, subtitle, overlays []byte
		if err := rows.Scan(&c.ID, &c.ProjectID, &c.StartSeconds, &c.EndSeconds, &c.TranscriptText, &c.Score, &scoreDetails, &crop, &subtitle, &overlays, &c.Status, &c.DraftFileID, &c.FinalFileID, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		c.ScoreDetails, c.CropConfig, c.SubtitleConfig, c.OverlayConfig = json.RawMessage(scoreDetails), json.RawMessage(crop), json.RawMessage(subtitle), json.RawMessage(overlays)
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *ShortsRepository) ReplaceCandidates(ctx context.Context, workspaceID, projectID string, candidates []model.ShortsClip) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var exists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM shorts_projects WHERE id = $1 AND workspace_id = $2 FOR UPDATE)`, projectID, workspaceID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}
	if _, err := tx.Exec(ctx, `DELETE FROM shorts_clips WHERE project_id = $1 AND status IN ('candidate', 'draft')`, projectID); err != nil {
		return err
	}
	for _, c := range candidates {
		if _, err := tx.Exec(ctx, `INSERT INTO shorts_clips (project_id, start_seconds, end_seconds, transcript_text, score, score_details, status) VALUES ($1,$2,$3,$4,$5,$6::jsonb,'candidate')`, projectID, c.StartSeconds, c.EndSeconds, c.TranscriptText, c.Score, []byte(c.ScoreDetails)); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *ShortsRepository) SetClipDraft(ctx context.Context, workspaceID, clipID, fileID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_clips c SET draft_file_id = $1, status = 'draft', updated_at = now() FROM shorts_projects p WHERE c.id = $2 AND p.id = c.project_id AND p.workspace_id = $3`, fileID, clipID, workspaceID)
	return err
}

func (r *ShortsRepository) ListCandidateClips(ctx context.Context, workspaceID, projectID string) ([]model.ShortsClip, error) {
	rows, err := r.pool.Query(ctx, `SELECT c.id, c.project_id, c.start_seconds, c.end_seconds, c.transcript_text, c.score, c.score_details, c.crop_config, c.subtitle_config, c.overlay_config, c.status, c.draft_file_id, c.final_file_id, c.created_at, c.updated_at FROM shorts_clips c JOIN shorts_projects p ON p.id = c.project_id WHERE c.project_id = $1 AND p.workspace_id = $2 AND c.status = 'candidate' ORDER BY c.start_seconds`, projectID, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.ShortsClip, 0)
	for rows.Next() {
		var c model.ShortsClip
		var status string
		var scoreDetails, crop, subtitle, overlays []byte
		if err := rows.Scan(&c.ID, &c.ProjectID, &c.StartSeconds, &c.EndSeconds, &c.TranscriptText, &c.Score, &scoreDetails, &crop, &subtitle, &overlays, &status, &c.DraftFileID, &c.FinalFileID, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		c.Status = status
		c.ScoreDetails, c.CropConfig, c.SubtitleConfig, c.OverlayConfig = scoreDetails, crop, subtitle, overlays
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *ShortsRepository) GetClip(ctx context.Context, workspaceID, clipID string) (*model.ShortsClip, error) {
	var c model.ShortsClip
	var status string
	var scoreDetails, crop, subtitle, overlays []byte
	err := r.pool.QueryRow(ctx, `SELECT c.id, c.project_id, c.start_seconds, c.end_seconds, c.transcript_text, c.score, c.score_details, c.crop_config, c.subtitle_config, c.overlay_config, c.status, c.draft_file_id, c.final_file_id, c.created_at, c.updated_at FROM shorts_clips c JOIN shorts_projects p ON p.id = c.project_id WHERE c.id = $1 AND p.workspace_id = $2`, clipID, workspaceID).Scan(&c.ID, &c.ProjectID, &c.StartSeconds, &c.EndSeconds, &c.TranscriptText, &c.Score, &scoreDetails, &crop, &subtitle, &overlays, &status, &c.DraftFileID, &c.FinalFileID, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	c.Status, c.ScoreDetails, c.CropConfig, c.SubtitleConfig, c.OverlayConfig = status, scoreDetails, crop, subtitle, overlays
	return &c, nil
}

func (r *ShortsRepository) CreateJob(ctx context.Context, projectID, jobType string) (*model.ShortsJob, error) {
	var j model.ShortsJob
	var status string
	err := r.pool.QueryRow(ctx, `INSERT INTO shorts_jobs (project_id, job_type) VALUES ($1, $2) RETURNING id, project_id, job_type, status, current_step, progress, attempts, available_at, last_error, created_at, updated_at`, projectID, jobType).Scan(&j.ID, &j.ProjectID, &j.JobType, &status, &j.CurrentStep, &j.Progress, &j.Attempts, &j.AvailableAt, &j.LastError, &j.CreatedAt, &j.UpdatedAt)
	j.Status = model.ShortsJobStatus(status)
	return &j, err
}

func (r *ShortsRepository) GetJob(ctx context.Context, workspaceID, jobID string) (*model.ShortsJob, error) {
	var j model.ShortsJob
	var status string
	err := r.pool.QueryRow(ctx, `SELECT j.id, j.project_id, j.job_type, j.status, j.current_step, j.progress, j.attempts, j.available_at, j.last_error, j.created_at, j.updated_at FROM shorts_jobs j JOIN shorts_projects p ON p.id = j.project_id WHERE j.id = $1 AND p.workspace_id = $2`, jobID, workspaceID).Scan(&j.ID, &j.ProjectID, &j.JobType, &status, &j.CurrentStep, &j.Progress, &j.Attempts, &j.AvailableAt, &j.LastError, &j.CreatedAt, &j.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	j.Status = model.ShortsJobStatus(status)
	return &j, err
}

func (r *ShortsRepository) SetAudio(ctx context.Context, workspaceID, projectID, fileID string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_projects SET audio_file_id = $1, audio_expires_at = $2, updated_at = now() WHERE id = $3 AND workspace_id = $4`, fileID, expiresAt, projectID, workspaceID)
	return err
}

type ShortsExpiredProject struct {
	ID           string
	WorkspaceID  string
	SourceFileID *string
	AudioFileID  *string
}

type ClaimedShortsJob struct {
	ID          string
	ProjectID   string
	WorkspaceID string
	JobType     string
}

func (r *ShortsRepository) ClaimDueJobs(ctx context.Context, owner string, limit int, lease time.Duration) ([]ClaimedShortsJob, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	if lease <= 0 {
		lease = 10 * time.Minute
	}
	rows, err := r.pool.Query(ctx, `
		WITH due AS (
			SELECT j.id
			FROM shorts_jobs j
			WHERE j.status = 'queued' AND j.available_at <= now()
			ORDER BY j.available_at, j.created_at
			FOR UPDATE SKIP LOCKED
			LIMIT $1
		)
		UPDATE shorts_jobs j
		SET status = 'running', lease_owner = $2, lease_until = now() + $3::interval,
			attempts = j.attempts + 1, current_step = 'claimed', updated_at = now()
		FROM due, shorts_projects p
		WHERE j.id = due.id AND p.id = j.project_id
		RETURNING j.id, j.project_id, p.workspace_id, j.job_type
	`, limit, owner, lease.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]ClaimedShortsJob, 0)
	for rows.Next() {
		var item ClaimedShortsJob
		if err := rows.Scan(&item.ID, &item.ProjectID, &item.WorkspaceID, &item.JobType); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *ShortsRepository) UpdateJobProgress(ctx context.Context, jobID, owner, step string, progress int) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_jobs SET current_step = $1, progress = $2, updated_at = now() WHERE id = $3 AND lease_owner = $4`, step, progress, jobID, owner)
	return err
}

func (r *ShortsRepository) SucceedJob(ctx context.Context, jobID, owner string) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_jobs SET status = 'succeeded', progress = 100, current_step = 'completed', lease_owner = NULL, lease_until = NULL, updated_at = now() WHERE id = $1 AND lease_owner = $2`, jobID, owner)
	return err
}

func (r *ShortsRepository) FailJob(ctx context.Context, jobID, owner, message string, retryAt time.Time) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_jobs SET status = CASE WHEN attempts < 3 THEN 'queued' ELSE 'failed' END, available_at = $1, current_step = 'failed', last_error = $2, lease_owner = NULL, lease_until = NULL, updated_at = now() WHERE id = $3 AND lease_owner = $4`, retryAt, message, jobID, owner)
	return err
}

func (r *ShortsRepository) ListExpiredProjects(ctx context.Context, before time.Time) ([]ShortsExpiredProject, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, workspace_id, source_file_id, audio_file_id
		FROM shorts_projects
		WHERE (source_expires_at IS NOT NULL AND source_expires_at <= $1)
		   OR (audio_expires_at IS NOT NULL AND audio_expires_at <= $1)
		ORDER BY updated_at
		LIMIT 200
	`, before)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]ShortsExpiredProject, 0)
	for rows.Next() {
		var item ShortsExpiredProject
		if err := rows.Scan(&item.ID, &item.WorkspaceID, &item.SourceFileID, &item.AudioFileID); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *ShortsRepository) ClearExpiredSource(ctx context.Context, projectID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_projects SET source_file_id = NULL, source_expires_at = NULL, updated_at = now() WHERE id = $1`, projectID)
	return err
}

func (r *ShortsRepository) ClearExpiredAudio(ctx context.Context, projectID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_projects SET audio_file_id = NULL, audio_expires_at = NULL, updated_at = now() WHERE id = $1`, projectID)
	return err
}
