package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type WorkspaceFileRepository struct {
	pool *pgxpool.Pool
}

func NewWorkspaceFileRepository(pool *pgxpool.Pool) *WorkspaceFileRepository {
	return &WorkspaceFileRepository{pool: pool}
}

const fileColumns = `
	id, workspace_id, folder_id, uploaded_by_user_id, name, mime_type, size, s3_key,
	media_metadata, deleted_at, trash_batch_id, created_at, updated_at
`

func scanFile(row pgx.Row) (*model.WorkspaceFile, error) {
	var f model.WorkspaceFile
	var folderID, uploadedBy, trashBatch *string
	var mediaMeta []byte
	var deletedAt *time.Time
	err := row.Scan(
		&f.ID, &f.WorkspaceID, &folderID, &uploadedBy, &f.Name, &f.MimeType, &f.Size, &f.S3Key,
		&mediaMeta, &deletedAt, &trashBatch, &f.CreatedAt, &f.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	f.FolderID = folderID
	f.UploadedByUserID = uploadedBy
	f.DeletedAt = deletedAt
	f.TrashBatchID = trashBatch
	if len(mediaMeta) > 0 {
		f.MediaMetadata = json.RawMessage(mediaMeta)
	}
	return &f, nil
}

func (r *WorkspaceFileRepository) GetByID(ctx context.Context, workspaceID, fileID string, includeDeleted bool) (*model.WorkspaceFile, error) {
	q := `SELECT ` + fileColumns + ` FROM workspace_files WHERE id = $1 AND workspace_id = $2`
	if !includeDeleted {
		q += ` AND deleted_at IS NULL`
	}
	f, err := scanFile(r.pool.QueryRow(ctx, q, fileID, workspaceID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return f, err
}

func (r *WorkspaceFileRepository) GetByS3Key(ctx context.Context, workspaceID, s3Key string) (*model.WorkspaceFile, error) {
	f, err := scanFile(r.pool.QueryRow(ctx,
		`SELECT `+fileColumns+` FROM workspace_files WHERE workspace_id = $1 AND s3_key = $2`,
		workspaceID, s3Key,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return f, err
}

func (r *WorkspaceFileRepository) FindRecentUpload(ctx context.Context, workspaceID string, folderID *string, name string, size int64) (*model.WorkspaceFile, error) {
	var row pgx.Row
	if folderID == nil || *folderID == "" {
		row = r.pool.QueryRow(ctx, `SELECT `+fileColumns+` FROM workspace_files WHERE workspace_id = $1 AND folder_id IS NULL AND name = $2 AND size = $3 AND deleted_at IS NULL AND created_at > now() - interval '10 minutes' ORDER BY created_at DESC LIMIT 1`, workspaceID, name, size)
	} else {
		row = r.pool.QueryRow(ctx, `SELECT `+fileColumns+` FROM workspace_files WHERE workspace_id = $1 AND folder_id = $2 AND name = $3 AND size = $4 AND deleted_at IS NULL AND created_at > now() - interval '10 minutes' ORDER BY created_at DESC LIMIT 1`, workspaceID, *folderID, name, size)
	}
	f, err := scanFile(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return f, err
}

type ListFilesFilter struct {
	WorkspaceID string
	FolderID    *string
	ScopeAll    bool
	TypeFilter  string
	MimePrefix  string
	RecentOnly  bool
	DeletedOnly bool
	Limit       int
}

func (r *WorkspaceFileRepository) List(ctx context.Context, f ListFilesFilter) ([]model.WorkspaceFile, error) {
	var b strings.Builder
	args := []any{f.WorkspaceID}
	argN := 2

	b.WriteString(`SELECT ` + fileColumns + ` FROM workspace_files WHERE workspace_id = $1`)

	if f.DeletedOnly {
		b.WriteString(` AND deleted_at IS NOT NULL`)
	} else {
		b.WriteString(` AND deleted_at IS NULL`)
	}

	if !f.ScopeAll {
		if f.FolderID != nil && *f.FolderID != "" {
			fmt.Fprintf(&b, ` AND folder_id = $%d`, argN)
			args = append(args, *f.FolderID)
			argN++
		} else {
			b.WriteString(` AND folder_id IS NULL`)
		}
	}

	switch f.TypeFilter {
	case "image":
		b.WriteString(` AND mime_type LIKE 'image/%'`)
	case "video":
		b.WriteString(` AND mime_type LIKE 'video/%'`)
	case "audio":
		b.WriteString(` AND mime_type LIKE 'audio/%'`)
	}

	if f.MimePrefix != "" {
		fmt.Fprintf(&b, ` AND mime_type LIKE $%d`, argN)
		args = append(args, f.MimePrefix+"%")
		argN++
	}

	if f.RecentOnly {
		b.WriteString(` ORDER BY updated_at DESC`)
	} else {
		b.WriteString(` ORDER BY created_at DESC`)
	}

	if f.Limit > 0 {
		fmt.Fprintf(&b, ` LIMIT $%d`, argN)
		args = append(args, f.Limit)
	}

	rows, err := r.pool.Query(ctx, b.String(), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.WorkspaceFile, 0)
	for rows.Next() {
		item, err := scanFile(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *item)
	}
	return out, rows.Err()
}

func (r *WorkspaceFileRepository) Create(ctx context.Context, f *model.WorkspaceFile) (*model.WorkspaceFile, error) {
	q := `
		INSERT INTO workspace_files (
			workspace_id, folder_id, uploaded_by_user_id, name, mime_type, size, s3_key, media_metadata
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING ` + fileColumns
	return scanFile(r.pool.QueryRow(ctx, q,
		f.WorkspaceID, f.FolderID, f.UploadedByUserID, f.Name, f.MimeType, f.Size, f.S3Key, f.MediaMetadata,
	))
}

func (r *WorkspaceFileRepository) UpdateName(ctx context.Context, workspaceID, fileID, name string) (*model.WorkspaceFile, error) {
	f, err := scanFile(r.pool.QueryRow(ctx, `
		UPDATE workspace_files SET name = $3, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
		RETURNING `+fileColumns, fileID, workspaceID, name))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return f, err
}

func (r *WorkspaceFileRepository) UpdateFolder(ctx context.Context, workspaceID, fileID string, folderID *string) (*model.WorkspaceFile, error) {
	f, err := scanFile(r.pool.QueryRow(ctx, `
		UPDATE workspace_files SET folder_id = $3, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
		RETURNING `+fileColumns, fileID, workspaceID, folderID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return f, err
}

func (r *WorkspaceFileRepository) SoftDelete(ctx context.Context, workspaceID, fileID, batchID string, at time.Time) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE workspace_files SET deleted_at = $3, trash_batch_id = $4, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
	`, fileID, workspaceID, at, batchID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *WorkspaceFileRepository) SoftDeleteMany(ctx context.Context, workspaceID string, ids []string, batchID string, at time.Time) error {
	if len(ids) == 0 {
		return nil
	}
	_, err := r.pool.Exec(ctx, `
		UPDATE workspace_files SET deleted_at = $3, trash_batch_id = $4, updated_at = NOW()
		WHERE workspace_id = $1 AND id = ANY($2::uuid[]) AND deleted_at IS NULL
	`, workspaceID, ids, at, batchID)
	return err
}

func (r *WorkspaceFileRepository) Restore(ctx context.Context, workspaceID, fileID string, folderID *string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE workspace_files SET deleted_at = NULL, trash_batch_id = NULL, folder_id = $3, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NOT NULL
	`, fileID, workspaceID, folderID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *WorkspaceFileRepository) RestoreByBatch(ctx context.Context, workspaceID, batchID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE workspace_files SET deleted_at = NULL, trash_batch_id = NULL, updated_at = NOW()
		WHERE workspace_id = $1 AND trash_batch_id = $2
	`, workspaceID, batchID)
	return err
}

func (r *WorkspaceFileRepository) DeletePermanent(ctx context.Context, workspaceID, fileID string) (*model.WorkspaceFile, error) {
	f, err := scanFile(r.pool.QueryRow(ctx, `
		DELETE FROM workspace_files WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NOT NULL
		RETURNING `+fileColumns, fileID, workspaceID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return f, err
}

func (r *WorkspaceFileRepository) DeleteAllTrashed(ctx context.Context, workspaceID string) ([]model.WorkspaceFile, error) {
	rows, err := r.pool.Query(ctx, `
		DELETE FROM workspace_files WHERE workspace_id = $1 AND deleted_at IS NOT NULL
		RETURNING `+fileColumns, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.WorkspaceFile, 0)
	for rows.Next() {
		item, err := scanFile(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *item)
	}
	return out, rows.Err()
}

func (r *WorkspaceFileRepository) ListTrashedTopLevel(ctx context.Context, workspaceID string) ([]model.WorkspaceFile, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+fileColumns+`
		FROM workspace_files f
		WHERE f.workspace_id = $1 AND f.deleted_at IS NOT NULL
		  AND (f.folder_id IS NULL OR EXISTS (
		    SELECT 1 FROM workspace_folders fo WHERE fo.id = f.folder_id AND fo.deleted_at IS NULL
		  ))
		ORDER BY f.deleted_at DESC
	`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.WorkspaceFile, 0)
	for rows.Next() {
		item, err := scanFile(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *item)
	}
	return out, rows.Err()
}

func (r *WorkspaceFileRepository) ListExpiredTrashed(ctx context.Context, workspaceID string, before time.Time) ([]model.WorkspaceFile, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+fileColumns+`
		FROM workspace_files
		WHERE workspace_id = $1 AND deleted_at IS NOT NULL AND deleted_at < $2
	`, workspaceID, before)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.WorkspaceFile, 0)
	for rows.Next() {
		item, err := scanFile(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *item)
	}
	return out, rows.Err()
}

func (r *WorkspaceFileRepository) CollectIDsInFolder(ctx context.Context, folderID string, activeOnly bool) ([]string, error) {
	q := `SELECT id FROM workspace_files WHERE folder_id = $1`
	if activeOnly {
		q += ` AND deleted_at IS NULL`
	}
	rows, err := r.pool.Query(ctx, q, folderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (r *WorkspaceFileRepository) SumTrashSize(ctx context.Context, workspaceID string) (int64, error) {
	var sum *int64
	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(size), 0) FROM workspace_files
		WHERE workspace_id = $1 AND deleted_at IS NOT NULL
	`, workspaceID).Scan(&sum)
	if err != nil {
		return 0, err
	}
	if sum == nil {
		return 0, nil
	}
	return *sum, nil
}

func (r *WorkspaceFileRepository) CountActive(ctx context.Context, workspaceID string) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM workspace_files WHERE workspace_id = $1 AND deleted_at IS NULL
	`, workspaceID).Scan(&n)
	return n, err
}

func (r *WorkspaceFileRepository) ListByFolderRecursive(ctx context.Context, folderID string, activeOnly bool) ([]model.WorkspaceFile, error) {
	// collect folder tree via recursive CTE
	q := `
		WITH RECURSIVE tree AS (
			SELECT id FROM workspace_folders WHERE id = $1
			UNION ALL
			SELECT f.id FROM workspace_folders f JOIN tree t ON f.parent_id = t.id
		)
		SELECT ` + fileColumns + `
		FROM workspace_files wf
		WHERE wf.folder_id IN (SELECT id FROM tree)
	`
	if activeOnly {
		q += ` AND wf.deleted_at IS NULL`
	}
	rows, err := r.pool.Query(ctx, q, folderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.WorkspaceFile, 0)
	for rows.Next() {
		item, err := scanFile(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *item)
	}
	return out, rows.Err()
}

func (r *WorkspaceFileRepository) DeletePermanentByID(ctx context.Context, workspaceID, fileID string) (*model.WorkspaceFile, error) {
	f, err := scanFile(r.pool.QueryRow(ctx, `
		DELETE FROM workspace_files WHERE id = $1 AND workspace_id = $2
		RETURNING `+fileColumns, fileID, workspaceID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return f, err
}
