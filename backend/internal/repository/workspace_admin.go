package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/postilka/postilka/internal/model"
)

type ListWorkspacesAdminFilter struct {
	Query   string
	OwnerID string
	Limit   int
	Offset  int
}

func (r *WorkspaceRepository) AdminStats(ctx context.Context) (*model.AdminWorkspaceStats, error) {
	const q = `
		SELECT
			(SELECT COUNT(*) FROM workspaces),
			(SELECT COUNT(*) FROM workspace_members),
			(SELECT COUNT(DISTINCT owner_id) FROM workspaces),
			(SELECT COUNT(*) FROM workspace_invites WHERE status = 'pending'),
			(SELECT COUNT(*) FROM workspace_invites WHERE status = 'accepted')
	`
	var stats model.AdminWorkspaceStats
	err := r.pool.QueryRow(ctx, q).Scan(
		&stats.TotalWorkspaces,
		&stats.TotalMembers,
		&stats.TotalOwners,
		&stats.PendingInvites,
		&stats.AcceptedInvites,
	)
	if err != nil {
		return nil, err
	}
	return &stats, nil
}

func (r *WorkspaceRepository) ListForAdmin(ctx context.Context, f ListWorkspacesAdminFilter) ([]model.AdminWorkspaceListItem, int, error) {
	if f.Limit <= 0 || f.Limit > 200 {
		f.Limit = 50
	}
	if f.Offset < 0 {
		f.Offset = 0
	}

	args := make([]any, 0, 6)
	where := make([]string, 0, 2)

	if q := strings.TrimSpace(f.Query); q != "" {
		args = append(args, "%"+q+"%")
		idx := len(args)
		where = append(where, fmt.Sprintf(
			"(w.name ILIKE $%d OR w.slug ILIKE $%d OR u.email ILIKE $%d OR u.name ILIKE $%d)",
			idx, idx, idx, idx,
		))
	}
	if ownerID := strings.TrimSpace(f.OwnerID); ownerID != "" {
		args = append(args, ownerID)
		where = append(where, fmt.Sprintf("w.owner_id = $%d::uuid", len(args)))
	}

	whereSQL := ""
	if len(where) > 0 {
		whereSQL = "WHERE " + strings.Join(where, " AND ")
	}

	countQ := `
		SELECT COUNT(*)
		FROM workspaces w
		JOIN users u ON u.id = w.owner_id
	` + whereSQL
	var total int
	if err := r.pool.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, f.Limit, f.Offset)
	limitIdx := len(args) - 1
	offsetIdx := len(args)

	listQ := fmt.Sprintf(`
		SELECT
			w.id, w.name, w.slug, w.owner_id, w.created_at, w.updated_at, w.plan_assigned_at,
			u.email, u.name,
			p.id, p.slug, p.name, p.is_free,
			(SELECT COUNT(*)::int FROM workspace_members wm WHERE wm.workspace_id = w.id),
			(SELECT COUNT(*)::int FROM workspace_invites wi WHERE wi.workspace_id = w.id AND wi.status = 'pending'),
			(SELECT COUNT(*)::int FROM workspace_invites wi WHERE wi.workspace_id = w.id AND wi.status = 'accepted')
		FROM workspaces w
		JOIN users u ON u.id = w.owner_id
		LEFT JOIN plans p ON p.id = w.plan_id
		%s
		ORDER BY w.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, limitIdx, offsetIdx)

	rows, err := r.pool.Query(ctx, listQ, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items, err := scanAdminWorkspaceListRows(rows)
	if err != nil {
		return nil, 0, err
	}
	return items, total, rows.Err()
}

func (r *WorkspaceRepository) GetAdminDetail(ctx context.Context, workspaceID string) (*model.AdminWorkspaceDetail, error) {
	const headQ = `
		SELECT
			w.id, w.name, w.slug, w.owner_id, w.created_at, w.updated_at, w.plan_assigned_at,
			u.email, u.name,
			p.id, p.slug, p.name, p.is_free,
			(SELECT COUNT(*)::int FROM workspace_members wm WHERE wm.workspace_id = w.id),
			(SELECT COUNT(*)::int FROM workspace_invites wi WHERE wi.workspace_id = w.id AND wi.status = 'pending'),
			(SELECT COUNT(*)::int FROM workspace_invites wi WHERE wi.workspace_id = w.id AND wi.status = 'accepted')
		FROM workspaces w
		JOIN users u ON u.id = w.owner_id
		LEFT JOIN plans p ON p.id = w.plan_id
		WHERE w.id = $1::uuid
	`
	row := r.pool.QueryRow(ctx, headQ, workspaceID)
	item, err := scanAdminWorkspaceListRow(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	members, err := r.adminMembers(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	invites, err := r.adminInvites(ctx, workspaceID)
	if err != nil {
		return nil, err
	}

	return &model.AdminWorkspaceDetail{
		AdminWorkspaceListItem: *item,
		Members:                members,
		Invites:                invites,
	}, nil
}

func (r *WorkspaceRepository) ListForUserAdmin(ctx context.Context, userID string) ([]model.AdminUserWorkspaceItem, error) {
	const q = `
		SELECT
			w.id, w.name, w.slug, wm.role, w.owner_id, w.created_at,
			ou.email, ou.name,
			p.id, p.slug, p.name, p.is_free,
			(SELECT COUNT(*)::int FROM workspace_members wm2 WHERE wm2.workspace_id = w.id)
		FROM workspace_members wm
		JOIN workspaces w ON w.id = wm.workspace_id
		JOIN users ou ON ou.id = w.owner_id
		LEFT JOIN plans p ON p.id = w.plan_id
		WHERE wm.user_id = $1::uuid
		ORDER BY w.created_at ASC
	`
	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.AdminUserWorkspaceItem, 0)
	for rows.Next() {
		var item model.AdminUserWorkspaceItem
		var ownerID string
		var planID, planSlug, planName *string
		var planIsFree *bool
		if err := rows.Scan(
			&item.ID, &item.Name, &item.Slug, &item.Role, &ownerID, &item.CreatedAt,
			&item.OwnerEmail, &item.OwnerName,
			&planID, &planSlug, &planName, &planIsFree,
			&item.MembersCount,
		); err != nil {
			return nil, err
		}
		item.IsOwner = item.Role == "owner"
		if planID != nil && planSlug != nil && planName != nil && planIsFree != nil {
			item.Plan = &model.AdminUserPlan{
				ID: *planID, Slug: *planSlug, Name: *planName, IsFree: *planIsFree,
			}
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *WorkspaceRepository) DeleteByID(ctx context.Context, workspaceID string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM workspaces WHERE id = $1::uuid`, workspaceID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *WorkspaceRepository) DeleteAll(ctx context.Context) (int, error) {
	tag, err := r.pool.Exec(ctx, `DELETE FROM workspaces`)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}

func (r *WorkspaceRepository) adminMembers(ctx context.Context, workspaceID string) ([]model.AdminWorkspaceMember, error) {
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

	out := make([]model.AdminWorkspaceMember, 0)
	for rows.Next() {
		var m model.AdminWorkspaceMember
		if err := rows.Scan(
			&m.UserID, &m.Email, &m.Name, &m.Role, &m.JoinedAt, &m.JoinedViaInvite,
		); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (r *WorkspaceRepository) adminInvites(ctx context.Context, workspaceID string) ([]model.AdminWorkspaceInvite, error) {
	const q = `
		SELECT
			wi.id, wi.email, wi.role, wi.status, wi.expires_at, wi.created_at,
			ib.email, ib.name
		FROM workspace_invites wi
		JOIN users ib ON ib.id = wi.invited_by
		WHERE wi.workspace_id = $1::uuid
		ORDER BY wi.created_at DESC
	`
	rows, err := r.pool.Query(ctx, q, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.AdminWorkspaceInvite, 0)
	for rows.Next() {
		var inv model.AdminWorkspaceInvite
		if err := rows.Scan(
			&inv.ID, &inv.Email, &inv.Role, &inv.Status, &inv.ExpiresAt, &inv.CreatedAt,
			&inv.InvitedByEmail, &inv.InvitedByName,
		); err != nil {
			return nil, err
		}
		out = append(out, inv)
	}
	return out, rows.Err()
}

func scanAdminWorkspaceListRows(rows pgx.Rows) ([]model.AdminWorkspaceListItem, error) {
	out := make([]model.AdminWorkspaceListItem, 0)
	for rows.Next() {
		item, err := scanAdminWorkspaceListFromRows(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *item)
	}
	return out, nil
}

func scanAdminWorkspaceListRow(row pgx.Row) (*model.AdminWorkspaceListItem, error) {
	return scanAdminWorkspaceListFromScanner(row)
}

type adminWorkspaceScanner interface {
	Scan(dest ...any) error
}

func scanAdminWorkspaceListFromRows(rows pgx.Rows) (*model.AdminWorkspaceListItem, error) {
	return scanAdminWorkspaceListFromScanner(rows)
}

func scanAdminWorkspaceListFromScanner(s adminWorkspaceScanner) (*model.AdminWorkspaceListItem, error) {
	var item model.AdminWorkspaceListItem
	var planID, planSlug, planName *string
	var planIsFree *bool
	var planAssignedAt *time.Time
	if err := s.Scan(
		&item.ID, &item.Name, &item.Slug, &item.OwnerID, &item.CreatedAt, &item.UpdatedAt, &planAssignedAt,
		&item.OwnerEmail, &item.OwnerName,
		&planID, &planSlug, &planName, &planIsFree,
		&item.MembersCount, &item.InvitesPending, &item.InvitesAccepted,
	); err != nil {
		return nil, err
	}
	item.PlanAssignedAt = planAssignedAt
	if planID != nil && planSlug != nil && planName != nil && planIsFree != nil {
		item.Plan = &model.AdminUserPlan{
			ID: *planID, Slug: *planSlug, Name: *planName, IsFree: *planIsFree,
		}
	}
	return &item, nil
}
