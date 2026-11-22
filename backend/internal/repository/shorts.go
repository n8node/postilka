package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
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
	if p, err := r.GetEditProject(ctx, workspaceID, projectID); err == nil {
		return p, nil
	} else if !errors.Is(err, ErrNotFound) {
		return nil, err
	}
	if p, err := r.GetSource(ctx, workspaceID, projectID); err == nil {
		return p, nil
	} else if !errors.Is(err, ErrNotFound) {
		return nil, err
	}
	var p model.ShortsProject
	var contentType, status string
	var settings []byte
	err := r.pool.QueryRow(ctx, `SELECT id,source_id,workspace_id,created_by_user_id,source_file_id,content_type,language,status,source_duration_seconds,processing_minutes_reserved,processing_minutes_consumed,source_expires_at,audio_file_id,audio_expires_at,settings,created_at,updated_at FROM shorts_projects WHERE id=$1 AND workspace_id=$2`, projectID, workspaceID).Scan(&p.ID, &p.SourceID, &p.WorkspaceID, &p.CreatedByUserID, &p.SourceFileID, &contentType, &p.Language, &status, &p.SourceDurationSeconds, &p.ProcessingMinutesReserved, &p.ProcessingMinutesConsumed, &p.SourceExpiresAt, &p.AudioFileID, &p.AudioExpiresAt, &settings, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	p.ContentType, p.Status, p.Settings = model.ShortsContentType(contentType), model.ShortsProjectStatus(status), json.RawMessage(settings)
	return &p, nil
}

func (r *ShortsRepository) GetSource(ctx context.Context, workspaceID, sourceID string) (*model.ShortsProject, error) {
	p, err := scanShortsProject(r.pool.QueryRow(ctx, `SELECT id,workspace_id,created_by_user_id,source_file_id,content_type,language,status,source_duration_seconds,processing_minutes_reserved,processing_minutes_consumed,source_expires_at,audio_file_id,audio_expires_at,settings,created_at,updated_at FROM shorts_sources WHERE id=$1 AND workspace_id=$2`, sourceID, workspaceID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	p.SourceID = sourceID
	return p, nil
}

func (r *ShortsRepository) ListForWorkspace(ctx context.Context, workspaceID string, limit, offset int) ([]model.ShortsProjectListItem, int, error) {
	return r.ListShortsWorkspaceAll(ctx, workspaceID, limit, offset)
}

func (r *ShortsRepository) ListSourceAnalysisJobs(ctx context.Context, workspaceID string) (map[string]*model.ShortsJob, error) {
	rows, err := r.pool.Query(ctx, `SELECT DISTINCT ON(j.source_id) j.id,j.source_id,j.job_type,j.status,j.current_step,j.progress,j.attempts,j.available_at,COALESCE(j.last_error,''),j.created_at,j.updated_at FROM shorts_jobs j JOIN shorts_sources s ON s.id=j.source_id WHERE s.workspace_id=$1 AND j.job_type='analyze' ORDER BY j.source_id,j.created_at DESC`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]*model.ShortsJob{}
	for rows.Next() {
		var j model.ShortsJob
		var st string
		var lastError *string
		if err := rows.Scan(&j.ID, &j.SourceID, &j.JobType, &st, &j.CurrentStep, &j.Progress, &j.Attempts, &j.AvailableAt, &lastError, &j.CreatedAt, &j.UpdatedAt); err != nil {
			return nil, err
		}
		j.ProjectID = j.SourceID
		if lastError != nil {
			j.LastError = *lastError
		}
		j.Status = model.ShortsJobStatus(st)
		out[j.SourceID] = &j
	}
	return out, rows.Err()
}

func (r *ShortsRepository) ListEditProjectsForWorkspace(ctx context.Context, workspaceID string, limit, offset int) ([]model.ShortsProjectListItem, int, error) {
	return r.ListEditProjects(ctx, workspaceID, limit, offset)
}

func (r *ShortsRepository) ListEditProjects(ctx context.Context, workspaceID string, limit, offset int) ([]model.ShortsProjectListItem, int, error) {
	if limit < 1 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT count(*) FROM shorts_edit_projects WHERE workspace_id=$1`, workspaceID).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.pool.Query(ctx, `SELECT ep.id,ep.source_id,ep.workspace_id,ep.created_by_user_id,s.source_file_id,s.content_type,s.language,ep.status,s.source_duration_seconds,s.processing_minutes_reserved,s.processing_minutes_consumed,s.source_expires_at,s.audio_file_id,s.audio_expires_at,ep.settings,ep.created_at,ep.updated_at,(SELECT count(*) FROM shorts_edit_project_clips ec WHERE ec.edit_project_id=ep.id AND ec.included),ep.name,f.id,f.workspace_id,f.folder_id,f.uploaded_by_user_id,f.name,f.mime_type,f.size,f.s3_key,f.media_metadata,f.deleted_at,f.trash_batch_id,f.created_at,f.updated_at FROM shorts_edit_projects ep JOIN shorts_sources s ON s.id=ep.source_id LEFT JOIN workspace_files f ON f.id=s.source_file_id WHERE ep.workspace_id=$1 ORDER BY ep.updated_at DESC LIMIT $2 OFFSET $3`, workspaceID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]model.ShortsProjectListItem, 0)
	for rows.Next() {
		var item model.ShortsProjectListItem
		var p model.ShortsProject
		var ct, st string
		var settings, meta []byte
		var clips int
		var editName string
		var fileID, fileWS, folder, uploaded, name, mime, s3, trash *string
		var size *int64
		var deleted, created, updated *time.Time
		if err := rows.Scan(&p.ID, &p.SourceID, &p.WorkspaceID, &p.CreatedByUserID, &p.SourceFileID, &ct, &p.Language, &st, &p.SourceDurationSeconds, &p.ProcessingMinutesReserved, &p.ProcessingMinutesConsumed, &p.SourceExpiresAt, &p.AudioFileID, &p.AudioExpiresAt, &settings, &p.CreatedAt, &p.UpdatedAt, &clips, &editName, &fileID, &fileWS, &folder, &uploaded, &name, &mime, &size, &s3, &meta, &deleted, &trash, &created, &updated); err != nil {
			return nil, 0, err
		}
		p.ContentType = model.ShortsContentType(ct)
		p.Status = model.ShortsProjectStatus(st)
		p.IsEditProject = true
		p.Name = editName
		p.Settings = json.RawMessage(settings)
		item.Project = &p
		item.EditProjectID = p.ID
		item.SourceID = p.SourceID
		item.Clips = clips
		if fileID != nil {
			f := &model.WorkspaceFile{ID: *fileID, WorkspaceID: valueOrEmpty(fileWS), Name: valueOrEmpty(name), MimeType: valueOrEmpty(mime), S3Key: valueOrEmpty(s3)}
			if folder != nil {
				f.FolderID = folder
			}
			if uploaded != nil {
				f.UploadedByUserID = uploaded
			}
			if size != nil {
				f.Size = *size
			}
			if len(meta) > 0 {
				f.MediaMetadata = json.RawMessage(meta)
			}
			if deleted != nil {
				f.DeletedAt = deleted
			}
			if trash != nil {
				f.TrashBatchID = trash
			}
			if created != nil {
				f.CreatedAt = *created
			}
			if updated != nil {
				f.UpdatedAt = *updated
			}
			item.SourceFile = f
		}
		items = append(items, item)
	}
	jobs, err := r.ListEditProjectJobs(ctx, workspaceID)
	if err != nil {
		return nil, 0, err
	}
	for i := range items {
		items[i].Job = jobs[items[i].EditProjectID]
	}
	return items, total, rows.Err()
}

func (r *ShortsRepository) ListShortsWorkspaceAll(ctx context.Context, workspaceID string, limit, offset int) ([]model.ShortsProjectListItem, int, error) {
	if limit < 1 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	fetchLimit := limit * 10
	if fetchLimit < 100 {
		fetchLimit = 100
	}
	if fetchLimit > 10000 {
		fetchLimit = 10000
	}
	var editCount, legacyCount, sourceCount int
	if err := r.pool.QueryRow(ctx, `SELECT count(*) FROM shorts_edit_projects WHERE workspace_id=$1`, workspaceID).Scan(&editCount); err != nil {
		return nil, 0, err
	}
	if err := r.pool.QueryRow(ctx, `SELECT count(*) FROM shorts_projects WHERE workspace_id=$1`, workspaceID).Scan(&legacyCount); err != nil {
		return nil, 0, err
	}
	if err := r.pool.QueryRow(ctx, `SELECT count(*) FROM shorts_sources s WHERE s.workspace_id=$1 AND NOT EXISTS(SELECT 1 FROM shorts_edit_projects ep WHERE ep.source_id=s.id)`, workspaceID).Scan(&sourceCount); err != nil {
		return nil, 0, err
	}
	edit, _, err := r.ListEditProjects(ctx, workspaceID, fetchLimit, 0)
	if err != nil {
		return nil, 0, err
	}
	legacy, _, err := r.ListLegacyForWorkspace(ctx, workspaceID, fetchLimit, 0)
	if err != nil {
		return nil, 0, err
	}
	items := append(edit, legacy...)
	sources, err := r.ListSourcesForWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, 0, err
	}
	jobs, err := r.ListSourceAnalysisJobs(ctx, workspaceID)
	if err != nil {
		return nil, 0, err
	}
	for _, source := range sources {
		if _, err := r.GetEditProjectForSource(ctx, workspaceID, source.ID); err == nil {
			continue
		}
		src := source
		items = append(items, model.ShortsProjectListItem{Project: &src, SourceID: src.ID, Job: jobs[src.ID]})
	}
	sort.SliceStable(items, func(i, j int) bool { return items[i].Project.CreatedAt.After(items[j].Project.CreatedAt) })
	start := offset
	if start > len(items) {
		start = len(items)
	}
	end := start + limit
	if end > len(items) {
		end = len(items)
	}
	return items[start:end], editCount + legacyCount + sourceCount, nil
}

func (r *ShortsRepository) GetEditProjectForSource(ctx context.Context, workspaceID, sourceID string) (*model.ShortsProject, error) {
	var id string
	err := r.pool.QueryRow(ctx, `SELECT id FROM shorts_edit_projects WHERE source_id=$1 AND workspace_id=$2 ORDER BY created_at LIMIT 1`, sourceID, workspaceID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return r.GetEditProject(ctx, workspaceID, id)
}

func (r *ShortsRepository) ListEditProjectsForSource(ctx context.Context, workspaceID, sourceID string) ([]model.ShortsProject, error) {
	rows, err := r.pool.Query(ctx, `SELECT ep.id,ep.source_id,ep.workspace_id,ep.created_by_user_id,s.source_file_id,s.content_type,s.language,ep.status,s.source_duration_seconds,s.processing_minutes_reserved,s.processing_minutes_consumed,s.source_expires_at,s.audio_file_id,s.audio_expires_at,ep.settings,ep.created_at,ep.updated_at,ep.name FROM shorts_edit_projects ep JOIN shorts_sources s ON s.id=ep.source_id WHERE ep.source_id=$1 AND ep.workspace_id=$2 ORDER BY ep.created_at`, sourceID, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.ShortsProject, 0)
	for rows.Next() {
		var p model.ShortsProject
		var ct, st, editName string
		var settings []byte
		if err := rows.Scan(&p.ID, &p.SourceID, &p.WorkspaceID, &p.CreatedByUserID, &p.SourceFileID, &ct, &p.Language, &st, &p.SourceDurationSeconds, &p.ProcessingMinutesReserved, &p.ProcessingMinutesConsumed, &p.SourceExpiresAt, &p.AudioFileID, &p.AudioExpiresAt, &settings, &p.CreatedAt, &p.UpdatedAt, &editName); err != nil {
			return nil, err
		}
		p.ContentType = model.ShortsContentType(ct)
		p.Status = model.ShortsProjectStatus(st)
		p.IsEditProject = true
		p.Name = editName
		p.Settings = json.RawMessage(settings)
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *ShortsRepository) ListSourcesForWorkspace(ctx context.Context, workspaceID string) ([]model.ShortsProject, error) {
	rows, err := r.pool.Query(ctx, `SELECT id,workspace_id,created_by_user_id,source_file_id,content_type,language,status,source_duration_seconds,processing_minutes_reserved,processing_minutes_consumed,source_expires_at,audio_file_id,audio_expires_at,settings,created_at,updated_at FROM shorts_sources WHERE workspace_id=$1 ORDER BY created_at DESC`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.ShortsProject, 0)
	for rows.Next() {
		p, err := scanShortsProject(rows)
		if err != nil {
			return nil, err
		}
		p.SourceID = p.ID
		out = append(out, *p)
	}
	return out, rows.Err()
}

func (r *ShortsRepository) ListLegacyForWorkspace(ctx context.Context, workspaceID string, limit, offset int) ([]model.ShortsProjectListItem, int, error) {
	if limit < 1 || limit > 100 {
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
			(SELECT COUNT(*) FROM shorts_clips c WHERE c.source_id = p.source_id),
			j.id, j.job_type, j.status, j.current_step, j.progress, j.attempts,
			j.available_at, COALESCE(j.last_error, ''), j.created_at, j.updated_at,
			f.id, f.workspace_id, f.folder_id, f.uploaded_by_user_id, f.name, f.mime_type,
			f.size, f.s3_key, f.media_metadata, f.deleted_at, f.trash_batch_id, f.created_at, f.updated_at
		FROM shorts_projects p
		LEFT JOIN LATERAL (
			SELECT sj.id, sj.job_type, sj.status, sj.current_step, sj.progress, sj.attempts, sj.available_at, COALESCE(sj.last_error, '') AS last_error, sj.created_at, sj.updated_at FROM shorts_jobs sj WHERE sj.source_id = p.source_id AND sj.edit_project_id IS NULL ORDER BY sj.created_at DESC LIMIT 1
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
		where = " WHERE x.status = $1"
		args = append(args, f.Status)
	}
	base := ` FROM (
		SELECT ep.id,ep.source_id,ep.workspace_id,ep.created_by_user_id,s.source_file_id,s.content_type,s.language,ep.status,s.source_duration_seconds,s.processing_minutes_reserved,s.processing_minutes_consumed,s.source_expires_at,s.audio_file_id,s.audio_expires_at,ep.settings,ep.created_at,ep.updated_at,ep.name
		FROM shorts_edit_projects ep JOIN shorts_sources s ON s.id=ep.source_id
		UNION ALL
		SELECT p.id,p.source_id,p.workspace_id,p.created_by_user_id,p.source_file_id,p.content_type,p.language,p.status,p.source_duration_seconds,p.processing_minutes_reserved,p.processing_minutes_consumed,p.source_expires_at,p.audio_file_id,p.audio_expires_at,p.settings,p.created_at,p.updated_at,COALESCE(NULLIF(p.settings->>'project_name',''),'Проект Shorts')::text
		FROM shorts_projects p WHERE NOT EXISTS (SELECT 1 FROM shorts_edit_projects ep WHERE ep.id=p.id OR ep.source_id=p.source_id)
		UNION ALL
		SELECT s.id,s.id,s.workspace_id,s.created_by_user_id,s.source_file_id,s.content_type,s.language,s.status,s.source_duration_seconds,s.processing_minutes_reserved,s.processing_minutes_consumed,s.source_expires_at,s.audio_file_id,s.audio_expires_at,s.settings,s.created_at,s.updated_at,COALESCE(NULLIF(s.settings->>'project_name',''),'Проект Shorts')::text
		FROM shorts_sources s WHERE NOT EXISTS (SELECT 1 FROM shorts_edit_projects ep WHERE ep.source_id=s.id) AND NOT EXISTS (SELECT 1 FROM shorts_projects p WHERE p.source_id=s.id)
	) x
	LEFT JOIN LATERAL (SELECT sj.id,sj.job_type,sj.status,sj.current_step,sj.progress,sj.attempts,sj.available_at,COALESCE(sj.last_error,'') AS last_error,sj.created_at,sj.updated_at FROM shorts_jobs sj WHERE sj.source_id=x.source_id AND (sj.edit_project_id=x.id OR (sj.edit_project_id IS NULL AND x.id=x.source_id)) ORDER BY sj.created_at DESC LIMIT 1) j ON true`
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*)`+base+where, args...).Scan(&total); err != nil {
		return nil, 0, nil, err
	}
	args = append(args, f.Limit, f.Offset)
	rows, err := r.pool.Query(ctx, `SELECT x.id,x.source_id,x.workspace_id,x.created_by_user_id,x.source_file_id,x.content_type,x.language,x.status,x.source_duration_seconds,x.processing_minutes_reserved,x.processing_minutes_consumed,x.source_expires_at,x.audio_file_id,x.audio_expires_at,x.settings,x.created_at,x.updated_at,x.name,(SELECT COUNT(*) FROM shorts_clips c WHERE c.source_id=x.source_id),j.id,j.job_type,j.status,j.current_step,j.progress,j.attempts,j.available_at,j.last_error,j.created_at,j.updated_at`+base+where+` ORDER BY x.created_at DESC LIMIT $`+strconv.Itoa(len(args)-1)+` OFFSET $`+strconv.Itoa(len(args)), args...)
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
		var name string
		if err := rows.Scan(&p.ID, &p.SourceID, &p.WorkspaceID, &p.CreatedByUserID, &p.SourceFileID, &contentType, &p.Language, &status, &p.SourceDurationSeconds, &p.ProcessingMinutesReserved, &p.ProcessingMinutesConsumed, &p.SourceExpiresAt, &p.AudioFileID, &p.AudioExpiresAt, &settings, &p.CreatedAt, &p.UpdatedAt, &name, &clips, &jobID, &jobType, &jobStatus, &step, &progress, &attempts, &available, &lastError, &jobCreated, &jobUpdated); err != nil {
			return nil, 0, nil, err
		}
		p.ContentType = model.ShortsContentType(contentType)
		p.Status = model.ShortsProjectStatus(status)
		p.Settings = json.RawMessage(settings)
		p.Name = name
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

func (r *ShortsRepository) UpdateSourceProcessingRange(ctx context.Context, workspaceID, sourceID string, startSeconds, endSeconds float64) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_sources SET settings = settings || jsonb_build_object('processing_start_seconds',$1::float8,'processing_end_seconds',$2::float8), source_duration_seconds=$3::numeric, processing_minutes_reserved=$3::numeric/60, status='analyzing', updated_at=now() WHERE id=$4::uuid AND workspace_id=$5::uuid`, startSeconds, endSeconds, endSeconds-startSeconds, sourceID, workspaceID)
	return err
}

func (r *ShortsRepository) CreateSource(ctx context.Context, p *model.ShortsProject) (*model.ShortsProject, error) {
	if p.Settings == nil {
		p.Settings = json.RawMessage(`{}`)
	}
	row := r.pool.QueryRow(ctx, `
		INSERT INTO shorts_sources (workspace_id, created_by_user_id, source_file_id, content_type, language, status,
			source_duration_seconds, processing_minutes_reserved, source_expires_at, settings)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, workspace_id, created_by_user_id, source_file_id, content_type, language, status,
			source_duration_seconds, processing_minutes_reserved, processing_minutes_consumed, source_expires_at,
			audio_file_id, audio_expires_at, settings, created_at, updated_at`,
		p.WorkspaceID, p.CreatedByUserID, p.SourceFileID, p.ContentType, p.Language, p.Status,
		p.SourceDurationSeconds, p.ProcessingMinutesReserved, p.SourceExpiresAt, []byte(p.Settings))
	return scanShortsProject(row)
}

func (r *ShortsRepository) UpdateProjectStatus(ctx context.Context, workspaceID, projectID string, status model.ShortsProjectStatus, step string) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_projects SET status = $1, settings = jsonb_set(settings, '{current_step}', to_jsonb($2::text), true), updated_at = now() WHERE id = $3 AND workspace_id = $4`, status, step, projectID, workspaceID)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `UPDATE shorts_sources SET status=$1,settings=jsonb_set(settings,'{current_step}',to_jsonb($2::text),true),updated_at=now() WHERE id=$3 AND workspace_id=$4`, status, step, projectID, workspaceID)
	return err
}

func (r *ShortsRepository) GetSourceForFile(ctx context.Context, workspaceID, fileID string) (*model.ShortsProject, bool, error) {
	var p model.ShortsProject
	var contentType, status string
	var settings []byte
	err := r.pool.QueryRow(ctx, `SELECT s.id,s.workspace_id,s.created_by_user_id,s.source_file_id,s.content_type,s.language,s.status,s.source_duration_seconds,s.processing_minutes_reserved,s.processing_minutes_consumed,s.source_expires_at,s.audio_file_id,s.audio_expires_at,s.settings,s.created_at,s.updated_at FROM shorts_sources s WHERE s.workspace_id=$1 AND s.source_file_id=$2 ORDER BY s.created_at DESC LIMIT 1`, workspaceID, fileID).Scan(&p.ID, &p.WorkspaceID, &p.CreatedByUserID, &p.SourceFileID, &contentType, &p.Language, &status, &p.SourceDurationSeconds, &p.ProcessingMinutesReserved, &p.ProcessingMinutesConsumed, &p.SourceExpiresAt, &p.AudioFileID, &p.AudioExpiresAt, &settings, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	p.ContentType, p.Status, p.Settings = model.ShortsContentType(contentType), model.ShortsProjectStatus(status), json.RawMessage(settings)
	return &p, true, nil
}

func (r *ShortsRepository) GetAnalysisForFile(ctx context.Context, workspaceID, fileID string) (*model.ShortsProject, bool, error) {
	var p model.ShortsProject
	var contentType, status string
	var settings []byte
	err := r.pool.QueryRow(ctx, `SELECT s.id,s.workspace_id,s.created_by_user_id,s.source_file_id,s.content_type,s.language,s.status,s.source_duration_seconds,s.processing_minutes_reserved,s.processing_minutes_consumed,s.source_expires_at,s.audio_file_id,s.audio_expires_at,s.settings,s.created_at,s.updated_at FROM shorts_sources s WHERE s.workspace_id=$1 AND s.source_file_id=$2 AND s.status IN ('completed','draft') ORDER BY s.created_at DESC LIMIT 1`, workspaceID, fileID).Scan(&p.ID, &p.WorkspaceID, &p.CreatedByUserID, &p.SourceFileID, &contentType, &p.Language, &status, &p.SourceDurationSeconds, &p.ProcessingMinutesReserved, &p.ProcessingMinutesConsumed, &p.SourceExpiresAt, &p.AudioFileID, &p.AudioExpiresAt, &settings, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	p.ContentType, p.Status, p.Settings = model.ShortsContentType(contentType), model.ShortsProjectStatus(status), json.RawMessage(settings)
	return &p, true, nil
}

func (r *ShortsRepository) CreateDefaultEditProjectForSource(ctx context.Context, workspaceID, sourceID string) error {
	var userID string
	if err := r.pool.QueryRow(ctx, `SELECT created_by_user_id FROM shorts_sources WHERE id=$1 AND workspace_id=$2`, sourceID, workspaceID).Scan(&userID); err != nil {
		return err
	}
	var exists bool
	if err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM shorts_edit_projects WHERE source_id=$1)`, sourceID).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return nil
	}
	_, err := r.CreateEditProject(ctx, workspaceID, userID, sourceID, "Montage 1")
	return err
}

func (r *ShortsRepository) RenameEditProject(ctx context.Context, workspaceID, projectID, name string) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_edit_projects SET name=$1, updated_at=now() WHERE id=$2 AND workspace_id=$3`, name, projectID, workspaceID)
	return err
}

func (r *ShortsRepository) CreateEditProject(ctx context.Context, workspaceID, userID, sourceID, name string) (*model.ShortsProject, error) {
	if name == "" {
		name = "Р В Р’В Р вЂ™Р’В Р В Р Р‹Р РЋРІвЂћСћР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р В Р вЂ№Р В Р вЂ Р В РІР‚С™Р РЋРІвЂћСћР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶ Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В· Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В·Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р В Р вЂ№Р В Р’В Р В Р РЏ"
	}
	var p model.ShortsProject
	var status string
	var settings []byte
	err := r.pool.QueryRow(ctx, `INSERT INTO shorts_edit_projects (source_id,workspace_id,created_by_user_id,name,settings) SELECT s.id,$2::uuid,$3::uuid,$4::text,jsonb_build_object('subtitle_style',COALESCE(s.settings->'subtitle_style',to_jsonb('classic'::text)),'subtitle_position',COALESCE(s.settings->'subtitle_position',to_jsonb('bottom'::text)),'subtitle_font_size',COALESCE(s.settings->'subtitle_font_size',to_jsonb(58)),'subtitle_text_color',COALESCE(s.settings->'subtitle_text_color',to_jsonb('#FFFFFF'::text)),'subtitle_background',COALESCE(s.settings->'subtitle_background',to_jsonb('#101010'::text)),'watermark',COALESCE(s.settings->'watermark',to_jsonb(''::text)),'safe_zone',COALESCE(s.settings->'safe_zone',to_jsonb(70))) FROM shorts_sources s WHERE s.id=$1 AND s.workspace_id=$2 RETURNING id,source_id,workspace_id,created_by_user_id,status,settings,created_at,updated_at,name`, sourceID, workspaceID, userID, name).Scan(&p.ID, &p.SourceID, &p.WorkspaceID, &p.CreatedByUserID, &status, &settings, &p.CreatedAt, &p.UpdatedAt, &p.Name)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	p.Status, p.IsEditProject, p.Settings = model.ShortsProjectStatus(status), true, json.RawMessage(settings)
	if err := r.AddAllSourceClipsToEditProject(ctx, workspaceID, p.ID, sourceID); err != nil {
		_, _ = r.pool.Exec(ctx, `DELETE FROM shorts_edit_projects WHERE id=$1`, p.ID)
		return nil, err
	}
	return &p, nil
}

func (r *ShortsRepository) AddAllSourceClipsToEditProject(ctx context.Context, workspaceID, editProjectID, sourceID string) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO shorts_edit_project_clips (edit_project_id,clip_id,position,start_seconds,end_seconds,transcript_text,included) SELECT $2,c.id,row_number() OVER (ORDER BY COALESCE((c.score_details->>'order')::int,c.start_seconds::int),c.start_seconds)::int-1,c.start_seconds,c.end_seconds,c.transcript_text,true FROM shorts_clips c JOIN shorts_sources s ON s.id=c.source_id JOIN shorts_edit_projects ep ON ep.id=$2 AND ep.source_id=s.id WHERE s.id=$1 AND s.workspace_id=$3 ON CONFLICT (edit_project_id,clip_id) DO NOTHING`, sourceID, editProjectID, workspaceID)
	return err
}

func (r *ShortsRepository) GetEditProject(ctx context.Context, workspaceID, projectID string) (*model.ShortsProject, error) {
	var p model.ShortsProject
	var contentType, status, editName string
	var settings []byte
	err := r.pool.QueryRow(ctx, `SELECT ep.id,ep.source_id,ep.workspace_id,ep.created_by_user_id,s.source_file_id,s.content_type,s.language,ep.status,s.source_duration_seconds,s.processing_minutes_reserved,s.processing_minutes_consumed,s.source_expires_at,s.audio_file_id,s.audio_expires_at,ep.settings,ep.created_at,ep.updated_at,ep.name FROM shorts_edit_projects ep JOIN shorts_sources s ON s.id=ep.source_id WHERE ep.id=$1 AND ep.workspace_id=$2`, projectID, workspaceID).Scan(&p.ID, &p.SourceID, &p.WorkspaceID, &p.CreatedByUserID, &p.SourceFileID, &contentType, &p.Language, &status, &p.SourceDurationSeconds, &p.ProcessingMinutesReserved, &p.ProcessingMinutesConsumed, &p.SourceExpiresAt, &p.AudioFileID, &p.AudioExpiresAt, &settings, &p.CreatedAt, &p.UpdatedAt, &editName)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	p.ContentType, p.Status, p.IsEditProject, p.Name, p.Settings = model.ShortsContentType(contentType), model.ShortsProjectStatus(status), true, editName, json.RawMessage(settings)
	return &p, nil
}

func (r *ShortsRepository) UpdateLegacyProjectStatus(ctx context.Context, workspaceID, projectID string, status model.ShortsProjectStatus, step string) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_projects SET status=$1,settings=jsonb_set(settings,'{current_step}',to_jsonb($2::text),true),updated_at=now() WHERE id=$3 AND workspace_id=$4`, status, step, projectID, workspaceID)
	return err
}

func (r *ShortsRepository) SetTranscript(ctx context.Context, workspaceID, projectID string, transcript any) error {
	raw, err := json.Marshal(transcript)
	if err != nil {
		return err
	}
	if _, err := r.pool.Exec(ctx, `UPDATE shorts_projects SET settings=jsonb_set(settings,'{transcript}',$1::jsonb,true),updated_at=now() WHERE id=$2 AND workspace_id=$3`, raw, projectID, workspaceID); err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `UPDATE shorts_sources SET settings=jsonb_set(settings,'{transcript}',$1::jsonb,true),updated_at=now() WHERE id=$2 AND workspace_id=$3`, raw, projectID, workspaceID)
	return err
}

func (r *ShortsRepository) SetTranscriptResult(ctx context.Context, workspaceID, projectID string, result any) error {
	raw, err := json.Marshal(result)
	if err != nil {
		return err
	}
	if _, err := r.pool.Exec(ctx, `UPDATE shorts_projects SET settings=jsonb_set(settings,'{transcript_result}',$1::jsonb,true),updated_at=now() WHERE id=$2 AND workspace_id=$3`, raw, projectID, workspaceID); err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `UPDATE shorts_sources SET settings=jsonb_set(settings,'{transcript_result}',$1::jsonb,true),updated_at=now() WHERE id=$2 AND workspace_id=$3`, raw, projectID, workspaceID)
	return err
}

func (r *ShortsRepository) SetSubtitleSettings(ctx context.Context, workspaceID, projectID, style, position string, fontSize int, textColor, background, watermark string, safeZone int) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_edit_projects SET settings = settings || jsonb_build_object('subtitle_style',$1::text,'subtitle_position',$2::text,'subtitle_font_size',$3::int,'subtitle_text_color',$4::text,'subtitle_background',$5::text,'watermark',$6::text,'safe_zone',$7::int), updated_at = now() WHERE id = $8 AND workspace_id = $9`, style, position, fontSize, textColor, background, watermark, safeZone, projectID, workspaceID)
	return err
}

func (r *ShortsRepository) ListEditProjectJobs(ctx context.Context, workspaceID string) (map[string]*model.ShortsJob, error) {
	rows, err := r.pool.Query(ctx, `SELECT DISTINCT ON(j.edit_project_id) j.id,j.source_id,j.edit_project_id,j.job_type,j.status,j.current_step,j.progress,j.attempts,j.available_at,COALESCE(j.last_error,''),j.created_at,j.updated_at FROM shorts_jobs j JOIN shorts_edit_projects ep ON ep.id=j.edit_project_id WHERE ep.workspace_id=$1 ORDER BY j.edit_project_id,j.created_at DESC`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]*model.ShortsJob{}
	for rows.Next() {
		var j model.ShortsJob
		var status string
		var lastError *string
		if err := rows.Scan(&j.ID, &j.SourceID, &j.EditProjectID, &j.JobType, &status, &j.CurrentStep, &j.Progress, &j.Attempts, &j.AvailableAt, &lastError, &j.CreatedAt, &j.UpdatedAt); err != nil {
			return nil, err
		}
		if lastError != nil {
			j.LastError = *lastError
		}
		j.Status = model.ShortsJobStatus(status)
		j.ProjectID = j.EditProjectID
		out[j.EditProjectID] = &j
	}
	return out, rows.Err()
}

func (r *ShortsRepository) SetClipOrder(ctx context.Context, workspaceID, projectID string, clipIDs []string) error {
	if len(clipIDs) == 0 {
		tag, err := r.pool.Exec(ctx, `UPDATE shorts_edit_projects SET updated_at=now() WHERE id=$1 AND workspace_id=$2`, projectID, workspaceID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return ErrNotFound
		}
		return nil
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var expected int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM shorts_edit_project_clips ec JOIN shorts_edit_projects ep ON ep.id=ec.edit_project_id WHERE ep.id=$1 AND ep.workspace_id=$2`, projectID, workspaceID).Scan(&expected); err != nil {
		return err
	}
	if expected != len(clipIDs) {
		return ErrNotFound
	}
	seen := make(map[string]struct{}, len(clipIDs))
	for order, clipID := range clipIDs {
		if _, ok := seen[clipID]; ok {
			return ErrNotFound
		}
		seen[clipID] = struct{}{}
		tag, err := tx.Exec(ctx, `UPDATE shorts_edit_project_clips ec SET position=$1,updated_at=now() FROM shorts_edit_projects ep WHERE ec.clip_id=$2 AND ec.edit_project_id=ep.id AND ep.id=$3 AND ep.workspace_id=$4`, order, clipID, projectID, workspaceID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() != 1 {
			return ErrNotFound
		}
	}
	if _, err := tx.Exec(ctx, `UPDATE shorts_edit_projects SET updated_at=now() WHERE id=$1 AND workspace_id=$2`, projectID, workspaceID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *ShortsRepository) ListClips(ctx context.Context, workspaceID, projectID string) ([]model.ShortsClip, error) {
	rows, err := r.pool.Query(ctx, `SELECT c.id, c.source_id, c.start_seconds, c.end_seconds, c.transcript_text, c.score, c.score_details, c.crop_config, c.subtitle_config, c.overlay_config, c.status, c.draft_file_id, c.final_file_id, c.created_at, c.updated_at, COALESCE(epc.included, c.status IN ('selected','draft')) FROM shorts_clips c JOIN shorts_sources s ON s.id=c.source_id LEFT JOIN shorts_edit_project_clips epc ON epc.clip_id=c.id AND epc.edit_project_id=$1 WHERE s.id=COALESCE((SELECT source_id FROM shorts_edit_projects WHERE id=$1 AND workspace_id=$2),$1) AND s.workspace_id=$2 AND ($1::uuid=s.id OR epc.clip_id IS NOT NULL) ORDER BY COALESCE(epc.position,(c.score_details->>'order')::int,c.start_seconds::int),c.start_seconds`, projectID, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.ShortsClip, 0)
	for rows.Next() {
		var c model.ShortsClip
		var scoreDetails, crop, subtitle, overlays []byte
		if err := rows.Scan(&c.ID, &c.SourceID, &c.StartSeconds, &c.EndSeconds, &c.TranscriptText, &c.Score, &scoreDetails, &crop, &subtitle, &overlays, &c.Status, &c.DraftFileID, &c.FinalFileID, &c.CreatedAt, &c.UpdatedAt, &c.Included); err != nil {
			return nil, err
		}
		c.ScoreDetails, c.CropConfig, c.SubtitleConfig, c.OverlayConfig = json.RawMessage(scoreDetails), json.RawMessage(crop), json.RawMessage(subtitle), json.RawMessage(overlays)
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *ShortsRepository) ReplaceCandidates(ctx context.Context, workspaceID, projectID string, candidates []model.ShortsClip) error {
	if len(candidates) == 0 {
		return fmt.Errorf("analysis returned no candidate clips")
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var exists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM shorts_sources WHERE id = $1 AND workspace_id = $2 FOR UPDATE)`, projectID, workspaceID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}
	if _, err := tx.Exec(ctx, `DELETE FROM shorts_clips WHERE source_id = $1 AND NOT EXISTS (SELECT 1 FROM shorts_edit_project_clips ec WHERE ec.clip_id=shorts_clips.id)`, projectID); err != nil {
		return err
	}
	for _, c := range candidates {
		if _, err := tx.Exec(ctx, `INSERT INTO shorts_clips (source_id, start_seconds, end_seconds, transcript_text, score, score_details, status) VALUES ($1,$2,$3,$4,$5,$6::jsonb,'candidate')`, projectID, c.StartSeconds, c.EndSeconds, c.TranscriptText, c.Score, []byte(c.ScoreDetails)); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *ShortsRepository) SetClipDraft(ctx context.Context, workspaceID, clipID, fileID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_clips c SET draft_file_id = $1, updated_at = now() FROM shorts_sources s WHERE c.id = $2 AND s.id = c.source_id AND s.workspace_id = $3`, fileID, clipID, workspaceID)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `UPDATE shorts_clips SET status='draft' WHERE id=$1`, clipID)
	return err
}

func (r *ShortsRepository) ListCandidateClips(ctx context.Context, workspaceID, projectID string) ([]model.ShortsClip, error) {
	rows, err := r.pool.Query(ctx, `SELECT c.id, c.source_id, c.start_seconds, c.end_seconds, c.transcript_text, c.score, c.score_details, c.crop_config, c.subtitle_config, c.overlay_config, c.status, c.draft_file_id, c.final_file_id, c.created_at, c.updated_at FROM shorts_clips c JOIN shorts_sources s ON s.id = c.source_id WHERE c.source_id = $1 AND s.workspace_id = $2 ORDER BY c.start_seconds`, projectID, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.ShortsClip, 0)
	for rows.Next() {
		var c model.ShortsClip
		var status string
		var scoreDetails, crop, subtitle, overlays []byte
		if err := rows.Scan(&c.ID, &c.SourceID, &c.StartSeconds, &c.EndSeconds, &c.TranscriptText, &c.Score, &scoreDetails, &crop, &subtitle, &overlays, &status, &c.DraftFileID, &c.FinalFileID, &c.CreatedAt, &c.UpdatedAt); err != nil {
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
	err := r.pool.QueryRow(ctx, `SELECT c.id, c.source_id, c.start_seconds, c.end_seconds, c.transcript_text, c.score, c.score_details, c.crop_config, c.subtitle_config, c.overlay_config, c.status, c.draft_file_id, c.final_file_id, c.created_at, c.updated_at FROM shorts_clips c JOIN shorts_sources s ON s.id = c.source_id WHERE c.id = $1 AND s.workspace_id = $2`, clipID, workspaceID).Scan(&c.ID, &c.SourceID, &c.StartSeconds, &c.EndSeconds, &c.TranscriptText, &c.Score, &scoreDetails, &crop, &subtitle, &overlays, &status, &c.DraftFileID, &c.FinalFileID, &c.CreatedAt, &c.UpdatedAt)
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
	var p model.ShortsProject
	var contentType, status string
	var settings []byte
	err := r.pool.QueryRow(ctx, `SELECT ep.id,ep.source_id,ep.workspace_id,ep.created_by_user_id,s.source_file_id,s.content_type,s.language,ep.status,s.source_duration_seconds,s.processing_minutes_reserved,s.processing_minutes_consumed,s.source_expires_at,s.audio_file_id,s.audio_expires_at,ep.settings,ep.created_at,ep.updated_at FROM shorts_edit_projects ep JOIN shorts_sources s ON s.id=ep.source_id JOIN shorts_edit_project_clips ec ON ec.edit_project_id=ep.id JOIN shorts_clips c ON c.id=ec.clip_id WHERE c.id=$1 AND ep.workspace_id=$2 ORDER BY ep.created_at DESC LIMIT 1`, clipID, workspaceID).Scan(&p.ID, &p.SourceID, &p.WorkspaceID, &p.CreatedByUserID, &p.SourceFileID, &contentType, &p.Language, &status, &p.SourceDurationSeconds, &p.ProcessingMinutesReserved, &p.ProcessingMinutesConsumed, &p.SourceExpiresAt, &p.AudioFileID, &p.AudioExpiresAt, &settings, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	p.ContentType = model.ShortsContentType(contentType)
	p.Status = model.ShortsProjectStatus(status)
	p.IsEditProject = true
	p.Settings = json.RawMessage(settings)
	return &p, nil
}

func (r *ShortsRepository) GetEditClip(ctx context.Context, workspaceID, editProjectID, clipID string) (*model.ShortsClip, error) {
	clips, err := r.ListClips(ctx, workspaceID, editProjectID)
	if err != nil {
		return nil, err
	}
	for i := range clips {
		if clips[i].ID == clipID {
			return &clips[i], nil
		}
	}
	return nil, ErrNotFound
}

func (r *ShortsRepository) DeleteClip(ctx context.Context, workspaceID, editProjectID, clipID string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM shorts_edit_project_clips epc USING shorts_edit_projects ep WHERE epc.edit_project_id=ep.id AND epc.clip_id=$1 AND ep.id=$2 AND ep.workspace_id=$3`, clipID, editProjectID, workspaceID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	_, err = r.pool.Exec(ctx, `UPDATE shorts_edit_projects SET updated_at=now() WHERE id=$1 AND workspace_id=$2`, editProjectID, workspaceID)
	return err
}

func (r *ShortsRepository) UpdateClip(ctx context.Context, workspaceID, editProjectID, clipID string, input model.ShortsClipUpdate) (*model.ShortsClip, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var c model.ShortsClip
	var status string
	var scoreDetails, crop, subtitle, overlays []byte
	err = tx.QueryRow(ctx, `
		UPDATE shorts_clips c SET status = $4, updated_at = now()
		FROM shorts_sources s, shorts_edit_project_clips epc, shorts_edit_projects ep
		WHERE c.id = $5 AND c.source_id = s.id AND s.workspace_id = $6 AND epc.clip_id = c.id AND epc.edit_project_id = ep.id AND ep.id = $7 AND ep.workspace_id = $6
		RETURNING c.id, c.source_id, $1::numeric, $2::numeric, $3::text, c.score, c.score_details, c.crop_config, c.subtitle_config, c.overlay_config, c.status, c.draft_file_id, c.final_file_id, c.created_at, c.updated_at
	`, input.StartSeconds, input.EndSeconds, input.TranscriptText, input.Status, clipID, workspaceID, editProjectID).Scan(&c.ID, &c.SourceID, &c.StartSeconds, &c.EndSeconds, &c.TranscriptText, &c.Score, &scoreDetails, &crop, &subtitle, &overlays, &status, &c.DraftFileID, &c.FinalFileID, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `UPDATE shorts_edit_project_clips SET start_seconds=$1, end_seconds=$2, transcript_text=$3, included=$4, updated_at=now() WHERE edit_project_id=$5 AND clip_id=$6`, input.StartSeconds, input.EndSeconds, input.TranscriptText, input.Status == "selected" || input.Status == "draft", editProjectID, clipID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	c.Status = status
	c.ScoreDetails, c.CropConfig, c.SubtitleConfig, c.OverlayConfig = json.RawMessage(scoreDetails), json.RawMessage(crop), json.RawMessage(subtitle), json.RawMessage(overlays)
	return &c, nil
}

func (r *ShortsRepository) CreateJob(ctx context.Context, sourceID, jobType string) (*model.ShortsJob, error) {
	var j model.ShortsJob
	var status string
	var lastError *string
	err := r.pool.QueryRow(ctx, `INSERT INTO shorts_jobs (source_id, job_type) VALUES ($1, $2) RETURNING id, source_id, job_type, status, current_step, progress, attempts, available_at, last_error, created_at, updated_at`, sourceID, jobType).Scan(&j.ID, &j.SourceID, &j.JobType, &status, &j.CurrentStep, &j.Progress, &j.Attempts, &j.AvailableAt, &lastError, &j.CreatedAt, &j.UpdatedAt)
	if lastError != nil {
		j.LastError = *lastError
	}
	j.Status = model.ShortsJobStatus(status)
	return &j, err
}

func (r *ShortsRepository) CreateRerenderJob(ctx context.Context, workspaceID, projectID string) (*model.ShortsJob, error) {
	return r.createEditJob(ctx, workspaceID, projectID, "rerender")
}

func (r *ShortsRepository) createEditJob(ctx context.Context, workspaceID, projectID, jobType string) (*model.ShortsJob, error) {
	var j model.ShortsJob
	var status string
	err := r.pool.QueryRow(ctx, `INSERT INTO shorts_jobs (source_id, edit_project_id, job_type) SELECT ep.source_id,ep.id,$3 FROM shorts_edit_projects ep WHERE ep.id=$1 AND ep.workspace_id=$2 AND NOT EXISTS (SELECT 1 FROM shorts_jobs WHERE edit_project_id=ep.id AND status IN ('queued','running')) RETURNING id,source_id,edit_project_id,job_type,status,current_step,progress,attempts,available_at,last_error,created_at,updated_at`, projectID, workspaceID, jobType).Scan(&j.ID, &j.SourceID, &j.EditProjectID, &j.JobType, &status, &j.CurrentStep, &j.Progress, &j.Attempts, &j.AvailableAt, &j.LastError, &j.CreatedAt, &j.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	j.Status = model.ShortsJobStatus(status)
	return &j, err
}

func (r *ShortsRepository) CreateExportJob(ctx context.Context, workspaceID, projectID string) (*model.ShortsJob, error) {
	return r.createEditJob(ctx, workspaceID, projectID, "export")
}

func (r *ShortsRepository) CreateSourceJob(ctx context.Context, workspaceID, sourceID, jobType string) (*model.ShortsJob, error) {
	var j model.ShortsJob
	var status string
	var lastError *string
	err := r.pool.QueryRow(ctx, `INSERT INTO shorts_jobs (source_id,job_type) SELECT $1,$3 WHERE EXISTS (SELECT 1 FROM shorts_sources WHERE id=$1 AND workspace_id=$2) AND NOT EXISTS (SELECT 1 FROM shorts_jobs WHERE source_id=$1 AND status IN ('queued','running')) RETURNING id,source_id,job_type,status,current_step,progress,attempts,available_at,last_error,created_at,updated_at`, sourceID, workspaceID, jobType).Scan(&j.ID, &j.SourceID, &j.JobType, &status, &j.CurrentStep, &j.Progress, &j.Attempts, &j.AvailableAt, &lastError, &j.CreatedAt, &j.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		err = r.pool.QueryRow(ctx, `SELECT id,source_id,job_type,status,current_step,progress,attempts,available_at,last_error,created_at,updated_at FROM shorts_jobs WHERE source_id=$1 AND status IN ('queued','running') ORDER BY created_at DESC LIMIT 1`, sourceID).Scan(&j.ID, &j.SourceID, &j.JobType, &status, &j.CurrentStep, &j.Progress, &j.Attempts, &j.AvailableAt, &lastError, &j.CreatedAt, &j.UpdatedAt)
	}
	if err != nil {
		return nil, err
	}
	if lastError != nil {
		j.LastError = *lastError
	}
	j.Status = model.ShortsJobStatus(status)
	j.ProjectID = sourceID
	return &j, nil
}

func (r *ShortsRepository) CreateAnalyzeJob(ctx context.Context, workspaceID, projectID string) (*model.ShortsJob, error) {
	var j model.ShortsJob
	var status string
	var lastError *string
	err := r.pool.QueryRow(ctx, `
		INSERT INTO shorts_jobs (source_id, job_type)
		SELECT $1, 'analyze'
		WHERE EXISTS (SELECT 1 FROM shorts_sources WHERE id=$1 AND workspace_id=$2)
		AND NOT EXISTS (SELECT 1 FROM shorts_jobs WHERE source_id=$1 AND status IN ('queued','running'))
		RETURNING id, source_id, job_type, status, current_step, progress, attempts, available_at, last_error, created_at, updated_at
	`, projectID, workspaceID).Scan(&j.ID, &j.SourceID, &j.JobType, &status, &j.CurrentStep, &j.Progress, &j.Attempts, &j.AvailableAt, &lastError, &j.CreatedAt, &j.UpdatedAt)
	if lastError != nil {
		j.LastError = *lastError
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	j.Status = model.ShortsJobStatus(status)
	return &j, err
}

func (r *ShortsRepository) GetFinalFileID(ctx context.Context, workspaceID, projectID string) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx, `SELECT settings->>'final_file_id' FROM shorts_edit_projects WHERE id=$1 AND workspace_id=$2`, projectID, workspaceID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		err = r.pool.QueryRow(ctx, `SELECT settings->>'final_file_id' FROM shorts_projects WHERE id=$1 AND workspace_id=$2`, projectID, workspaceID).Scan(&id)
	}
	if errors.Is(err, pgx.ErrNoRows) || id == "" {
		return "", ErrNotFound
	}
	return id, err
}

func (r *ShortsRepository) CreateLegacyProject(ctx context.Context, sourceID string) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO shorts_projects (id,source_id,workspace_id,created_by_user_id,source_file_id,content_type,language,status,source_duration_seconds,processing_minutes_reserved,processing_minutes_consumed,source_expires_at,audio_file_id,audio_expires_at,settings,created_at,updated_at) SELECT id,id,workspace_id,created_by_user_id,source_file_id,content_type,language,status,source_duration_seconds,processing_minutes_reserved,processing_minutes_consumed,source_expires_at,audio_file_id,audio_expires_at,settings,created_at,updated_at FROM shorts_sources WHERE id=$1 ON CONFLICT (id) DO NOTHING`, sourceID)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `UPDATE shorts_jobs SET job_type='legacy_'||job_type WHERE source_id=$1 AND edit_project_id IS NULL AND job_type IN ('export','rerender')`, sourceID)
	return err
}

func (r *ShortsRepository) EnsureEditProjectClips(ctx context.Context, workspaceID, projectID string) error {
	p, err := r.GetEditProject(ctx, workspaceID, projectID)
	if err != nil {
		return err
	}
	return r.AddAllSourceClipsToEditProject(ctx, workspaceID, projectID, p.SourceID)
}

func (r *ShortsRepository) DeleteProject(ctx context.Context, workspaceID, projectID string) error {
	return r.deleteProject(ctx, &workspaceID, projectID)
}

// DeleteProjectAsAdmin removes the complete Shorts graph for any workspace.
// Workspace files are deliberately preserved because the source video belongs
// to the user's media library, not to the Shorts analysis record.
func (r *ShortsRepository) DeleteProjectAsAdmin(ctx context.Context, projectID string) error {
	return r.deleteProject(ctx, nil, projectID)
}

func (r *ShortsRepository) deleteProject(ctx context.Context, workspaceID *string, projectID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var sourceID string
	var found bool
	if workspaceID != nil {
		err = tx.QueryRow(ctx, `SELECT source_id FROM shorts_edit_projects WHERE id=$1 AND workspace_id=$2`, projectID, *workspaceID).Scan(&sourceID)
		if err == nil {
			found = true
		}
		if errors.Is(err, pgx.ErrNoRows) {
			err = tx.QueryRow(ctx, `SELECT id FROM shorts_sources WHERE id=$1 AND workspace_id=$2`, projectID, *workspaceID).Scan(&sourceID)
			if err == nil {
				found = true
			}
		}
		if errors.Is(err, pgx.ErrNoRows) {
			err = tx.QueryRow(ctx, `SELECT COALESCE(source_id,id) FROM shorts_projects WHERE id=$1 AND workspace_id=$2`, projectID, *workspaceID).Scan(&sourceID)
			if err == nil {
				found = true
			}
		}
	} else {
		err = tx.QueryRow(ctx, `SELECT source_id FROM shorts_edit_projects WHERE id=$1`, projectID).Scan(&sourceID)
		if err == nil {
			found = true
		}
		if errors.Is(err, pgx.ErrNoRows) {
			err = tx.QueryRow(ctx, `SELECT id FROM shorts_sources WHERE id=$1`, projectID).Scan(&sourceID)
			if err == nil {
				found = true
			}
		}
		if errors.Is(err, pgx.ErrNoRows) {
			err = tx.QueryRow(ctx, `SELECT COALESCE(source_id,id) FROM shorts_projects WHERE id=$1`, projectID).Scan(&sourceID)
			if err == nil {
				found = true
			}
		}
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	if !found {
		return ErrNotFound
	}

	// A direct edit deletion keeps the reusable source and other montages.
	var isEdit bool
	if workspaceID != nil {
		err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM shorts_edit_projects WHERE id=$1 AND workspace_id=$2)`, projectID, *workspaceID).Scan(&isEdit)
	} else {
		err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM shorts_edit_projects WHERE id=$1)`, projectID).Scan(&isEdit)
	}
	if err != nil {
		return err
	}
	if isEdit {
		if workspaceID != nil {
			_, err = tx.Exec(ctx, `DELETE FROM shorts_edit_projects WHERE id=$1 AND workspace_id=$2`, projectID, *workspaceID)
		} else {
			_, err = tx.Exec(ctx, `DELETE FROM shorts_edit_projects WHERE id=$1`, projectID)
		}
		if err != nil {
			return err
		}
		return tx.Commit(ctx)
	}

	if workspaceID != nil {
		_, err = tx.Exec(ctx, `DELETE FROM shorts_sources WHERE id=$1 AND workspace_id=$2`, sourceID, *workspaceID)
	} else {
		_, err = tx.Exec(ctx, `DELETE FROM shorts_sources WHERE id=$1`, sourceID)
	}
	if err != nil {
		return err
	}
	if workspaceID != nil {
		_, _ = tx.Exec(ctx, `DELETE FROM shorts_projects WHERE source_id=$1 AND workspace_id=$2`, sourceID, *workspaceID)
	} else {
		_, _ = tx.Exec(ctx, `DELETE FROM shorts_projects WHERE source_id=$1`, sourceID)
	}
	return tx.Commit(ctx)
}

func (r *ShortsRepository) GetSourceJob(ctx context.Context, workspaceID, sourceID string) (*model.ShortsJob, error) {
	var j model.ShortsJob
	var status string
	var lastError *string
	err := r.pool.QueryRow(ctx, `SELECT id,j.source_id,COALESCE(j.edit_project_id::text,''),j.job_type,j.status,j.current_step,j.progress,j.attempts,j.available_at,COALESCE(j.last_error,''),j.created_at,j.updated_at FROM shorts_jobs j JOIN shorts_sources s ON s.id=j.source_id WHERE j.source_id=$1 AND s.workspace_id=$2 AND j.job_type='analyze' ORDER BY j.created_at DESC LIMIT 1`, sourceID, workspaceID).Scan(&j.ID, &j.SourceID, &j.EditProjectID, &j.JobType, &status, &j.CurrentStep, &j.Progress, &j.Attempts, &j.AvailableAt, &lastError, &j.CreatedAt, &j.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if lastError != nil {
		j.LastError = *lastError
	}
	j.Status = model.ShortsJobStatus(status)
	j.ProjectID = sourceID
	return &j, nil
}

func (r *ShortsRepository) GetJob(ctx context.Context, workspaceID, jobID string) (*model.ShortsJob, error) {
	var j model.ShortsJob
	var status string
	var lastError *string
	err := r.pool.QueryRow(ctx, `SELECT j.id,j.source_id,COALESCE(j.edit_project_id::text,''),j.job_type,j.status,j.current_step,j.progress,j.attempts,j.available_at,COALESCE(j.last_error,''),j.created_at,j.updated_at FROM shorts_jobs j JOIN shorts_sources s ON s.id=j.source_id WHERE j.id=$1 AND s.workspace_id=$2`, jobID, workspaceID).Scan(&j.ID, &j.SourceID, &j.EditProjectID, &j.JobType, &status, &j.CurrentStep, &j.Progress, &j.Attempts, &j.AvailableAt, &lastError, &j.CreatedAt, &j.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if lastError != nil {
		j.LastError = *lastError
	}
	j.Status = model.ShortsJobStatus(status)
	return &j, nil
}

func (r *ShortsRepository) SetAudio(ctx context.Context, workspaceID, projectID, fileID string, expiresAt time.Time) error {
	if _, err := r.pool.Exec(ctx, `UPDATE shorts_projects SET audio_file_id=$1,audio_expires_at=$2,updated_at=now() WHERE id=$3 AND workspace_id=$4`, fileID, expiresAt, projectID, workspaceID); err != nil {
		return err
	}
	_, err := r.pool.Exec(ctx, `UPDATE shorts_sources SET audio_file_id=$1,audio_expires_at=$2,updated_at=now() WHERE id=$3 AND workspace_id=$4`, fileID, expiresAt, projectID, workspaceID)
	return err
}

func (r *ShortsRepository) SetProjectFinalFile(ctx context.Context, workspaceID, projectID, fileID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_edit_projects SET status = 'completed', settings = jsonb_set(settings, '{final_file_id}', to_jsonb($1::text), true), updated_at = now() WHERE id = $2 AND workspace_id = $3`, fileID, projectID, workspaceID)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `UPDATE shorts_projects SET settings=jsonb_set(settings,'{final_file_id}',to_jsonb($1::text),true),updated_at=now() WHERE id=$2 AND workspace_id=$3`, fileID, projectID, workspaceID)
	return err
}

func (r *ShortsRepository) SetEditProjectStatus(ctx context.Context, workspaceID, projectID, status string) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_edit_projects SET status=$1, updated_at=now() WHERE id=$2 AND workspace_id=$3`, status, projectID, workspaceID)
	return err
}

func (r *ShortsRepository) ListEditProjectClips(ctx context.Context, workspaceID, projectID string) ([]model.ShortsClip, error) {
	clips, err := r.ListClips(ctx, workspaceID, projectID)
	if err != nil {
		return nil, err
	}
	for i := range clips {
		clips[i].ProjectID = projectID
	}
	return clips, nil
}

func (r *ShortsRepository) AddClipToEditProject(ctx context.Context, workspaceID, editProjectID, clipID string) error {
	tag, err := r.pool.Exec(ctx, `INSERT INTO shorts_edit_project_clips (edit_project_id,clip_id,position,start_seconds,end_seconds,transcript_text,included) SELECT ep.id,c.id,COALESCE((SELECT max(position)+1 FROM shorts_edit_project_clips WHERE edit_project_id=ep.id),0),c.start_seconds,c.end_seconds,c.transcript_text,true FROM shorts_edit_projects ep JOIN shorts_clips c ON c.source_id=ep.source_id JOIN shorts_sources s ON s.id=c.source_id WHERE ep.id=$1 AND ep.workspace_id=$2 AND c.id=$3 AND s.workspace_id=$2 ON CONFLICT (edit_project_id,clip_id) DO NOTHING`, editProjectID, workspaceID, clipID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	_, err = r.pool.Exec(ctx, `UPDATE shorts_edit_projects SET updated_at=now() WHERE id=$1 AND workspace_id=$2`, editProjectID, workspaceID)
	return err
}

type ShortsExpiredProject struct {
	ID           string
	WorkspaceID  string
	SourceFileID *string
	AudioFileID  *string
}

type ClaimedShortsJob struct {
	ID              string
	ProjectID       string
	SourceID        string
	EditProjectID   string
	WorkspaceID     string
	CreatedByUserID string
	ProjectName     string
	JobType         string
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
		FROM due, shorts_sources s
		WHERE j.id = due.id AND s.id = j.source_id
		RETURNING j.id, j.source_id, COALESCE(j.edit_project_id::text,''), s.workspace_id, s.created_by_user_id, COALESCE(s.settings->>'project_name',''), j.job_type
	`, limit, owner, lease.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]ClaimedShortsJob, 0)
	for rows.Next() {
		var item ClaimedShortsJob
		if err := rows.Scan(&item.ID, &item.SourceID, &item.EditProjectID, &item.WorkspaceID, &item.CreatedByUserID, &item.ProjectName, &item.JobType); err != nil {
			return nil, err
		}
		item.ProjectID = item.SourceID
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *ShortsRepository) UpdateJobProgress(ctx context.Context, jobID, owner, step string, progress int) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_jobs SET current_step = $1, progress = $2, updated_at = now() WHERE id = $3 AND lease_owner = $4 AND status = 'running'`, step, progress, jobID, owner)
	return err
}

func (r *ShortsRepository) CancelJob(ctx context.Context, workspaceID, jobID, message string) (*model.ShortsJob, error) {
	var j model.ShortsJob
	var status string
	err := r.pool.QueryRow(ctx, `UPDATE shorts_jobs j SET status='cancelled', current_step='cancelled', last_error=$1, lease_owner=NULL, lease_until=NULL, updated_at=now() FROM shorts_sources s WHERE j.id=$2 AND j.source_id=s.id AND s.workspace_id=$3 AND j.status IN ('queued','running') RETURNING j.id,j.source_id,j.job_type,j.status,j.current_step,j.progress,j.attempts,j.available_at,j.last_error,j.created_at,j.updated_at`, message, jobID, workspaceID).Scan(&j.ID, &j.SourceID, &j.JobType, &status, &j.CurrentStep, &j.Progress, &j.Attempts, &j.AvailableAt, &j.LastError, &j.CreatedAt, &j.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	j.Status = model.ShortsJobStatus(status)
	_, _ = r.pool.Exec(ctx, `UPDATE shorts_sources SET status='cancelled', updated_at=now() WHERE id=$1 AND workspace_id=$2`, j.SourceID, workspaceID)
	_, _ = r.pool.Exec(ctx, `UPDATE shorts_edit_projects SET status='cancelled', updated_at=now() WHERE source_id=$1 AND workspace_id=$2 AND status IN ('draft','analyzing','rendering')`, j.SourceID, workspaceID)
	return &j, err
}

func (r *ShortsRepository) CountCandidateClips(ctx context.Context, workspaceID, sourceID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT count(*) FROM shorts_clips c JOIN shorts_sources s ON s.id=c.source_id WHERE c.source_id=$1 AND s.workspace_id=$2`, sourceID, workspaceID).Scan(&count)
	return count, err
}

func (r *ShortsRepository) CompleteJob(ctx context.Context, jobID, owner, projectID, workspaceID string, projectStatus model.ShortsProjectStatus, projectStep string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `UPDATE shorts_jobs SET status='succeeded',progress=100,current_step='completed',lease_owner=NULL,lease_until=NULL,updated_at=now() WHERE id=$1 AND lease_owner=$2`, jobID, owner); err != nil {
		return err
	}
	var editProjectID *string
	if err := tx.QueryRow(ctx, `SELECT edit_project_id FROM shorts_jobs WHERE id=$1`, jobID).Scan(&editProjectID); err != nil {
		return err
	}
	if editProjectID == nil {
		if _, err := tx.Exec(ctx, `UPDATE shorts_sources SET status=$1,settings=jsonb_set(settings,'{current_step}',to_jsonb($2::text),true),updated_at=now() WHERE id=$3 AND workspace_id=$4`, projectStatus, projectStep, projectID, workspaceID); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE shorts_projects SET status=$1,settings=jsonb_set(settings,'{current_step}',to_jsonb($2::text),true),updated_at=now() WHERE id=$3 AND workspace_id=$4`, projectStatus, projectStep, projectID, workspaceID); err != nil {
			return err
		}
	} else if _, err := tx.Exec(ctx, `UPDATE shorts_edit_projects SET status=$1,updated_at=now() WHERE id=$3 AND workspace_id=$4`, projectStatus, projectStep, *editProjectID, workspaceID); err != nil {
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
		FROM shorts_sources
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
	_, err := r.pool.Exec(ctx, `UPDATE shorts_sources SET source_file_id = NULL, source_expires_at = NULL, updated_at = now() WHERE id = $1`, projectID)
	return err
}

func (r *ShortsRepository) ClearExpiredAudio(ctx context.Context, projectID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE shorts_sources SET audio_file_id = NULL, audio_expires_at = NULL, updated_at = now() WHERE id = $1`, projectID)
	return err
}
