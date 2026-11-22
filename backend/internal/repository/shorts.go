package repository

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
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

const shortsProjectColumnsAliased = `p.id, p.workspace_id, p.created_by_user_id, p.source_file_id, p.content_type, p.language, p.status,
 p.source_duration_seconds, p.processing_minutes_reserved, p.processing_minutes_consumed, p.source_expires_at,
 p.audio_file_id, p.audio_expires_at, p.settings, p.created_at, p.updated_at`

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

func (r *ShortsRepository) ListForWorkspace(ctx context.Context, workspaceID string, limit, offset int) ([]model.ShortsProjectListItem, int, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM shorts_projects WHERE workspace_id = $1`, workspaceID).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.pool.Query(ctx, `
		SELECT `+shortsProjectColumnsAliased+`,
			(SELECT COUNT(*) FROM shorts_clips c WHERE c.project_id = p.id),
			j.id, j.job_type, j.status, j.current_step, j.progress, j.attempts,
			j.available_at, j.last_error, j.created_at, j.updated_at,
			f.id, f.workspace_id, f.folder_id, f.uploaded_by_user_id, f.name, f.mime_type,
			f.size, f.s3_key, f.media_metadata, f.deleted_at, f.trash_batch_id, f.created_at, f.updated_at
		FROM shorts_projects p
		LEFT JOIN LATERAL (
			SELECT sj.id, sj.job_type, sj.status, sj.current_step, sj.progress, sj.attempts, sj.available_at, sj.last_error, sj.created_at, sj.updated_at FROM shorts_jobs sj WHERE sj.project_id = p.id ORDER BY sj.created_at DESC LIMIT 1
		) j ON true
		LEFT JOIN workspace_files f ON f.id = p.source_file_id
		WHERE p.workspace_id = $1
		ORDER BY p.created_at DESC
		LIMIT $2 OFFSET $3
	`, workspaceID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]model.ShortsProjectListItem, 0)
	for rows.Next() {
		var item model.ShortsProjectListItem
		var p model.ShortsProject
		var contentType, status string
		var settings []byte
		var clips int
		var jobID, jobType, jobStatus, step *string
		var lastError *string
		var progress, attempts *int
		var available, jobCreated, jobUpdated *time.Time
		var fileID, fileWorkspaceID, fileFolderID, fileUploadedBy, fileName, fileMime, fileS3Key, fileTrashBatch *string
		var fileSize *int64
		var fileMeta []byte
		var fileDeleted, fileCreated, fileUpdated *time.Time
		if err := rows.Scan(
			&p.ID, &p.WorkspaceID, &p.CreatedByUserID, &p.SourceFileID, &contentType, &p.Language, &status,
			&p.SourceDurationSeconds, &p.ProcessingMinutesReserved, &p.ProcessingMinutesConsumed,
			&p.SourceExpiresAt, &p.AudioFileID, &p.AudioExpiresAt, &settings, &p.CreatedAt, &p.UpdatedAt,
			&clips, &jobID, &jobType, &jobStatus, &step, &progress, &attempts, &available, &lastError, &jobCreated, &jobUpdated,
			&fileID, &fileWorkspaceID, &fileFolderID, &fileUploadedBy, &fileName, &fileMime, &fileSize, &fileS3Key, &fileMeta, &fileDeleted, &fileTrashBatch, &fileCreated, &fileUpdated,
		); err != nil {
			return nil, 0, err
		}
		p.ContentType = model.ShortsContentType(contentType)
		p.Status = model.ShortsProjectStatus(status)
		p.Settings = json.RawMessage(settings)
		item.Project = &p
		item.Clips = clips
		if jobID != nil {
			item.Job = &model.ShortsJob{ID: *jobID, ProjectID: p.ID, JobType: valueOrEmpty(jobType), Status: model.ShortsJobStatus(valueOrEmpty(jobStatus)), CurrentStep: valueOrEmpty(step), Progress: valueOrZero(progress), Attempts: valueOrZero(attempts), LastError: valueOrEmpty(lastError)}
			if available != nil {
				item.Job.AvailableAt = *available
			}
			if jobCreated != nil {
				item.Job.CreatedAt = *jobCreated
			}
			if jobUpdated != nil {
				item.Job.UpdatedAt = *jobUpdated
			}
		}
		if fileID != nil {
			f := &model.WorkspaceFile{ID: *fileID, WorkspaceID: valueOrEmpty(fileWorkspaceID), Name: valueOrEmpty(fileName), MimeType: valueOrEmpty(fileMime), S3Key: valueOrEmpty(fileS3Key)}
			if fileFolderID != nil {
				f.FolderID = fileFolderID
			}
			if fileUploadedBy != nil {
				f.UploadedByUserID = fileUploadedBy
			}
			if fileSize != nil {
				f.Size = *fileSize
			}
			if len(fileMeta) > 0 {
				f.MediaMetadata = json.RawMessage(fileMeta)
			}
			if fileDeleted != nil {
				f.DeletedAt = fileDeleted
			}
			if fileTrashBatch != nil {
				f.TrashBatchID = fileTrashBatch
			}
			if fileCreated != nil {
				f.CreatedAt = *fileCreated
			}
			if fileUpdated != nil {
				f.UpdatedAt = *fileUpdated
			}
			item.SourceFile = f
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func valueOrZero(value *int) int {
	if value == nil {
		return 0
	}
	return *value
}

type ListShortsAdminFilter struct {
	Status string
	Limit  int
	Offset int
}

func (r *ShortsRepository) ListForAdmin(ctx context.Context, f ListShortsAdminFilter) ([]model.AdminShortsProject, int, *model.AdminShortsStats, error) {
	if f.Limit <= 0 || f.Limit > 200 {
		f.Limit = 50
	}
	if f.Offset < 0 {
		f.Offset = 0
	}
	where := ""
	args := []any{}
	if f.Status != "" {
		where = " WHERE p.status = $1"
		args = append(args, f.Status)
	}
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM shorts_projects p`+where, args...).Scan(&total); err != nil {
		return nil, 0, nil, err
	}
	args = append(args, f.Limit, f.Offset)
	rows, err := r.pool.Query(ctx, `SELECT `+shortsProjectColumnsAliased+`, (SELECT COUNT(*) FROM shorts_clips c WHERE c.project_id = p.id), j.id, j.job_type, j.status, j.current_step, j.progress, j.attempts, j.available_at, j.last_error, j.created_at, j.updated_at FROM shorts_projects p LEFT JOIN LATERAL (SELECT sj.id, sj.job_type, sj.status, sj.current_step, sj.progress, sj.attempts, sj.available_at, sj.last_error, sj.created_at, sj.updated_at FROM shorts_jobs sj WHERE sj.project_id = p.id ORDER BY sj.created_at DESC LIMIT 1) j ON true`+where+` ORDER BY p.created_at DESC LIMIT $`+strconv.Itoa(len(args)-1)+` OFFSET $`+strconv.Itoa(len(args)), args...)
	if err != nil {
		return nil, 0, nil, err
	}
	defer rows.Close()
	items := make([]model.AdminShortsProject, 0)
	for rows.Next() {
		var p model.ShortsProject
		var contentType, status string
		var settings []byte
		var clips int
		var jobID, jobType, jobStatus, step *string
		var lastError *string
		var progress, attempts *int
		var available, jobCreated, jobUpdated *time.Time
		if err := rows.Scan(&p.ID, &p.WorkspaceID, &p.CreatedByUserID, &p.SourceFileID, &contentType, &p.Language, &status, &p.SourceDurationSeconds, &p.ProcessingMinutesReserved, &p.ProcessingMinutesConsumed, &p.SourceExpiresAt, &p.AudioFileID, &p.AudioExpiresAt, &settings, &p.CreatedAt, &p.UpdatedAt, &clips, &jobID, &jobType, &jobStatus, &step, &progress, &attempts, &available, &lastError, &jobCreated, &jobUpdated); err != nil {
			return nil, 0, nil, err
		}
		p.ContentType = model.ShortsContentType(contentType)
		p.Status = model.ShortsProjectStatus(status)
		p.Settings = json.RawMessage(settings)
		item := model.AdminShortsProject{Project: &p, Clips: clips}
		if jobID != nil {
			item.Job = &model.ShortsJob{ID: *jobID, ProjectID: p.ID, JobType: *jobType, Status: model.ShortsJobStatus(*jobStatus), CurrentStep: *step, Progress: *progress, Attempts: *attempts, AvailableAt: *available, CreatedAt: *jobCreated, UpdatedAt: *jobUpdated}
			if lastError != nil {
				item.Job.LastError = *lastError
			}
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, nil, err
	}
	stats := &model.AdminShortsStats{}
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('draft','analyzing','rendering')), COUNT(*) FILTER (WHERE status='completed'), COUNT(*) FILTER (WHERE status='failed') FROM shorts_projects`).Scan(&stats.Total, &stats.Active, &stats.Completed, &stats.Failed); err != nil {
		return nil, 0, nil, err
	}
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM shorts_jobs WHERE status='queued'`).Scan(&stats.QueuedJobs); err != nil {
		return nil, 0, nil, err
	}
	return items, total, stats, nil
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

func (r *ShortsRepository) SetTranscriptResult(ctx context.Context, workspaceID, projectID string, result any) error {
	raw, err := json.Marshal(result)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `UPDATE shorts_projects SET settings = jsonb_set(settings, '{transcript_result}', $1::jsonb, true), updated_at = now() WHERE id = $2 AND workspace_id = $3`, raw, projectID, workspaceID)
	return err
}

func (r *ShortsRepository) SetSubtitleSettings(ctx context.Context, workspaceID, projectID, style, position string, fontSize int, textColor, background, watermark string, safeZone int) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_projects SET settings = settings || jsonb_build_object('subtitle_style',$1::text,'subtitle_position',$2::text,'subtitle_font_size',$3::int,'subtitle_text_color',$4::text,'subtitle_background',$5::text,'watermark',$6::text,'safe_zone',$7::int), updated_at = now() WHERE id = $8 AND workspace_id = $9`, style, position, fontSize, textColor, background, watermark, safeZone, projectID, workspaceID)
	return err
}

func (r *ShortsRepository) SetClipOrder(ctx context.Context, workspaceID, projectID string, clipIDs []string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	for order, clipID := range clipIDs {
		if _, err := tx.Exec(ctx, `UPDATE shorts_clips c SET score_details = jsonb_set(CASE WHEN jsonb_typeof(c.score_details) = 'object' THEN c.score_details ELSE '{}'::jsonb END, '{order}', to_jsonb($1::int), true), updated_at = now() FROM shorts_projects p WHERE c.id = $2 AND c.project_id = p.id AND p.id = $3 AND p.workspace_id = $4`, order, clipID, projectID, workspaceID); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
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

func (r *ShortsRepository) GetProjectByClip(ctx context.Context, workspaceID, clipID string) (*model.ShortsProject, error) {
	return scanShortsProject(r.pool.QueryRow(ctx, `SELECT `+shortsProjectColumns+` FROM shorts_projects p JOIN shorts_clips c ON c.project_id = p.id WHERE c.id = $1 AND p.workspace_id = $2`, clipID, workspaceID))
}

func (r *ShortsRepository) DeleteClip(ctx context.Context, workspaceID, clipID string) error {
	tag, err := r.pool.Exec(ctx, `
		DELETE FROM shorts_clips c
		USING shorts_projects p
		WHERE c.id = $1 AND c.project_id = p.id AND p.workspace_id = $2
	`, clipID, workspaceID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *ShortsRepository) UpdateClip(ctx context.Context, workspaceID, clipID string, input model.ShortsClipUpdate) (*model.ShortsClip, error) {
	var c model.ShortsClip
	var status string
	var scoreDetails, crop, subtitle, overlays []byte
	err := r.pool.QueryRow(ctx, `
		UPDATE shorts_clips c
		SET start_seconds = $1, end_seconds = $2, transcript_text = $3, status = $4, updated_at = now()
		FROM shorts_projects p
		WHERE c.id = $5 AND p.id = c.project_id AND p.workspace_id = $6
		RETURNING c.id, c.project_id, c.start_seconds, c.end_seconds, c.transcript_text, c.score, c.score_details, c.crop_config, c.subtitle_config, c.overlay_config, c.status, c.draft_file_id, c.final_file_id, c.created_at, c.updated_at
	`, input.StartSeconds, input.EndSeconds, input.TranscriptText, input.Status, clipID, workspaceID).Scan(&c.ID, &c.ProjectID, &c.StartSeconds, &c.EndSeconds, &c.TranscriptText, &c.Score, &scoreDetails, &crop, &subtitle, &overlays, &status, &c.DraftFileID, &c.FinalFileID, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	c.Status = status
	c.ScoreDetails, c.CropConfig, c.SubtitleConfig, c.OverlayConfig = json.RawMessage(scoreDetails), json.RawMessage(crop), json.RawMessage(subtitle), json.RawMessage(overlays)
	return &c, err
}

func (r *ShortsRepository) CreateJob(ctx context.Context, projectID, jobType string) (*model.ShortsJob, error) {
	var j model.ShortsJob
	var status string
	var lastError *string
	err := r.pool.QueryRow(ctx, `INSERT INTO shorts_jobs (project_id, job_type) VALUES ($1, $2) RETURNING id, project_id, job_type, status, current_step, progress, attempts, available_at, last_error, created_at, updated_at`, projectID, jobType).Scan(&j.ID, &j.ProjectID, &j.JobType, &status, &j.CurrentStep, &j.Progress, &j.Attempts, &j.AvailableAt, &lastError, &j.CreatedAt, &j.UpdatedAt)
	if lastError != nil {
		j.LastError = *lastError
	}
	j.Status = model.ShortsJobStatus(status)
	return &j, err
}

func (r *ShortsRepository) CreateRerenderJob(ctx context.Context, workspaceID, projectID string) (*model.ShortsJob, error) {
	var j model.ShortsJob
	var status string
	err := r.pool.QueryRow(ctx, `INSERT INTO shorts_jobs (project_id, job_type) SELECT $1, 'rerender' WHERE EXISTS (SELECT 1 FROM shorts_projects WHERE id = $1 AND workspace_id = $2) RETURNING id, project_id, job_type, status, current_step, progress, attempts, available_at, last_error, created_at, updated_at`, projectID, workspaceID).Scan(&j.ID, &j.ProjectID, &j.JobType, &status, &j.CurrentStep, &j.Progress, &j.Attempts, &j.AvailableAt, &j.LastError, &j.CreatedAt, &j.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	j.Status = model.ShortsJobStatus(status)
	return &j, err
}

func (r *ShortsRepository) CreateExportJob(ctx context.Context, workspaceID, projectID string) (*model.ShortsJob, error) {
	var j model.ShortsJob
	var status string
	err := r.pool.QueryRow(ctx, `INSERT INTO shorts_jobs (project_id, job_type) SELECT $1, 'export' WHERE EXISTS (SELECT 1 FROM shorts_projects WHERE id = $1 AND workspace_id = $2) AND NOT EXISTS (SELECT 1 FROM shorts_jobs WHERE project_id = $1 AND job_type = 'export' AND status IN ('queued', 'running')) RETURNING id, project_id, job_type, status, current_step, progress, attempts, available_at, last_error, created_at, updated_at`, projectID, workspaceID).Scan(&j.ID, &j.ProjectID, &j.JobType, &status, &j.CurrentStep, &j.Progress, &j.Attempts, &j.AvailableAt, &j.LastError, &j.CreatedAt, &j.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	j.Status = model.ShortsJobStatus(status)
	return &j, err
}

func (r *ShortsRepository) CreateAnalyzeJob(ctx context.Context, workspaceID, projectID string) (*model.ShortsJob, error) {
	var j model.ShortsJob
	var status string
	var lastError *string
	err := r.pool.QueryRow(ctx, `
		INSERT INTO shorts_jobs (project_id, job_type)
		SELECT $1, 'analyze'
		WHERE EXISTS (
			SELECT 1 FROM shorts_projects WHERE id = $1 AND workspace_id = $2
		)
		AND NOT EXISTS (
			SELECT 1 FROM shorts_jobs WHERE project_id = $1 AND status IN ('queued', 'running')
		)
		RETURNING id, project_id, job_type, status, current_step, progress, attempts, available_at, last_error, created_at, updated_at
	`, projectID, workspaceID).Scan(&j.ID, &j.ProjectID, &j.JobType, &status, &j.CurrentStep, &j.Progress, &j.Attempts, &j.AvailableAt, &lastError, &j.CreatedAt, &j.UpdatedAt)
	if lastError != nil {
		j.LastError = *lastError
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	j.Status = model.ShortsJobStatus(status)
	return &j, err
}

func (r *ShortsRepository) DeleteProject(ctx context.Context, workspaceID, projectID string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM shorts_projects WHERE id = $1 AND workspace_id = $2`, projectID, workspaceID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
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

func (r *ShortsRepository) SetProjectFinalFile(ctx context.Context, workspaceID, projectID, fileID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_projects SET status = 'completed', settings = jsonb_set(settings, '{final_file_id}', to_jsonb($1::text), true), updated_at = now() WHERE id = $2 AND workspace_id = $3`, fileID, projectID, workspaceID)
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
			attempts = j.attempts + 1, current_step = 'starting', progress = 1, last_error = NULL, updated_at = now()
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

func (r *ShortsRepository) CompleteJob(ctx context.Context, jobID, owner, projectID, workspaceID string, projectStatus model.ShortsProjectStatus, projectStep string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `UPDATE shorts_jobs SET status = 'succeeded', progress = 100, current_step = 'completed', lease_owner = NULL, lease_until = NULL, updated_at = now() WHERE id = $1 AND lease_owner = $2`, jobID, owner); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `UPDATE shorts_projects SET status = $1, settings = jsonb_set(settings, '{current_step}', to_jsonb($2::text), true), updated_at = now() WHERE id = $3 AND workspace_id = $4`, projectStatus, projectStep, projectID, workspaceID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *ShortsRepository) SucceedJob(ctx context.Context, jobID, owner string) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_jobs SET status = 'succeeded', progress = 100, current_step = 'completed', lease_owner = NULL, lease_until = NULL, updated_at = now() WHERE id = $1 AND lease_owner = $2`, jobID, owner)
	return err
}

func (r *ShortsRepository) FailJob(ctx context.Context, jobID, owner, message string, retryAt time.Time) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_jobs SET status = CASE WHEN attempts < 3 THEN 'queued' ELSE 'failed' END, available_at = $1, progress = CASE WHEN attempts < 3 THEN 0 ELSE progress END, current_step = CASE WHEN attempts < 3 THEN 'retry_scheduled' ELSE 'failed' END, last_error = $2, lease_owner = NULL, lease_until = NULL, updated_at = now() WHERE id = $3 AND lease_owner = $4`, retryAt, message, jobID, owner)
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
