package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type WorkspaceFolderRepository struct {
	pool *pgxpool.Pool
}

func NewWorkspaceFolderRepository(pool *pgxpool.Pool) *WorkspaceFolderRepository {
	return &WorkspaceFolderRepository{pool: pool}
}

const folderColumns = `
	id, workspace_id, parent_id, name, deleted_at, trash_batch_id, created_at, updated_at
`

func scanFolder(row pgx.Row) (*model.WorkspaceFolder, error) {
	var f model.WorkspaceFolder
	var parentID, trashBatch *string
	var deletedAt *time.Time
	err := row.Scan(
		&f.ID, &f.WorkspaceID, &parentID, &f.Name, &deletedAt, &trashBatch, &f.CreatedAt, &f.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	f.ParentID = parentID
	f.DeletedAt = deletedAt
	f.TrashBatchID = trashBatch
	return &f, nil
}

func (r *WorkspaceFolderRepository) GetByID(ctx context.Context, workspaceID, folderID string, includeDeleted bool) (*model.WorkspaceFolder, error) {
	q := `SELECT ` + folderColumns + ` FROM workspace_folders WHERE id = $1 AND workspace_id = $2`
	if !includeDeleted {
		q += ` AND deleted_at IS NULL`
	}
	f, err := scanFolder(r.pool.QueryRow(ctx, q, folderID, workspaceID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return f, err
}

func (r *WorkspaceFolderRepository) List(ctx context.Context, workspaceID string, parentID *string, scopeAll bool) ([]model.WorkspaceFolder, error) {
	var b strings.Builder
	args := []any{workspaceID}
	b.WriteString(`SELECT ` + folderColumns + ` FROM workspace_folders WHERE workspace_id = $1 AND deleted_at IS NULL`)
	if !scopeAll {
		if parentID != nil && *parentID != "" {
			b.WriteString(` AND parent_id = $2`)
			args = append(args, *parentID)
		} else {
			b.WriteString(` AND parent_id IS NULL`)
		}
	}
	b.WriteString(` ORDER BY name ASC`)

	rows, err := r.pool.Query(ctx, b.String(), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.WorkspaceFolder, 0)
	for rows.Next() {
		item, err := scanFolder(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *item)
	}
	return out, rows.Err()
}

func (r *WorkspaceFolderRepository) ListForAdmin(ctx context.Context, workspaceID string, includeDeleted bool) ([]model.WorkspaceFolder, error) {
	q := `SELECT ` + folderColumns + ` FROM workspace_folders WHERE workspace_id = $1`
	if !includeDeleted {
		q += ` AND deleted_at IS NULL`
	}
	q += ` ORDER BY name ASC`

	rows, err := r.pool.Query(ctx, q, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.WorkspaceFolder, 0)
	for rows.Next() {
		item, err := scanFolder(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *item)
	}
	return out, rows.Err()
}

func (r *WorkspaceFolderRepository) Create(ctx context.Context, f *model.WorkspaceFolder) (*model.WorkspaceFolder, error) {
	return scanFolder(r.pool.QueryRow(ctx, `
		INSERT INTO workspace_folders (workspace_id, parent_id, name)
		VALUES ($1, $2, $3)
		RETURNING `+folderColumns, f.WorkspaceID, f.ParentID, f.Name))
}

func (r *WorkspaceFolderRepository) UpdateName(ctx context.Context, workspaceID, folderID, name string) (*model.WorkspaceFolder, error) {
	f, err := scanFolder(r.pool.QueryRow(ctx, `
		UPDATE workspace_folders SET name = $3, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
		RETURNING `+folderColumns, folderID, workspaceID, name))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return f, err
}

func (r *WorkspaceFolderRepository) UpdateParent(ctx context.Context, workspaceID, folderID string, parentID *string) (*model.WorkspaceFolder, error) {
	f, err := scanFolder(r.pool.QueryRow(ctx, `
		UPDATE workspace_folders SET parent_id = $3, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
		RETURNING `+folderColumns, folderID, workspaceID, parentID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return f, err
}

func (r *WorkspaceFolderRepository) SoftDelete(ctx context.Context, workspaceID, folderID, batchID string, at time.Time) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE workspace_folders SET deleted_at = $3, trash_batch_id = $4, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
	`, folderID, workspaceID, at, batchID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *WorkspaceFolderRepository) SoftDeleteMany(ctx context.Context, workspaceID string, ids []string, batchID string, at time.Time) error {
	if len(ids) == 0 {
		return nil
	}
	_, err := r.pool.Exec(ctx, `
		UPDATE workspace_folders SET deleted_at = $3, trash_batch_id = $4, updated_at = NOW()
		WHERE workspace_id = $1 AND id = ANY($2::uuid[]) AND deleted_at IS NULL
	`, workspaceID, ids, at, batchID)
	return err
}

func (r *WorkspaceFolderRepository) Restore(ctx context.Context, workspaceID, folderID string, parentID *string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE workspace_folders SET deleted_at = NULL, trash_batch_id = NULL, parent_id = $3, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NOT NULL
	`, folderID, workspaceID, parentID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *WorkspaceFolderRepository) RestoreByBatch(ctx context.Context, workspaceID, batchID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE workspace_folders SET deleted_at = NULL, trash_batch_id = NULL, updated_at = NOW()
		WHERE workspace_id = $1 AND trash_batch_id = $2
	`, workspaceID, batchID)
	return err
}

func (r *WorkspaceFolderRepository) DeletePermanent(ctx context.Context, workspaceID, folderID string) error {
	tag, err := r.pool.Exec(ctx, `
		DELETE FROM workspace_folders WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NOT NULL
	`, folderID, workspaceID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *WorkspaceFolderRepository) DeleteAllTrashed(ctx context.Context, workspaceID string) error {
	_, err := r.pool.Exec(ctx, `
		DELETE FROM workspace_folders WHERE workspace_id = $1 AND deleted_at IS NOT NULL
	`, workspaceID)
	return err
}

func (r *WorkspaceFolderRepository) ListTrashedTopLevel(ctx context.Context, workspaceID string) ([]model.WorkspaceFolder, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+folderColumns+`
		FROM workspace_folders f
		WHERE f.workspace_id = $1 AND f.deleted_at IS NOT NULL
		  AND (f.parent_id IS NULL OR EXISTS (
		    SELECT 1 FROM workspace_folders p WHERE p.id = f.parent_id AND p.deleted_at IS NULL
		  ))
		ORDER BY f.deleted_at DESC
	`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.WorkspaceFolder, 0)
	for rows.Next() {
		item, err := scanFolder(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *item)
	}
	return out, rows.Err()
}

func (r *WorkspaceFolderRepository) CollectSubtreeIDs(ctx context.Context, folderID string, activeOnly bool) ([]string, error) {
	q := `
		WITH RECURSIVE tree AS (
			SELECT id FROM workspace_folders WHERE id = $1
			UNION ALL
			SELECT f.id FROM workspace_folders f JOIN tree t ON f.parent_id = t.id`
	if activeOnly {
		q += ` WHERE f.deleted_at IS NULL`
	}
	q += `
		)
		SELECT id FROM tree
	`
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

func (r *WorkspaceFolderRepository) IsDescendantOf(ctx context.Context, folderID, ancestorID string) (bool, error) {
	if folderID == ancestorID {
		return true, nil
	}
	var exists bool
	err := r.pool.QueryRow(ctx, `
		WITH RECURSIVE ancestors AS (
			SELECT id, parent_id FROM workspace_folders WHERE id = $1
			UNION ALL
			SELECT f.id, f.parent_id FROM workspace_folders f
			JOIN ancestors a ON f.id = a.parent_id
		)
		SELECT EXISTS(SELECT 1 FROM ancestors WHERE id = $2)
	`, folderID, ancestorID).Scan(&exists)
	return exists, err
}

func (r *WorkspaceFolderRepository) CountFilesInFolder(ctx context.Context, folderID string) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM workspace_files WHERE folder_id = $1 AND deleted_at IS NULL
	`, folderID).Scan(&n)
	return n, err
}

func (r *WorkspaceFolderRepository) Breadcrumbs(ctx context.Context, workspaceID, folderID string) ([]model.FolderBreadcrumb, error) {
	rows, err := r.pool.Query(ctx, `
		WITH RECURSIVE chain AS (
			SELECT id, parent_id, name FROM workspace_folders
			WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
			UNION ALL
			SELECT f.id, f.parent_id, f.name FROM workspace_folders f
			JOIN chain c ON f.id = c.parent_id
			WHERE f.deleted_at IS NULL
		)
		SELECT id, name FROM chain
	`, folderID, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var crumbs []model.FolderBreadcrumb
	for rows.Next() {
		var id, name string
		if err := rows.Scan(&id, &name); err != nil {
			return nil, err
		}
		idCopy := id
		crumbs = append(crumbs, model.FolderBreadcrumb{ID: &idCopy, Name: name})
	}
	// reverse to root-first
	for i, j := 0, len(crumbs)-1; i < j; i, j = i+1, j-1 {
		crumbs[i], crumbs[j] = crumbs[j], crumbs[i]
	}
	return crumbs, nil
}

func (r *WorkspaceFolderRepository) ListExpiredTrashed(ctx context.Context, workspaceID string, before time.Time) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id FROM workspace_folders
		WHERE workspace_id = $1 AND deleted_at IS NOT NULL AND deleted_at < $2
		  AND NOT EXISTS (SELECT 1 FROM workspace_files wf WHERE wf.folder_id = workspace_folders.id)
		  AND NOT EXISTS (SELECT 1 FROM workspace_folders ch WHERE ch.parent_id = workspace_folders.id)
	`, workspaceID, before)
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

func (r *WorkspaceFolderRepository) WorkspaceIDsWithTrash(ctx context.Context) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT DISTINCT workspace_id::text FROM workspace_files WHERE deleted_at IS NOT NULL
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	seen := make(map[string]struct{})
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		if _, ok := seen[id]; !ok {
			seen[id] = struct{}{}
			ids = append(ids, id)
		}
	}
	return ids, rows.Err()
}

func (r *WorkspaceFolderRepository) DeleteByIDs(ctx context.Context, workspaceID string, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	_, err := r.pool.Exec(ctx, `
		DELETE FROM workspace_folders WHERE workspace_id = $1 AND id = ANY($2::uuid[])
	`, workspaceID, ids)
	return err
}

func (r *WorkspaceFolderRepository) NameByID(ctx context.Context, workspaceID, folderID string) (string, error) {
	var name string
	err := r.pool.QueryRow(ctx, `
		SELECT name FROM workspace_folders WHERE id = $1 AND workspace_id = $2
	`, folderID, workspaceID).Scan(&name)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return name, err
}

func (r *WorkspaceFolderRepository) FolderExistsActive(ctx context.Context, workspaceID string, folderID *string) error {
	if folderID == nil || *folderID == "" {
		return nil
	}
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM workspace_folders WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
		)
	`, *folderID, workspaceID).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("%w: folder not found", ErrNotFound)
	}
	return nil
}
