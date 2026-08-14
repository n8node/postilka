package repository

import (
	"context"
	"encoding/json"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type NotificationRepository struct {
	pool *pgxpool.Pool
}

func NewNotificationRepository(pool *pgxpool.Pool) *NotificationRepository {
	return &NotificationRepository{pool: pool}
}

type NotificationListFilter struct {
	WorkspaceID string
	Type        model.NotificationType
	UnreadOnly  bool
	Limit       int
	Offset      int
}

func (r *NotificationRepository) Create(ctx context.Context, n *model.Notification) (*model.Notification, error) {
	payload, err := marshalPayload(n.Payload)
	if err != nil {
		return nil, err
	}
	const q = `
		INSERT INTO notifications (user_id, workspace_id, type, category, title, body, payload, href)
		VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7::jsonb, NULLIF($8, ''))
		RETURNING id, user_id, workspace_id, type, category, title, COALESCE(body, ''), payload, COALESCE(href, ''), read_at, created_at
	`
	return scanNotification(r.pool.QueryRow(ctx, q,
		n.UserID, n.WorkspaceID, string(n.Type), string(n.Category), n.Title, n.Body, payload, n.Href,
	))
}

func (r *NotificationRepository) List(ctx context.Context, userID string, filter NotificationListFilter) ([]model.Notification, int, error) {
	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}

	where := `user_id = $1`
	args := []any{userID}
	idx := 2
	if filter.WorkspaceID != "" {
		where += ` AND (workspace_id IS NULL OR workspace_id = $` + strconv.Itoa(idx) + `)`
		args = append(args, filter.WorkspaceID)
		idx++
	}
	if filter.Type != "" {
		where += ` AND type = $` + strconv.Itoa(idx)
		args = append(args, string(filter.Type))
		idx++
	}
	if filter.UnreadOnly {
		where += ` AND read_at IS NULL`
	}

	countQ := `SELECT COUNT(*) FROM notifications WHERE ` + where
	var total int
	if err := r.pool.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listQ := `
		SELECT id, user_id, workspace_id, type, category, title, COALESCE(body, ''), payload, COALESCE(href, ''), read_at, created_at
		FROM notifications
		WHERE ` + where + `
		ORDER BY created_at DESC
		LIMIT $` + strconv.Itoa(idx) + ` OFFSET $` + strconv.Itoa(idx+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, listQ, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]model.Notification, 0)
	for rows.Next() {
		item, err := scanNotification(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, *item)
	}
	return items, total, rows.Err()
}

func (r *NotificationRepository) CountUnread(ctx context.Context, userID, workspaceID string) (int, error) {
	q := `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL`
	args := []any{userID}
	if workspaceID != "" {
		q += ` AND (workspace_id IS NULL OR workspace_id = $2)`
		args = append(args, workspaceID)
	}
	var n int
	err := r.pool.QueryRow(ctx, q, args...).Scan(&n)
	return n, err
}

func (r *NotificationRepository) MarkRead(ctx context.Context, userID, id string) (int64, error) {
	tag, err := r.pool.Exec(ctx, `
		UPDATE notifications SET read_at = NOW()
		WHERE id = $1 AND user_id = $2 AND read_at IS NULL
	`, id, userID)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

func (r *NotificationRepository) MarkAllRead(ctx context.Context, userID, workspaceID string) (int64, error) {
	q := `UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`
	args := []any{userID}
	if workspaceID != "" {
		q += ` AND (workspace_id IS NULL OR workspace_id = $2)`
		args = append(args, workspaceID)
	}
	tag, err := r.pool.Exec(ctx, q, args...)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

func (r *NotificationRepository) DeleteAll(ctx context.Context, userID, workspaceID string) (int64, error) {
	q := `DELETE FROM notifications WHERE user_id = $1`
	args := []any{userID}
	if workspaceID != "" {
		q += ` AND (workspace_id IS NULL OR workspace_id = $2)`
		args = append(args, workspaceID)
	}
	tag, err := r.pool.Exec(ctx, q, args...)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

func (r *NotificationRepository) HasRecent(
	ctx context.Context,
	userID string,
	typ model.NotificationType,
	payloadKey, payloadVal string,
	since time.Time,
) (bool, error) {
	q := `
		SELECT 1 FROM notifications
		WHERE user_id = $1 AND type = $2 AND created_at >= $3
	`
	args := []any{userID, string(typ), since}
	if payloadKey != "" {
		q += ` AND payload ->> $4 = $5`
		args = append(args, payloadKey, payloadVal)
	}
	q += ` LIMIT 1`
	var one int
	err := r.pool.QueryRow(ctx, q, args...).Scan(&one)
	if err == pgx.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (r *NotificationRepository) GetPrefs(ctx context.Context, userID string) (model.NotificationPreferences, error) {
	prefs := model.DefaultNotificationPreferences()
	var raw []byte
	err := r.pool.QueryRow(ctx, `SELECT notification_prefs FROM users WHERE id = $1`, userID).Scan(&raw)
	if err != nil {
		if err == pgx.ErrNoRows {
			return prefs, ErrNotFound
		}
		return prefs, err
	}
	return parseNotificationPrefs(raw), nil
}

func (r *NotificationRepository) UpdatePrefs(ctx context.Context, userID string, prefs model.NotificationPreferences) (model.NotificationPreferences, error) {
	raw, err := json.Marshal(prefs)
	if err != nil {
		return prefs, err
	}
	var stored []byte
	err = r.pool.QueryRow(ctx, `
		UPDATE users SET notification_prefs = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING notification_prefs
	`, userID, raw).Scan(&stored)
	if err != nil {
		if err == pgx.ErrNoRows {
			return prefs, ErrNotFound
		}
		return prefs, err
	}
	return parseNotificationPrefs(stored), nil
}

func parseNotificationPrefs(raw []byte) model.NotificationPreferences {
	prefs := model.DefaultNotificationPreferences()
	if len(raw) == 0 {
		return prefs
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		return prefs
	}
	applyBool := func(key string, dest *bool) {
		v, ok := m[key]
		if !ok {
			return
		}
		b, ok := v.(bool)
		if ok {
			*dest = b
		}
	}
	applyBool("posts", &prefs.Posts)
	applyBool("channels", &prefs.Channels)
	applyBool("billing", &prefs.Billing)
	applyBool("quota", &prefs.Quota)
	applyBool("ai", &prefs.AI)
	applyBool("files", &prefs.Files)
	applyBool("team", &prefs.Team)
	return prefs
}

func marshalPayload(payload map[string]any) ([]byte, error) {
	if len(payload) == 0 {
		return nil, nil
	}
	return json.Marshal(payload)
}

type notificationScanner interface {
	Scan(dest ...any) error
}

func scanNotification(row notificationScanner) (*model.Notification, error) {
	var n model.Notification
	var workspaceID *string
	var payload []byte
	var typ, category string
	err := row.Scan(
		&n.ID, &n.UserID, &workspaceID, &typ, &category, &n.Title, &n.Body, &payload, &n.Href, &n.ReadAt, &n.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	n.WorkspaceID = workspaceID
	n.Type = model.NotificationType(typ)
	n.Category = model.NotificationCategory(category)
	if len(payload) > 0 {
		_ = json.Unmarshal(payload, &n.Payload)
	}
	return &n, nil
}

