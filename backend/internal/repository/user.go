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

var ErrNotFound = errors.New("not found")

type UserRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

const userColumns = `id, email, name, locale, timezone, is_blocked, is_platform_admin, email_verified_at, created_at, avatar_s3_key`

func (r *UserRepository) Create(ctx context.Context, email, passwordHash, name string) (*model.User, error) {
	const q = `
		INSERT INTO users (email, password_hash, name)
		VALUES ($1, $2, $3)
		RETURNING ` + userColumns + `
	`
	return scanUser(r.pool.QueryRow(ctx, q, email, passwordHash, name))
}

func (r *UserRepository) CreateTx(ctx context.Context, tx pgx.Tx, email, passwordHash, name string) (*model.User, error) {
	const q = `
		INSERT INTO users (email, password_hash, name)
		VALUES ($1, $2, $3)
		RETURNING ` + userColumns + `
	`
	return scanUser(tx.QueryRow(ctx, q, email, passwordHash, name))
}

func (r *UserRepository) SetRegisteredViaInviteTx(ctx context.Context, tx pgx.Tx, userID, inviteID string) error {
	_, err := tx.Exec(ctx, `
		UPDATE users SET registered_via_invite_id = $2, updated_at = NOW() WHERE id = $1
	`, userID, inviteID)
	return err
}

func (r *UserRepository) CreateOAuthTx(ctx context.Context, tx pgx.Tx, email, name string) (*model.User, error) {
	const q = `
		INSERT INTO users (email, password_hash, name, email_verified_at)
		VALUES ($1, NULL, $2, NOW())
		RETURNING ` + userColumns + `
	`
	return scanUser(tx.QueryRow(ctx, q, email, name))
}

func (r *UserRepository) SetEmailVerified(ctx context.Context, userID string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE users
		SET email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW()
		WHERE id = $1
	`, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *UserRepository) ClearEmailVerified(ctx context.Context, userID string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE users
		SET email_verified_at = NULL, updated_at = NOW()
		WHERE id = $1
	`, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *UserRepository) UpdateEmail(ctx context.Context, userID, email string) (*model.User, error) {
	const q = `
		UPDATE users
		SET email = $2, email_verified_at = NULL, updated_at = NOW()
		WHERE id = $1
		RETURNING ` + userColumns + `
	`
	return scanUser(r.pool.QueryRow(ctx, q, userID, email))
}

func (r *UserRepository) UpdateTimezone(ctx context.Context, userID, timezone string) (*model.User, error) {
	const q = `
		UPDATE users
		SET timezone = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING ` + userColumns + `
	`
	return scanUser(r.pool.QueryRow(ctx, q, userID, timezone))
}

func (r *UserRepository) UpdatePasswordHash(ctx context.Context, userID, passwordHash string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE users
		SET password_hash = $2, updated_at = NOW()
		WHERE id = $1
	`, userID, passwordHash)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *UserRepository) HasPassword(ctx context.Context, userID string) (bool, error) {
	hash, err := r.GetPasswordHash(ctx, userID)
	if errors.Is(err, ErrNotFound) {
		return false, ErrNotFound
	}
	if err != nil {
		return false, err
	}
	return hash != "", nil
}

func (r *UserRepository) GetPasswordHash(ctx context.Context, userID string) (string, error) {
	var hash *string
	err := r.pool.QueryRow(ctx, `SELECT password_hash FROM users WHERE id = $1`, userID).Scan(&hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	if err != nil {
		return "", err
	}
	if hash == nil {
		return "", nil
	}
	return *hash, nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*model.User, string, error) {
	const q = `
		SELECT id, email, password_hash, name, locale, timezone, is_blocked, is_platform_admin, email_verified_at, created_at, avatar_s3_key
		FROM users WHERE email = $1
	`
	var hash *string
	row := r.pool.QueryRow(ctx, q, email)
	u, err := scanUserWithHash(row, &hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, "", ErrNotFound
	}
	if err != nil {
		return nil, "", err
	}
	passwordHash := ""
	if hash != nil {
		passwordHash = *hash
	}
	return u, passwordHash, nil
}

func (r *UserRepository) GetByID(ctx context.Context, id string) (*model.User, error) {
	const q = `
		SELECT ` + userColumns + `
		FROM users WHERE id = $1
	`
	u, err := scanUser(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

func (r *UserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`, email).Scan(&exists)
	return exists, err
}

func (r *UserRepository) TouchActive(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `UPDATE users SET updated_at = NOW() WHERE id = $1`, id)
	return err
}

func (r *UserRepository) SetPlatformAdmin(ctx context.Context, userID string, value bool) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE users SET is_platform_admin = $2, updated_at = NOW() WHERE id = $1
	`, userID, value)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *UserRepository) SetPlatformAdminByEmail(ctx context.Context, email string, value bool) (*model.User, error) {
	const q = `
		UPDATE users
		SET is_platform_admin = $2, updated_at = NOW()
		WHERE email = $1
		RETURNING ` + userColumns + `
	`
	u, err := scanUser(r.pool.QueryRow(ctx, q, email, value))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

func (r *UserRepository) ListPlatformAdminEmails(ctx context.Context) ([]string, error) {
	const q = `
		SELECT email FROM users
		WHERE is_platform_admin = true AND NOT is_blocked
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]string, 0, 2)
	for rows.Next() {
		var email string
		if err := rows.Scan(&email); err != nil {
			return nil, err
		}
		email = strings.TrimSpace(email)
		if email != "" {
			out = append(out, email)
		}
	}
	return out, rows.Err()
}

func (r *UserRepository) SetBlocked(ctx context.Context, userID string, blocked bool) (*model.User, error) {
	const q = `
		UPDATE users
		SET is_blocked = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING ` + userColumns + `
	`
	u, err := scanUser(r.pool.QueryRow(ctx, q, userID, blocked))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

func (r *UserRepository) Delete(ctx context.Context, userID string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

type ListUsersFilter struct {
	Query           string
	IsBlocked       *bool
	IsPlatformAdmin *bool
	Limit           int
	Offset          int
}

func (r *UserRepository) ListForAdmin(ctx context.Context, f ListUsersFilter) ([]model.AdminUserListItem, int, error) {
	if f.Limit <= 0 || f.Limit > 200 {
		f.Limit = 50
	}
	if f.Offset < 0 {
		f.Offset = 0
	}

	args := make([]any, 0, 6)
	where := make([]string, 0, 3)

	if q := strings.TrimSpace(f.Query); q != "" {
		args = append(args, "%"+q+"%")
		where = append(where, fmt.Sprintf("(u.email ILIKE $%d OR u.name ILIKE $%d)", len(args), len(args)))
	}
	if f.IsBlocked != nil {
		args = append(args, *f.IsBlocked)
		where = append(where, fmt.Sprintf("u.is_blocked = $%d", len(args)))
	}
	if f.IsPlatformAdmin != nil {
		args = append(args, *f.IsPlatformAdmin)
		where = append(where, fmt.Sprintf("u.is_platform_admin = $%d", len(args)))
	}

	whereSQL := ""
	if len(where) > 0 {
		whereSQL = "WHERE " + strings.Join(where, " AND ")
	}

	countQ := `SELECT COUNT(*) FROM users u ` + whereSQL
	var total int
	if err := r.pool.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, f.Limit, f.Offset)
	limitIdx := len(args) - 1
	offsetIdx := len(args)

	listQ := fmt.Sprintf(`
		SELECT
			u.id, u.email, u.name, u.locale, u.timezone,
			u.is_blocked, u.is_platform_admin, u.wallet_balance_cents, u.created_at, u.updated_at,
			ws.id, ws.name, ws.slug, ws.role,
			p.id, p.slug, p.name, p.is_free
		FROM users u
		LEFT JOIN LATERAL (
			SELECT w.id, w.name, w.slug, w.plan_id, wm.role
			FROM workspace_members wm
			JOIN workspaces w ON w.id = wm.workspace_id
			WHERE wm.user_id = u.id
			ORDER BY w.created_at ASC
			LIMIT 1
		) AS ws ON true
		LEFT JOIN plans p ON p.id = ws.plan_id
		%s
		ORDER BY u.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, limitIdx, offsetIdx)

	rows, err := r.pool.Query(ctx, listQ, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]model.AdminUserListItem, 0)
	for rows.Next() {
		var item model.AdminUserListItem
		var wsID, wsName, wsSlug, wsRole *string
		var planID, planSlug, planName *string
		var planIsFree *bool
		if err := rows.Scan(
			&item.ID, &item.Email, &item.Name, &item.Locale, &item.Timezone,
			&item.IsBlocked, &item.IsPlatformAdmin, &item.WalletBalanceCents,
			&item.CreatedAt, &item.UpdatedAt,
			&wsID, &wsName, &wsSlug, &wsRole,
			&planID, &planSlug, &planName, &planIsFree,
		); err != nil {
			return nil, 0, err
		}
		if wsID != nil && wsName != nil && wsSlug != nil && wsRole != nil {
			item.Workspace = &model.AdminUserWorkspace{
				ID:   *wsID,
				Name: *wsName,
				Slug: *wsSlug,
				Role: *wsRole,
			}
		}
		if planID != nil && planSlug != nil && planName != nil && planIsFree != nil {
			item.Plan = &model.AdminUserPlan{
				ID:     *planID,
				Slug:   *planSlug,
				Name:   *planName,
				IsFree: *planIsFree,
			}
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *UserRepository) UpdateAvatarS3Key(ctx context.Context, userID string, key *string) (*model.User, error) {
	const q = `
		UPDATE users
		SET avatar_s3_key = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING ` + userColumns + `
	`
	u, err := scanUser(r.pool.QueryRow(ctx, q, userID, key))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

func (r *UserRepository) GetAvatarS3Key(ctx context.Context, userID string) (string, error) {
	var key *string
	err := r.pool.QueryRow(ctx, `SELECT avatar_s3_key FROM users WHERE id = $1`, userID).Scan(&key)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	if err != nil {
		return "", err
	}
	if key == nil {
		return "", nil
	}
	return strings.TrimSpace(*key), nil
}

func scanUser(row pgx.Row) (*model.User, error) {
	var u model.User
	var createdAt time.Time
	var avatarKey *string
	err := row.Scan(
		&u.ID, &u.Email, &u.Name, &u.Locale, &u.Timezone,
		&u.IsBlocked, &u.IsPlatformAdmin, &u.EmailVerifiedAt, &createdAt, &avatarKey,
	)
	if err != nil {
		return nil, err
	}
	u.CreatedAt = createdAt
	if avatarKey != nil {
		u.AvatarS3Key = strings.TrimSpace(*avatarKey)
	}
	model.ApplyUserAvatarURL(&u)
	return &u, nil
}

func scanUserWithHash(row pgx.Row, hash **string) (*model.User, error) {
	var u model.User
	var createdAt time.Time
	var avatarKey *string
	err := row.Scan(
		&u.ID, &u.Email, hash, &u.Name, &u.Locale, &u.Timezone,
		&u.IsBlocked, &u.IsPlatformAdmin, &u.EmailVerifiedAt, &createdAt, &avatarKey,
	)
	if err != nil {
		return nil, err
	}
	u.CreatedAt = createdAt
	if avatarKey != nil {
		u.AvatarS3Key = strings.TrimSpace(*avatarKey)
	}
	model.ApplyUserAvatarURL(&u)
	return &u, nil
}
