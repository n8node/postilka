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

type InviteRepository struct {
	pool *pgxpool.Pool
}

func NewInviteRepository(pool *pgxpool.Pool) *InviteRepository {
	return &InviteRepository{pool: pool}
}

type ListInvitesFilter struct {
	Search string
	Status string
	Scope  string
	Limit  int
	Offset int
}

func (r *InviteRepository) FindActiveByCode(ctx context.Context, code string) (*model.RegistrationInvite, error) {
	const q = `
		SELECT id, code, scope, status, owner_user_id, created_by_user_id,
		       used_by_user_id, used_at, expires_at, created_at
		FROM invites
		WHERE code = $1
		  AND status = 'ACTIVE'
		  AND (expires_at IS NULL OR expires_at > NOW())
		LIMIT 1
	`
	return scanInvite(r.pool.QueryRow(ctx, q, code))
}

func (r *InviteRepository) FindActiveByCodeTx(ctx context.Context, tx pgx.Tx, code string) (*model.RegistrationInvite, error) {
	const q = `
		SELECT id, code, scope, status, owner_user_id, created_by_user_id,
		       used_by_user_id, used_at, expires_at, created_at
		FROM invites
		WHERE code = $1
		  AND status = 'ACTIVE'
		  AND (expires_at IS NULL OR expires_at > NOW())
		LIMIT 1
	`
	return scanInvite(tx.QueryRow(ctx, q, code))
}

func (r *InviteRepository) ConsumeActiveTx(ctx context.Context, tx pgx.Tx, inviteID, usedByUserID string) error {
	tag, err := tx.Exec(ctx, `
		UPDATE invites
		SET status = 'USED', used_at = NOW(), used_by_user_id = $2
		WHERE id = $1 AND status = 'ACTIVE' AND used_at IS NULL
	`, inviteID, usedByUserID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return ErrInviteAlreadyConsumed
	}
	return nil
}

func (r *InviteRepository) CreateBatchTx(
	ctx context.Context,
	tx pgx.Tx,
	scope model.InviteScope,
	count int,
	ownerUserID, createdByUserID *string,
	codes []string,
) ([]model.RegistrationInvite, error) {
	if len(codes) != count {
		return nil, fmt.Errorf("codes length mismatch")
	}
	out := make([]model.RegistrationInvite, 0, count)
	for _, code := range codes {
		const q = `
			INSERT INTO invites (code, scope, status, owner_user_id, created_by_user_id)
			VALUES ($1, $2, 'ACTIVE', $3, $4)
			RETURNING id, code, scope, status, owner_user_id, created_by_user_id,
			          used_by_user_id, used_at, expires_at, created_at
		`
		inv, err := scanInvite(tx.QueryRow(ctx, q, code, scope, ownerUserID, createdByUserID))
		if err != nil {
			return nil, err
		}
		out = append(out, *inv)
	}
	return out, nil
}

func (r *InviteRepository) CreateBatch(
	ctx context.Context,
	scope model.InviteScope,
	count int,
	ownerUserID, createdByUserID *string,
	codes []string,
) ([]model.RegistrationInvite, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	invites, err := r.CreateBatchTx(ctx, tx, scope, count, ownerUserID, createdByUserID, codes)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return invites, nil
}

func (r *InviteRepository) Revoke(ctx context.Context, inviteID string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE invites SET status = 'REVOKED'
		WHERE id = $1 AND status = 'ACTIVE'
	`, inviteID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *InviteRepository) ListForAdmin(ctx context.Context, f ListInvitesFilter) ([]model.AdminInviteListItem, int, error) {
	if f.Limit <= 0 || f.Limit > 100 {
		f.Limit = 30
	}
	if f.Offset < 0 {
		f.Offset = 0
	}

	args := make([]any, 0, 8)
	where := make([]string, 0, 4)

	if q := strings.TrimSpace(f.Search); q != "" {
		args = append(args, "%"+q+"%")
		p := len(args)
		where = append(where, fmt.Sprintf(`(
			i.code ILIKE $%d OR
			ou.email ILIKE $%d OR ou.name ILIKE $%d OR
			uu.email ILIKE $%d OR uu.name ILIKE $%d
		)`, p, p, p, p, p))
	}
	if scope := strings.ToUpper(strings.TrimSpace(f.Scope)); scope == "SYSTEM" || scope == "USER" {
		args = append(args, scope)
		where = append(where, fmt.Sprintf("i.scope = $%d::invite_scope", len(args)))
	}

	status := strings.ToUpper(strings.TrimSpace(f.Status))
	switch status {
	case "EXPIRED":
		where = append(where, "i.status = 'ACTIVE' AND i.expires_at IS NOT NULL AND i.expires_at <= NOW()")
	case "ACTIVE":
		where = append(where, "i.status = 'ACTIVE' AND (i.expires_at IS NULL OR i.expires_at > NOW())")
	case "USED", "REVOKED":
		args = append(args, status)
		where = append(where, fmt.Sprintf("i.status = $%d::invite_status", len(args)))
	}

	whereSQL := ""
	if len(where) > 0 {
		whereSQL = "WHERE " + strings.Join(where, " AND ")
	}

	countQ := `
		SELECT COUNT(*)
		FROM invites i
		LEFT JOIN users ou ON ou.id = i.owner_user_id
		LEFT JOIN users uu ON uu.id = i.used_by_user_id
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
			i.id, i.code, i.scope, i.status, i.created_at, i.used_at, i.expires_at,
			ou.id, ou.email, ou.name,
			cu.id, cu.email, cu.name,
			uu.id, uu.email, uu.name
		FROM invites i
		LEFT JOIN users ou ON ou.id = i.owner_user_id
		LEFT JOIN users cu ON cu.id = i.created_by_user_id
		LEFT JOIN users uu ON uu.id = i.used_by_user_id
		%s
		ORDER BY i.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, limitIdx, offsetIdx)

	rows, err := r.pool.Query(ctx, listQ, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	now := time.Now()
	items := make([]model.AdminInviteListItem, 0)
	for rows.Next() {
		item, err := scanAdminInviteRow(rows, now)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func (r *InviteRepository) ListRelations(ctx context.Context, limit int) ([]model.InviteRelation, error) {
	if limit <= 0 || limit > 500 {
		limit = 500
	}
	const q = `
		SELECT
			i.id, i.code, i.used_at,
			ou.id, ou.email, ou.name,
			uu.id, uu.email, uu.name
		FROM invites i
		JOIN users uu ON uu.id = i.used_by_user_id
		LEFT JOIN users ou ON ou.id = i.owner_user_id
		WHERE i.status = 'USED' AND i.used_by_user_id IS NOT NULL
		ORDER BY i.used_at DESC NULLS LAST
		LIMIT $1
	`
	rows, err := r.pool.Query(ctx, q, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.InviteRelation, 0)
	for rows.Next() {
		var rel model.InviteRelation
		var inviterID, inviterEmail, inviterName *string
		var invitedID, invitedEmail, invitedName string
		if err := rows.Scan(
			&rel.ID, &rel.InviteCode, &rel.UsedAt,
			&inviterID, &inviterEmail, &inviterName,
			&invitedID, &invitedEmail, &invitedName,
		); err != nil {
			return nil, err
		}
		if inviterID != nil && inviterEmail != nil {
			name := ""
			if inviterName != nil {
				name = *inviterName
			}
			rel.Inviter = &model.InviteUserBrief{ID: *inviterID, Email: *inviterEmail, Name: name}
		}
		rel.Invited = &model.InviteUserBrief{ID: invitedID, Email: invitedEmail, Name: invitedName}
		out = append(out, rel)
	}
	return out, rows.Err()
}

func (r *InviteRepository) ListByOwner(ctx context.Context, ownerUserID string) ([]model.UserInviteItem, error) {
	const q = `
		SELECT id, code, status, used_at, expires_at, created_at
		FROM invites
		WHERE owner_user_id = $1 AND scope = 'USER'
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, q, ownerUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	now := time.Now()
	out := make([]model.UserInviteItem, 0)
	for rows.Next() {
		var item model.UserInviteItem
		var status string
		var expiresAt *time.Time
		if err := rows.Scan(&item.ID, &item.Code, &status, &item.UsedAt, &expiresAt, &item.CreatedAt); err != nil {
			return nil, err
		}
		item.Status = model.InviteStatus(status)
		item.Status = model.EffectiveInviteStatus(item.Status, expiresAt, now)
		item.IsActive = item.Status == model.InviteStatusActive
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *InviteRepository) GetInviteRelationsForUser(ctx context.Context, userID string) (*model.UserInviteRelations, error) {
	result := &model.UserInviteRelations{
		InvitedUsers: make([]struct {
			ID           string    `json:"id"`
			Email        string    `json:"email"`
			Name         string    `json:"name"`
			InviteCode   string    `json:"invite_code"`
			RegisteredAt time.Time `json:"registered_at"`
		}, 0),
	}

	const invitedByQ = `
		SELECT i.id, i.code, ou.id, ou.email, ou.name
		FROM users u
		JOIN invites i ON i.id = u.registered_via_invite_id
		LEFT JOIN users ou ON ou.id = i.owner_user_id
		WHERE u.id = $1
	`
	var inviteID, inviteCode string
	var ownerID, ownerEmail, ownerName *string
	err := r.pool.QueryRow(ctx, invitedByQ, userID).Scan(&inviteID, &inviteCode, &ownerID, &ownerEmail, &ownerName)
	if err == nil {
		result.InvitedBy = &struct {
			InviteID   string           `json:"invite_id"`
			InviteCode string           `json:"invite_code"`
			User       *model.InviteUserBrief `json:"user,omitempty"`
		}{
			InviteID:   inviteID,
			InviteCode: inviteCode,
		}
		if ownerID != nil && ownerEmail != nil {
			name := ""
			if ownerName != nil {
				name = *ownerName
			}
			result.InvitedBy.User = &model.InviteUserBrief{ID: *ownerID, Email: *ownerEmail, Name: name}
		}
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	const invitedUsersQ = `
		SELECT u.id, u.email, u.name, i.code, u.created_at
		FROM invites i
		JOIN users u ON u.registered_via_invite_id = i.id
		WHERE i.owner_user_id = $1 AND i.status = 'USED'
		ORDER BY u.created_at DESC
		LIMIT 50
	`
	rows, err := r.pool.Query(ctx, invitedUsersQ, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var item struct {
			ID           string    `json:"id"`
			Email        string    `json:"email"`
			Name         string    `json:"name"`
			InviteCode   string    `json:"invite_code"`
			RegisteredAt time.Time `json:"registered_at"`
		}
		if err := rows.Scan(&item.ID, &item.Email, &item.Name, &item.InviteCode, &item.RegisteredAt); err != nil {
			return nil, err
		}
		result.InvitedUsers = append(result.InvitedUsers, item)
	}
	return result, rows.Err()
}

func (r *InviteRepository) CountStats(ctx context.Context) (total, active, used int, err error) {
	err = r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE status = 'ACTIVE' AND (expires_at IS NULL OR expires_at > NOW())),
			COUNT(*) FILTER (WHERE status = 'USED')
		FROM invites
	`).Scan(&total, &active, &used)
	return
}

func (r *InviteRepository) ListPublicSystem(ctx context.Context, limit int) ([]model.RegistrationInvite, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	const q = `
		SELECT id, code, scope, status, owner_user_id, created_by_user_id,
		       used_by_user_id, used_at, expires_at, created_at
		FROM invites
		WHERE scope = 'SYSTEM'
		  AND status = 'ACTIVE'
		  AND (expires_at IS NULL OR expires_at > NOW())
		ORDER BY created_at DESC
		LIMIT $1
	`
	rows, err := r.pool.Query(ctx, q, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.RegistrationInvite, 0)
	for rows.Next() {
		inv, err := scanInvite(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *inv)
	}
	return out, rows.Err()
}

var ErrInviteAlreadyConsumed = errors.New("invite already consumed")

type inviteScanner interface {
	Scan(dest ...any) error
}

func scanInvite(row inviteScanner) (*model.RegistrationInvite, error) {
	var inv model.RegistrationInvite
	var scope, status string
	err := row.Scan(
		&inv.ID, &inv.Code, &scope, &status,
		&inv.OwnerUserID, &inv.CreatedByUserID,
		&inv.UsedByUserID, &inv.UsedAt, &inv.ExpiresAt, &inv.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	inv.Scope = model.InviteScope(scope)
	inv.Status = model.InviteStatus(status)
	return &inv, nil
}

func scanAdminInviteRow(row pgx.Row, now time.Time) (model.AdminInviteListItem, error) {
	var item model.AdminInviteListItem
	var scope, status string
	var ownerID, ownerEmail, ownerName *string
	var createdByID, createdByEmail, createdByName *string
	var usedByID, usedByEmail, usedByName *string

	err := row.Scan(
		&item.ID, &item.Code, &scope, &status, &item.CreatedAt, &item.UsedAt, &item.ExpiresAt,
		&ownerID, &ownerEmail, &ownerName,
		&createdByID, &createdByEmail, &createdByName,
		&usedByID, &usedByEmail, &usedByName,
	)
	if err != nil {
		return item, err
	}

	item.Scope = model.InviteScope(scope)
	item.Status = model.InviteStatus(status)
	item.EffectiveStatus = model.EffectiveInviteStatus(item.Status, item.ExpiresAt, now)

	if ownerID != nil && ownerEmail != nil {
		name := ""
		if ownerName != nil {
			name = *ownerName
		}
		item.OwnerUser = &model.InviteUserBrief{ID: *ownerID, Email: *ownerEmail, Name: name}
	}
	if createdByID != nil && createdByEmail != nil {
		name := ""
		if createdByName != nil {
			name = *createdByName
		}
		item.CreatedByUser = &model.InviteUserBrief{ID: *createdByID, Email: *createdByEmail, Name: name}
	}
	if usedByID != nil && usedByEmail != nil {
		name := ""
		if usedByName != nil {
			name = *usedByName
		}
		item.UsedByUser = &model.InviteUserBrief{ID: *usedByID, Email: *usedByEmail, Name: name}
	}
	return item, nil
}
