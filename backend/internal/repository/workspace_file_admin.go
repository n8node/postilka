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
	where, args := buildAdminFilesWhere(f, "f")
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
		ORDER BY f.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, limitIdx, offsetIdx)

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
	if f.FolderRoot {
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
