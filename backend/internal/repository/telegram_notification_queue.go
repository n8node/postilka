package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

const telegramNotificationDefaultLimit = 50

type TelegramNotificationQueueRepository struct {
	pool *pgxpool.Pool
}

func NewTelegramNotificationQueueRepository(pool *pgxpool.Pool) *TelegramNotificationQueueRepository {
	return &TelegramNotificationQueueRepository{pool: pool}
}

func (r *TelegramNotificationQueueRepository) Enqueue(
	ctx context.Context,
	kind string,
	messageText string,
	payload map[string]any,
) (*model.TelegramNotificationRecord, error) {
	if payload == nil {
		payload = map[string]any{}
	}
	rawPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	const q = `
		INSERT INTO telegram_notification_queue (kind, payload, message_text, status, next_attempt_at)
		VALUES ($1, $2, $3, 'pending', NOW())
		RETURNING id, kind, payload, message_text, status, attempt_count, next_attempt_at,
		          last_error, last_attempt_at, sent_at, created_at, updated_at
	`
	rec, err := scanTelegramNotification(
		r.pool.QueryRow(ctx, q, kind, rawPayload, messageText),
	)
	if err != nil {
		return nil, err
	}
	return rec, nil
}

func (r *TelegramNotificationQueueRepository) ClaimPending(
	ctx context.Context,
	limit int,
	staleProcessingBefore time.Time,
) ([]model.TelegramNotificationRecord, error) {
	if limit <= 0 {
		limit = 10
	}
	const q = `
		WITH picked AS (
			SELECT id
			FROM telegram_notification_queue
			WHERE next_attempt_at <= NOW()
			  AND (
			  	status IN ('pending', 'failed')
			  	OR (status = 'processing' AND locked_at IS NOT NULL AND locked_at <= $2)
			  )
			ORDER BY next_attempt_at ASC, created_at ASC
			LIMIT $1
			FOR UPDATE SKIP LOCKED
		)
		UPDATE telegram_notification_queue n
		SET status = 'processing',
		    locked_at = NOW(),
		    updated_at = NOW()
		FROM picked
		WHERE n.id = picked.id
		RETURNING n.id, n.kind, n.payload, n.message_text, n.status, n.attempt_count, n.next_attempt_at,
			       COALESCE(n.last_error, ''), n.last_attempt_at, n.sent_at, n.created_at, n.updated_at
	`
	rows, err := r.pool.Query(ctx, q, limit, staleProcessingBefore)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.TelegramNotificationRecord, 0, limit)
	for rows.Next() {
		rec, err := scanTelegramNotification(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *rec)
	}
	return out, rows.Err()
}

func (r *TelegramNotificationQueueRepository) MarkSent(ctx context.Context, id string) error {
	const q = `
		UPDATE telegram_notification_queue
		SET status = 'sent',
		    last_error = '',
		    last_attempt_at = NOW(),
		    sent_at = NOW(),
		    locked_at = NULL,
		    updated_at = NOW()
		WHERE id = $1
	`
	tag, err := r.pool.Exec(ctx, q, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *TelegramNotificationQueueRepository) MarkFailed(
	ctx context.Context,
	id string,
	lastError string,
	nextAttemptAt time.Time,
) error {
	const q = `
		UPDATE telegram_notification_queue
		SET status = 'failed',
		    attempt_count = attempt_count + 1,
		    last_error = $2,
		    next_attempt_at = $3,
		    last_attempt_at = NOW(),
		    locked_at = NULL,
		    updated_at = NOW()
		WHERE id = $1
	`
	tag, err := r.pool.Exec(ctx, q, id, lastError, nextAttemptAt)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *TelegramNotificationQueueRepository) RetryNow(ctx context.Context, id string) error {
	const q = `
		UPDATE telegram_notification_queue
		SET status = 'pending',
		    next_attempt_at = NOW(),
		    locked_at = NULL,
		    updated_at = NOW()
		WHERE id = $1
	`
	tag, err := r.pool.Exec(ctx, q, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *TelegramNotificationQueueRepository) List(
	ctx context.Context,
	status model.TelegramNotificationStatus,
	limit, offset int,
) (*model.TelegramNotificationListResult, error) {
	if limit <= 0 {
		limit = telegramNotificationDefaultLimit
	}
	filterByStatus := status != ""

	const q = `
		SELECT id, kind, payload, message_text, status, attempt_count, next_attempt_at,
		       last_error, last_attempt_at, sent_at, created_at, updated_at
		FROM telegram_notification_queue
		WHERE ($1::boolean = false OR status = $2)
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4
	`
	rows, err := r.pool.Query(ctx, q, filterByStatus, status, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]model.TelegramNotificationRecord, 0, limit)
	for rows.Next() {
		rec, err := scanTelegramNotification(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *rec)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	const cq = `
		SELECT COUNT(*)
		FROM telegram_notification_queue
		WHERE ($1::boolean = false OR status = $2)
	`
	var total int
	if err := r.pool.QueryRow(ctx, cq, filterByStatus, status).Scan(&total); err != nil {
		return nil, err
	}

	return &model.TelegramNotificationListResult{
		Items:  items,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}, nil
}

type telegramNotificationScanner interface {
	Scan(dest ...any) error
}

func scanTelegramNotification(row telegramNotificationScanner) (*model.TelegramNotificationRecord, error) {
	var rec model.TelegramNotificationRecord
	var status string
	var payloadRaw []byte
	if err := row.Scan(
		&rec.ID,
		&rec.Kind,
		&payloadRaw,
		&rec.MessageText,
		&status,
		&rec.AttemptCount,
		&rec.NextAttemptAt,
		&rec.LastError,
		&rec.LastAttemptAt,
		&rec.SentAt,
		&rec.CreatedAt,
		&rec.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	rec.Status = model.TelegramNotificationStatus(status)
	if len(payloadRaw) > 0 {
		if err := json.Unmarshal(payloadRaw, &rec.Payload); err != nil {
			return nil, err
		}
	}
	return &rec, nil
}
