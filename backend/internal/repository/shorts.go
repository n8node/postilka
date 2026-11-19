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
