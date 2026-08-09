package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/postilka/postilka/internal/model"
)

type ListFilesAdminFilter struct {
	Query            string
	WorkspaceID      string
	FolderID         *string
	FolderRoot       bool
	UploadedByUserID string
	TypeFilter       string
	CreatedFrom      *time.Time
	CreatedTo        *time.Time
	SizeMin          *int64
	SizeMax          *int64
	DeletedOnly      *bool
	Limit            int
	Offset           int
}

func (r *WorkspaceFileRepository) AdminStats(ctx context.Context, f ListFilesAdminFilter) (*model.AdminFileStats, error) {
	statsFilter := f
	statsFilter.DeletedOnly = nil
	where, args := buildAdminFilesWhere(statsFilter, "f")
	q := `
		SELECT
			COUNT(*) FILTER (WHERE f.deleted_at IS NULL),
			COALESCE(SUM(f.size) FILTER (WHERE f.deleted_at IS NULL), 0),
			COUNT(*) FILTER (WHERE f.deleted_at IS NOT NULL),
			COALESCE(SUM(f.size) FILTER (WHERE f.deleted_at IS NOT NULL), 0)
		FROM workspace_files f
		JOIN workspaces w ON w.id = f.workspace_id
		LEFT JOIN workspace_folders fo ON fo.id = f.folder_id
		LEFT JOIN users u ON u.id = f.uploaded_by_user_id
	` + where

	var stats model.AdminFileStats
	if err := r.pool.QueryRow(ctx, q, args...).Scan(
		&stats.TotalFiles, &stats.TotalBytes, &stats.TrashFiles, &stats.TrashBytes,
	); err != nil {
		return nil, err
	}
	return &stats, nil
}

func (r *WorkspaceFileRepository) ListForAdmin(ctx context.Context, f ListFilesAdminFilter) ([]model.AdminFileListItem, int, error) {
	if f.Limit <= 0 || f.Limit > 200 {
		f.Limit = 50
	}
	if f.Offset < 0 {
		f.Offset = 0
	}

	where, args := buildAdminFilesWhere(f, "f")

	countQ := `
		SELECT COUNT(*)
		FROM workspace_files f
		JOIN workspaces w ON w.id = f.workspace_id
		LEFT JOIN workspace_folders fo ON fo.id = f.folder_id
		LEFT JOIN users u ON u.id = f.uploaded_by_user_id
	` + where

	var total int
	if err := r.pool.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, f.Limit, f.Offset)
	limitIdx := len(args) - 1
	offsetIdx := len(args)

	listQ := fmt.Sprintf(`
		SELECT
			f.id, f.workspace_id, w.name,
			f.folder_id, fo.name,
			f.uploaded_by_user_id, u.email, u.name,
			f.name, f.mime_type, f.size, f.media_metadata,
			f.deleted_at, f.created_at, f.updated_at
		FROM workspace_files f
		JOIN workspaces w ON w.id = f.workspace_id
		LEFT JOIN workspace_folders fo ON fo.id = f.folder_id
		LEFT JOIN users u ON u.id = f.uploaded_by_user_id
		%s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, where, adminFilesOrderBy(f), limitIdx, offsetIdx)

	rows, err := r.pool.Query(ctx, listQ, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]model.AdminFileListItem, 0)
	for rows.Next() {
		item, err := scanAdminFileRow(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, *item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func buildAdminFilesWhere(f ListFilesAdminFilter, alias string) (string, []any) {
	args := make([]any, 0, 12)
	where := make([]string, 0, 10)

	if q := strings.TrimSpace(f.Query); q != "" {
		args = append(args, "%"+q+"%")
		where = append(where, fmt.Sprintf("%s.name ILIKE $%d", alias, len(args)))
	}
	if ws := strings.TrimSpace(f.WorkspaceID); ws != "" {
		args = append(args, ws)
		where = append(where, fmt.Sprintf("%s.workspace_id = $%d", alias, len(args)))
	}
	if f.DeletedOnly != nil && *f.DeletedOnly {
		// Trashed files keep original folder_id; folder filters would hide most of trash.
	} else if f.FolderRoot {
		where = append(where, fmt.Sprintf("%s.folder_id IS NULL", alias))
	} else if f.FolderID != nil && *f.FolderID != "" {
		args = append(args, *f.FolderID)
		where = append(where, fmt.Sprintf("%s.folder_id = $%d", alias, len(args)))
	}
	if uid := strings.TrimSpace(f.UploadedByUserID); uid != "" {
		args = append(args, uid)
		where = append(where, fmt.Sprintf("%s.uploaded_by_user_id = $%d", alias, len(args)))
	}
	switch f.TypeFilter {
	case "image":
		where = append(where, fmt.Sprintf("%s.mime_type LIKE 'image/%%'", alias))
	case "video":
		where = append(where, fmt.Sprintf("%s.mime_type LIKE 'video/%%'", alias))
	case "audio":
		where = append(where, fmt.Sprintf("%s.mime_type LIKE 'audio/%%'", alias))
	case "document":
		where = append(where, fmt.Sprintf(`(%s.mime_type NOT LIKE 'image/%%' AND %s.mime_type NOT LIKE 'video/%%' AND %s.mime_type NOT LIKE 'audio/%%')`, alias, alias, alias))
	}
	if f.CreatedFrom != nil {
		args = append(args, *f.CreatedFrom)
		where = append(where, fmt.Sprintf("%s.created_at >= $%d", alias, len(args)))
	}
	if f.CreatedTo != nil {
		args = append(args, *f.CreatedTo)
		where = append(where, fmt.Sprintf("%s.created_at <= $%d", alias, len(args)))
	}
	if f.SizeMin != nil {
		args = append(args, *f.SizeMin)
		where = append(where, fmt.Sprintf("%s.size >= $%d", alias, len(args)))
	}
	if f.SizeMax != nil {
		args = append(args, *f.SizeMax)
		where = append(where, fmt.Sprintf("%s.size <= $%d", alias, len(args)))
	}
	if f.DeletedOnly != nil {
		if *f.DeletedOnly {
			where = append(where, fmt.Sprintf("%s.deleted_at IS NOT NULL", alias))
		} else {
			where = append(where, fmt.Sprintf("%s.deleted_at IS NULL", alias))
		}
	}

	whereSQL := ""
	if len(where) > 0 {
		whereSQL = "WHERE " + strings.Join(where, " AND ")
	}
	return whereSQL, args
}

func adminFilesOrderBy(f ListFilesAdminFilter) string {
	if f.DeletedOnly != nil && *f.DeletedOnly {
		return "f.deleted_at DESC NULLS LAST, f.created_at DESC"
	}
	if f.DeletedOnly == nil {
		return "COALESCE(f.deleted_at, f.created_at) DESC, f.created_at DESC"
	}
	return "f.created_at DESC"
}

func scanAdminFileRow(row pgx.Row) (*model.AdminFileListItem, error) {
	var item model.AdminFileListItem
	var folderID, folderName, uploadedBy, uploaderEmail, uploaderName *string
	var mediaMeta []byte
	var deletedAt *time.Time
	if err := row.Scan(
		&item.ID, &item.WorkspaceID, &item.WorkspaceName,
		&folderID, &folderName,
		&uploadedBy, &uploaderEmail, &uploaderName,
		&item.Name, &item.MimeType, &item.Size, &mediaMeta,
		&deletedAt, &item.CreatedAt, &item.UpdatedAt,
	); err != nil {
		return nil, err
	}
	item.FolderID = folderID
	item.FolderName = folderName
	item.UploadedByUserID = uploadedBy
	item.UploaderEmail = uploaderEmail
	item.UploaderName = uploaderName
	item.DeletedAt = deletedAt
	if len(mediaMeta) > 0 {
		item.MediaMetadata = json.RawMessage(mediaMeta)
	}
	return &item, nil
}

func (r *WorkspaceFileRepository) GetForAdmin(ctx context.Context, fileID string) (*model.AdminFileDetail, error) {
	var detail model.AdminFileDetail
	var folderID, folderName, uploadedBy, uploaderEmail, uploaderName *string
	var mediaMeta []byte
	var deletedAt *time.Time
	var aiGenID, aiJobID, aiMode, aiPrompt, aiModel, aiAspect *string
	var aiCreditCost, aiQuotaUsed, aiWalletCents, aiDuration *int
	var aiCreatedAt *time.Time

	err := r.pool.QueryRow(ctx, `
		SELECT
			f.id, f.workspace_id, w.name,
			f.folder_id, fo.name,
			f.uploaded_by_user_id, u.email, u.name,
			f.name, f.mime_type, f.size, f.s3_key, f.media_metadata,
			f.deleted_at, f.created_at, f.updated_at,
			g.id, j.id, j.mode, j.prompt, j.model, j.aspect_ratio,
			j.credit_cost, j.quota_credits_used, j.wallet_cents_charged, j.duration_ms, j.created_at
		FROM workspace_files f
		JOIN workspaces w ON w.id = f.workspace_id
		LEFT JOIN workspace_folders fo ON fo.id = f.folder_id
		LEFT JOIN users u ON u.id = f.uploaded_by_user_id
		LEFT JOIN ai_generations g ON g.workspace_file_id = f.id
		LEFT JOIN LATERAL (
			SELECT j.id, j.mode, j.prompt, j.model, j.aspect_ratio,
				j.credit_cost, j.quota_credits_used, j.wallet_cents_charged, j.duration_ms, j.created_at
			FROM ai_generation_jobs j
			WHERE j.generation_id = g.id AND j.status = 'succeeded'
			ORDER BY j.created_at DESC
			LIMIT 1
		) j ON true
		WHERE f.id = $1
	`, fileID).Scan(
		&detail.ID, &detail.WorkspaceID, &detail.WorkspaceName,
		&folderID, &folderName,
		&uploadedBy, &uploaderEmail, &uploaderName,
		&detail.Name, &detail.MimeType, &detail.Size, &detail.S3Key, &mediaMeta,
		&deletedAt, &detail.CreatedAt, &detail.UpdatedAt,
		&aiGenID, &aiJobID, &aiMode, &aiPrompt, &aiModel, &aiAspect,
		&aiCreditCost, &aiQuotaUsed, &aiWalletCents, &aiDuration, &aiCreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}
	detail.FolderID = folderID
	detail.FolderName = folderName
	detail.UploadedByUserID = uploadedBy
	detail.UploaderEmail = uploaderEmail
	detail.UploaderName = uploaderName
	detail.DeletedAt = deletedAt
	if len(mediaMeta) > 0 {
		detail.MediaMetadata = json.RawMessage(mediaMeta)
	}
	if aiGenID != nil && *aiGenID != "" && aiJobID != nil && *aiJobID != "" {
		ai := model.AdminFileAIGeneration{
			GenerationID: *aiGenID,
			JobID:        *aiJobID,
		}
		if aiMode != nil {
			ai.Mode = *aiMode
		}
		if aiPrompt != nil {
			ai.Prompt = *aiPrompt
		}
		if aiModel != nil {
			ai.Model = *aiModel
		}
		if aiAspect != nil {
			ai.AspectRatio = *aiAspect
		}
		if aiCreditCost != nil {
			ai.CreditCost = *aiCreditCost
		}
		if aiQuotaUsed != nil {
			ai.QuotaCreditsUsed = *aiQuotaUsed
		}
		if aiWalletCents != nil {
			ai.WalletCentsCharged = *aiWalletCents
		}
		if aiDuration != nil {
			ai.DurationMs = *aiDuration
		}
		if aiCreatedAt != nil {
			ai.CreatedAt = aiCreatedAt.UTC().Format(time.RFC3339)
		}
		detail.AI = &ai
	}
	return &detail, nil
}
