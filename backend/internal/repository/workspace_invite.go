package repository

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type WorkspaceInviteRepository struct {
	pool *pgxpool.Pool
}

func NewWorkspaceInviteRepository(pool *pgxpool.Pool) *WorkspaceInviteRepository {
	return &WorkspaceInviteRepository{pool: pool}
}

func (r *WorkspaceInviteRepository) Create(
	ctx context.Context,
	workspaceID, email string,
	role model.WorkspaceRole,
	tokenHash, invitedBy string,
	expiresAt time.Time,
) (*model.WorkspaceInvite, error) {
	const q = `
		INSERT INTO workspace_invites (workspace_id, email, role, token_hash, invited_by, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, workspace_id, email, role, invited_by, status, expires_at, created_at
	`
	return scanWorkspaceInvite(r.pool.QueryRow(ctx, q, workspaceID, email, role, tokenHash, invitedBy, expiresAt))
}

func (r *WorkspaceInviteRepository) FindValidByTokenHash(ctx context.Context, tokenHash string) (*model.WorkspaceInvite, error) {
	const q = `
		SELECT id, workspace_id, email, role, invited_by, status, expires_at, created_at
		FROM workspace_invites
		WHERE token_hash = $1
		  AND status = 'pending'
		  AND expires_at > NOW()
	`
	rec, err := scanWorkspaceInvite(r.pool.QueryRow(ctx, q, tokenHash))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return rec, err
}

func (r *WorkspaceInviteRepository) ListPendingForWorkspace(ctx context.Context, workspaceID string) ([]model.WorkspaceInvite, error) {
	const q = `
		SELECT id, workspace_id, email, role, invited_by, status, expires_at, created_at
		FROM workspace_invites
		WHERE workspace_id = $1 AND status = 'pending' AND expires_at > NOW()
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, q, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.WorkspaceInvite, 0)
	for rows.Next() {
		inv, err := scanWorkspaceInviteRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *inv)
	}
	return out, rows.Err()
}

func (r *WorkspaceInviteRepository) RevokePendingForEmail(ctx context.Context, workspaceID, email string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE workspace_invites
		SET status = 'revoked'
		WHERE workspace_id = $1 AND lower(email) = lower($2) AND status = 'pending'
	`, workspaceID, strings.TrimSpace(email))
	return err
}

func (r *WorkspaceInviteRepository) MarkAccepted(ctx context.Context, inviteID string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE workspace_invites
		SET status = 'accepted'
		WHERE id = $1 AND status = 'pending'
	`, inviteID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func scanWorkspaceInvite(row pgx.Row) (*model.WorkspaceInvite, error) {
	return scanWorkspaceInviteRow(row)
}

func scanWorkspaceInviteRow(row pgx.Row) (*model.WorkspaceInvite, error) {
	var inv model.WorkspaceInvite
	var role string
	err := row.Scan(
		&inv.ID, &inv.WorkspaceID, &inv.Email, &role, &inv.InvitedBy,
		&inv.Status, &inv.ExpiresAt, &inv.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	inv.Role = model.WorkspaceRole(role)
	return &inv, nil
}
