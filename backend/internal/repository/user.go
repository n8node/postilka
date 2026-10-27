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

const userColumns = `id, email, name, locale, timezone, is_blocked, is_platform_admin, pending_approval, email_verified_at, pending_email, created_at, avatar_s3_key, (password_hash IS NOT NULL AND password_hash <> '')`

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

const (
	UnverifiedImageGenerationLimit = 5
	UnverifiedVideoGenerationLimit = 2
)

// ReserveUnverifiedGeneration atomically reserves one lifetime generation slot.
// Verified users are deliberately excluded from the update and are unlimited.
func (r *UserRepository) ReserveUnverifiedGeneration(ctx context.Context, userID string, video bool) (bool, error) {
	column := "unverified_image_generations"
	limit := UnverifiedImageGenerationLimit
	if video {
		column = "unverified_video_generations"
		limit = UnverifiedVideoGenerationLimit
	}
	query := fmt.Sprintf(`
		UPDATE users
		SET %s = %s + 1, updated_at = NOW()
		WHERE id = $1 AND email_verified_at IS NULL AND %s < $2
	`, column, column, column)
	tag, err := r.pool.Exec(ctx, query, userID, limit)
	if err != nil {
		return false, err
	}
	// A verified user is unlimited; the caller must not turn that into a quota error.
	var verified bool
	if err := r.pool.QueryRow(ctx, `SELECT email_verified_at IS NOT NULL FROM users WHERE id = $1`, userID).Scan(&verified); err != nil {
		return false, err
	}
	return verified || tag.RowsAffected() > 0, nil
}

func (r *UserRepository) ReleaseUnverifiedGeneration(ctx context.Context, userID string, video bool) error {
	column := "unverified_image_generations"
	if video {
		column = "unverified_video_generations"
	}
	_, err := r.pool.Exec(ctx, fmt.Sprintf(`
		UPDATE users SET %s = GREATEST(%s - 1, 0), updated_at = NOW()
		WHERE id = $1 AND email_verified_at IS NULL
	`, column, column), userID)
	return err
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
		SET email = $2, email_verified_at = NULL, pending_email = NULL, updated_at = NOW()
		WHERE id = $1
		RETURNING ` + userColumns + `
	`
	return scanUser(r.pool.QueryRow(ctx, q, userID, email))
}

func (r *UserRepository) SetPendingEmail(ctx context.Context, userID, email string) (*model.User, error) {
	const q = `
		UPDATE users
		SET pending_email = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING ` + userColumns + `
	`
	u, err := scanUser(r.pool.QueryRow(ctx, q, userID, email))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

func (r *UserRepository) ApplyPendingEmail(ctx context.Context, userID string) (*model.User, error) {
	const q = `
		UPDATE users
		SET email = pending_email,
		    pending_email = NULL,
		    email_verified_at = COALESCE(email_verified_at, NOW()),
		    updated_at = NOW()
		WHERE id = $1 AND pending_email IS NOT NULL AND pending_email <> ''
		RETURNING ` + userColumns + `
	`
	u, err := scanUser(r.pool.QueryRow(ctx, q, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

func (r *UserRepository) EmailTakenByOther(ctx context.Context, email, userID string) (bool, error) {
	var taken bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM users
			WHERE (email = $1 OR pending_email = $1) AND id <> $2
		)
	`, email, userID).Scan(&taken)
	return taken, err
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
		SELECT id, email, password_hash, name, locale, timezone, is_blocked, is_platform_admin, pending_approval, email_verified_at, pending_email, created_at, avatar_s3_key
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
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM users WHERE email = $1 OR pending_email = $1)
	`, email).Scan(&exists)
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

func (r *UserRepository) FirstPlatformAdminID(ctx context.Context) (string, error) {
	const q = `
		SELECT id FROM users
		WHERE is_platform_admin = true AND NOT is_blocked
		ORDER BY created_at ASC
		LIMIT 1
	`
	var id string
	err := r.pool.QueryRow(ctx, q).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return strings.TrimSpace(id), err
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

func (r *UserRepository) SetPendingApproval(ctx context.Context, userID string, pending bool) (*model.User, error) {
	const q = `UPDATE users SET pending_approval = $2, updated_at = NOW() WHERE id = $1 RETURNING ` + userColumns
	u, err := scanUser(r.pool.QueryRow(ctx, q, userID, pending))
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
	PendingApproval *bool
	Limit           int
	Offset          int
	Sort            string
	Order           string
}

func (r *UserRepository) ListForAdmin(ctx context.Context, f ListUsersFilter) ([]model.AdminUserListItem, int, error) {
	if f.Limit == 0 || f.Limit > 500 {
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
	if f.PendingApproval != nil {
		args = append(args, *f.PendingApproval)
		where = append(where, fmt.Sprintf("u.pending_approval = $%d", len(args)))
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

	orderSQL := adminUserOrderSQL(f.Sort, f.Order)
	limitSQL := ""
	if f.Limit >= 0 {
		args = append(args, f.Limit, f.Offset)
		limitIdx := len(args) - 1
		offsetIdx := len(args)
		limitSQL = fmt.Sprintf("LIMIT $%d OFFSET $%d", limitIdx, offsetIdx)
	}

	listQ := fmt.Sprintf(`
		SELECT
			u.id, u.email, u.name, u.locale, u.timezone,
		u.is_blocked, u.email_verified_at IS NOT NULL, u.is_platform_admin, u.pending_approval, u.wallet_balance_cents, u.created_at, u.updated_at,
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
		%s
		%s
	`, whereSQL, orderSQL, limitSQL)

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
			&item.IsBlocked, &item.EmailVerified, &item.IsPlatformAdmin, &item.PendingApproval, &item.WalletBalanceCents,
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

func adminUserOrderSQL(sort, order string) string {
	columns := map[string]string{
		"name":                 "u.name",
		"email":                "u.email",
		"status":               "u.is_blocked",
		"role":                 "u.is_platform_admin",
		"wallet_balance_cents": "u.wallet_balance_cents",
		"created_at":           "u.created_at",
		"updated_at":           "u.updated_at",
	}
	column, ok := columns[strings.TrimSpace(sort)]
	if !ok {
		column = "u.created_at"
	}
	direction := "DESC"
	if strings.EqualFold(strings.TrimSpace(order), "asc") {
		direction = "ASC"
	}
	return "ORDER BY " + column + " " + direction + ", u.id DESC"
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
	var pendingEmail, avatarKey *string
	err := row.Scan(
		&u.ID, &u.Email, &u.Name, &u.Locale, &u.Timezone,
		&u.IsBlocked, &u.IsPlatformAdmin, &u.PendingApproval, &u.EmailVerifiedAt, &pendingEmail, &createdAt, &avatarKey, &u.HasPassword,
	)
	if err != nil {
		return nil, err
	}
	finishUser(&u, pendingEmail, avatarKey, createdAt)
	return &u, nil
}

func scanUserWithHash(row pgx.Row, hash **string) (*model.User, error) {
	var u model.User
	var createdAt time.Time
	var pendingEmail, avatarKey *string
	err := row.Scan(
		&u.ID, &u.Email, hash, &u.Name, &u.Locale, &u.Timezone,
		&u.IsBlocked, &u.IsPlatformAdmin, &u.PendingApproval, &u.EmailVerifiedAt, &pendingEmail, &createdAt, &avatarKey,
	)
	if err != nil {
		return nil, err
	}
	if hash != nil && *hash != nil && strings.TrimSpace(**hash) != "" {
		u.HasPassword = true
	}
	finishUser(&u, pendingEmail, avatarKey, createdAt)
	return &u, nil
}

func finishUser(u *model.User, pendingEmail, avatarKey *string, createdAt time.Time) {
	u.CreatedAt = createdAt
	if pendingEmail != nil {
		u.PendingEmail = strings.TrimSpace(*pendingEmail)
	}
	if avatarKey != nil {
		u.AvatarS3Key = strings.TrimSpace(*avatarKey)
	}
	model.ApplyUserAvatarURL(u)
}
