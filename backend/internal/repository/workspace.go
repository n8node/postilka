package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type WorkspaceRepository struct {
	pool *pgxpool.Pool
}

func NewWorkspaceRepository(pool *pgxpool.Pool) *WorkspaceRepository {
	return &WorkspaceRepository{pool: pool}
}

func (r *WorkspaceRepository) CreateWithOwnerTx(ctx context.Context, tx pgx.Tx, name, slug, ownerID, planID string) (*model.Workspace, error) {
	const insertWS = `
		INSERT INTO workspaces (name, slug, owner_id, plan_id, plan_assigned_at)
		VALUES ($1, $2, $3::uuid, NULLIF($4, '')::uuid, CASE WHEN $4 = '' THEN NULL ELSE NOW() END)
		RETURNING id, name, slug, owner_id, created_at
	`
	ws, err := scanWorkspace(tx.QueryRow(ctx, insertWS, name, slug, ownerID, planID))
	if err != nil {
		return nil, err
	}

	const insertMember = `
		INSERT INTO workspace_members (workspace_id, user_id, role)
		VALUES ($1, $2, 'owner')
	`
	if _, err := tx.Exec(ctx, insertMember, ws.ID, ownerID); err != nil {
		return nil, err
	}
	ws.Role = "owner"
	return ws, nil
}

func (r *WorkspaceRepository) CreateWithOwner(ctx context.Context, name, slug, ownerID, planID string) (*model.Workspace, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	ws, err := r.CreateWithOwnerTx(ctx, tx, name, slug, ownerID, planID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return ws, nil
}

func (r *WorkspaceRepository) SetPlan(ctx context.Context, workspaceID, planID string) error {
	return r.SetPlanWithPeriod(ctx, workspaceID, planID, time.Now().UTC())
}

func (r *WorkspaceRepository) SetPlanWithPeriod(ctx context.Context, workspaceID, planID string, assignedAt time.Time) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE workspaces
		SET plan_id = $2::uuid, plan_assigned_at = $3, updated_at = NOW()
		WHERE id = $1::uuid
	`, workspaceID, planID, assignedAt)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *WorkspaceRepository) GetOwnerID(ctx context.Context, workspaceID string) (string, error) {
	var ownerID string
	err := r.pool.QueryRow(ctx, `SELECT owner_id::text FROM workspaces WHERE id = $1::uuid`, workspaceID).Scan(&ownerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return ownerID, err
}

func (r *WorkspaceRepository) GetPlanMeta(ctx context.Context, workspaceID string) (planID string, assignedAt time.Time, err error) {
	err = r.pool.QueryRow(ctx, `
		SELECT COALESCE(plan_id::text, ''), COALESCE(plan_assigned_at, created_at)
		FROM workspaces WHERE id = $1::uuid
	`, workspaceID).Scan(&planID, &assignedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", time.Time{}, ErrNotFound
	}
	if err != nil {
		return "", time.Time{}, err
	}
	if planID == "" {
		return "", assignedAt, ErrNotFound
	}
	return planID, assignedAt, nil
}

func (r *WorkspaceRepository) GetPrimaryForUser(ctx context.Context, userID string) (*model.Workspace, error) {
	const q = `
		SELECT w.id, w.name, w.slug, w.owner_id, wm.role, w.created_at
		FROM workspaces w
		JOIN workspace_members wm ON wm.workspace_id = w.id
		WHERE wm.user_id = $1
		ORDER BY w.created_at ASC
		LIMIT 1
	`
	var ws model.Workspace
	var createdAt time.Time
	err := r.pool.QueryRow(ctx, q, userID).Scan(
		&ws.ID, &ws.Name, &ws.Slug, &ws.OwnerID, &ws.Role, &createdAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	ws.CreatedAt = createdAt
	return &ws, nil
}

func (r *WorkspaceRepository) ListForUser(ctx context.Context, userID string) ([]model.Workspace, error) {
	const q = `
		SELECT w.id, w.name, w.slug, w.owner_id, wm.role, w.created_at
		FROM workspaces w
		JOIN workspace_members wm ON wm.workspace_id = w.id
		WHERE wm.user_id = $1
		ORDER BY w.created_at ASC
	`
	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.Workspace, 0)
	for rows.Next() {
		var ws model.Workspace
		var createdAt time.Time
		if err := rows.Scan(
			&ws.ID, &ws.Name, &ws.Slug, &ws.OwnerID, &ws.Role, &createdAt,
		); err != nil {
			return nil, err
		}
		ws.CreatedAt = createdAt
		out = append(out, ws)
	}
	return out, rows.Err()
}

// GetMembership returns the workspace with the caller's role if they are a member.
func (r *WorkspaceRepository) GetMembership(ctx context.Context, workspaceID, userID string) (*model.Workspace, error) {
	const q = `
		SELECT w.id, w.name, w.slug, w.owner_id, wm.role, w.created_at
		FROM workspaces w
		JOIN workspace_members wm ON wm.workspace_id = w.id
		WHERE w.id = $1 AND wm.user_id = $2
	`
	var ws model.Workspace
	var createdAt time.Time
	err := r.pool.QueryRow(ctx, q, workspaceID, userID).Scan(
		&ws.ID, &ws.Name, &ws.Slug, &ws.OwnerID, &ws.Role, &createdAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	ws.CreatedAt = createdAt
	return &ws, nil
}

func (r *WorkspaceRepository) SlugExists(ctx context.Context, slug string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM workspaces WHERE slug = $1)`, slug).Scan(&exists)
	return exists, err
}

func (r *WorkspaceRepository) SlugExistsExcept(ctx context.Context, slug, exceptWorkspaceID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM workspaces WHERE slug = $1 AND id <> $2::uuid)
	`, slug, exceptWorkspaceID).Scan(&exists)
	return exists, err
}

func (r *WorkspaceRepository) UpdateNameAndSlug(ctx context.Context, workspaceID, name, slug string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE workspaces SET name = $2, slug = $3, updated_at = NOW()
		WHERE id = $1::uuid
	`, workspaceID, name, slug)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *WorkspaceRepository) CountMembershipsForUser(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM workspace_members WHERE user_id = $1::uuid
	`, userID).Scan(&count)
	return count, err
}

func (r *WorkspaceRepository) CountOwnedByUser(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM workspaces WHERE owner_id = $1::uuid`, userID).Scan(&count)
	return count, err
}

func (r *WorkspaceRepository) AddMember(ctx context.Context, workspaceID, userID string, role model.WorkspaceRole) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO workspace_members (workspace_id, user_id, role)
		VALUES ($1, $2, $3)
		ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role
	`, workspaceID, userID, role)
	return err
}

func (r *WorkspaceRepository) GetByID(ctx context.Context, workspaceID string) (*model.Workspace, error) {
	const q = `
		SELECT id, name, slug, owner_id, created_at
		FROM workspaces
		WHERE id = $1
	`
	ws, err := scanWorkspace(r.pool.QueryRow(ctx, q, workspaceID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return ws, err
}

type WorkspaceMemberEmail struct {
	Email string
	Name  string
}

func (r *WorkspaceRepository) ListMemberUserIDs(ctx context.Context, workspaceID string, roles []string) ([]string, error) {
	q := `
		SELECT wm.user_id
		FROM workspace_members wm
		JOIN users u ON u.id = wm.user_id
		WHERE wm.workspace_id = $1::uuid
		  AND u.is_blocked = false
	`
	args := []any{workspaceID}
	if len(roles) > 0 {
		q += ` AND wm.role::text = ANY($2::text[])`
		args = append(args, roles)
	}
	q += ` ORDER BY wm.created_at ASC`
	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]string, 0)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

func (r *WorkspaceRepository) ListEditorMemberEmails(ctx context.Context, workspaceID string) ([]WorkspaceMemberEmail, error) {
	const q = `
		SELECT DISTINCT u.email, COALESCE(NULLIF(u.name, ''), u.email)
		FROM workspace_members wm
		JOIN users u ON u.id = wm.user_id
		WHERE wm.workspace_id = $1
		  AND wm.role IN ('admin', 'editor')
		  AND u.is_blocked = false
		  AND NULLIF(u.email, '') IS NOT NULL
		ORDER BY u.email
	`
	rows, err := r.pool.Query(ctx, q, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]WorkspaceMemberEmail, 0)
	for rows.Next() {
		var item WorkspaceMemberEmail
		if err := rows.Scan(&item.Email, &item.Name); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *WorkspaceRepository) ListMembers(ctx context.Context, workspaceID string) ([]model.WorkspaceMember, error) {
	const q = `
		SELECT
			u.id, u.email, u.name, wm.role, wm.created_at,
			EXISTS (
				SELECT 1 FROM workspace_invites wi
				WHERE wi.workspace_id = wm.workspace_id
				  AND wi.status = 'accepted'
				  AND lower(wi.email) = lower(u.email)
			)
		FROM workspace_members wm
		JOIN users u ON u.id = wm.user_id
		WHERE wm.workspace_id = $1::uuid
		ORDER BY
			CASE wm.role
				WHEN 'owner' THEN 0
				WHEN 'admin' THEN 1
				WHEN 'editor' THEN 2
				ELSE 3
			END,
			wm.created_at ASC
	`
	rows, err := r.pool.Query(ctx, q, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.WorkspaceMember, 0)
	for rows.Next() {
		var m model.WorkspaceMember
		if err := rows.Scan(
			&m.UserID, &m.Email, &m.Name, &m.Role, &m.JoinedAt, &m.JoinedViaInvite,
		); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func scanWorkspace(row pgx.Row) (*model.Workspace, error) {
	var ws model.Workspace
	var createdAt time.Time
	err := row.Scan(&ws.ID, &ws.Name, &ws.Slug, &ws.OwnerID, &createdAt)
	if err != nil {
		return nil, err
	}
	ws.CreatedAt = createdAt
	return &ws, nil
}

func (r *WorkspaceRepository) GetStorageUsed(ctx context.Context, workspaceID string) (int64, error) {
	var used int64
	err := r.pool.QueryRow(ctx, `SELECT storage_used FROM workspaces WHERE id = $1::uuid`, workspaceID).Scan(&used)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrNotFound
	}
	return used, err
}

func (r *WorkspaceRepository) TryIncrementStorage(ctx context.Context, workspaceID string, delta int64, quota *int64) (bool, error) {
	if quota == nil {
		tag, err := r.pool.Exec(ctx, `
			UPDATE workspaces SET storage_used = storage_used + $2, updated_at = NOW()
			WHERE id = $1::uuid
		`, workspaceID, delta)
		return tag.RowsAffected() > 0, err
	}
	tag, err := r.pool.Exec(ctx, `
		UPDATE workspaces SET storage_used = storage_used + $2, updated_at = NOW()
		WHERE id = $1::uuid AND storage_used + $2 <= $3
	`, workspaceID, delta, *quota)
	return tag.RowsAffected() > 0, err
}

func (r *WorkspaceRepository) DecrementStorage(ctx context.Context, workspaceID string, delta int64) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE workspaces SET storage_used = GREATEST(0, storage_used - $2), updated_at = NOW()
		WHERE id = $1::uuid
	`, workspaceID, delta)
	return err
}
