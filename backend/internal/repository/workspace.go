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

func (r *WorkspaceRepository) CountOwnedByUser(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM workspaces WHERE owner_id = $1::uuid`, userID).Scan(&count)
	return count, err
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
