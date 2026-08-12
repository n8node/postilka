package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TelegramBusinessRegistration struct {
	ID                string
	WorkspaceID       string
	BotUserID         int64
	BotUsername       string
	BotTokenEncrypted string
	WebhookSecret     string
	Status            string
	LastError         string
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type TelegramBusinessRegistrationRepository struct {
	pool *pgxpool.Pool
}

func NewTelegramBusinessRegistrationRepository(pool *pgxpool.Pool) *TelegramBusinessRegistrationRepository {
	return &TelegramBusinessRegistrationRepository{pool: pool}
}

func scanTelegramBusinessRegistration(row pgx.Row) (*TelegramBusinessRegistration, error) {
	var rec TelegramBusinessRegistration
	err := row.Scan(
		&rec.ID, &rec.WorkspaceID, &rec.BotUserID, &rec.BotUsername,
		&rec.BotTokenEncrypted, &rec.WebhookSecret, &rec.Status, &rec.LastError,
		&rec.CreatedAt, &rec.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &rec, nil
}

func (r *TelegramBusinessRegistrationRepository) GetByID(ctx context.Context, id string) (*TelegramBusinessRegistration, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, workspace_id, bot_user_id, bot_username, bot_token_encrypted,
		       webhook_secret, status, COALESCE(last_error, ''), created_at, updated_at
		FROM telegram_business_registrations
		WHERE id = $1
	`, id)
	rec, err := scanTelegramBusinessRegistration(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return rec, nil
}

func (r *TelegramBusinessRegistrationRepository) GetByWorkspaceBot(
	ctx context.Context,
	workspaceID string,
	botUserID int64,
) (*TelegramBusinessRegistration, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, workspace_id, bot_user_id, bot_username, bot_token_encrypted,
		       webhook_secret, status, COALESCE(last_error, ''), created_at, updated_at
		FROM telegram_business_registrations
		WHERE workspace_id = $1 AND bot_user_id = $2
	`, workspaceID, botUserID)
	rec, err := scanTelegramBusinessRegistration(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return rec, nil
}

type TelegramBusinessRegistrationUpsertParams struct {
	WorkspaceID       string
	BotUserID         int64
	BotUsername       string
	BotTokenEncrypted string
	WebhookSecret     string
	Status            string
	LastError         string
}

func (r *TelegramBusinessRegistrationRepository) Upsert(
	ctx context.Context,
	p TelegramBusinessRegistrationUpsertParams,
) (*TelegramBusinessRegistration, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO telegram_business_registrations (
			workspace_id, bot_user_id, bot_username, bot_token_encrypted,
			webhook_secret, status, last_error
		) VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, ''))
		ON CONFLICT (workspace_id, bot_user_id) DO UPDATE SET
			bot_username = EXCLUDED.bot_username,
			bot_token_encrypted = EXCLUDED.bot_token_encrypted,
			webhook_secret = EXCLUDED.webhook_secret,
			status = EXCLUDED.status,
			last_error = NULLIF(EXCLUDED.last_error, ''),
			updated_at = NOW()
		RETURNING id, workspace_id, bot_user_id, bot_username, bot_token_encrypted,
		          webhook_secret, status, COALESCE(last_error, ''), created_at, updated_at
	`, p.WorkspaceID, p.BotUserID, p.BotUsername, p.BotTokenEncrypted, p.WebhookSecret, p.Status, p.LastError)
	return scanTelegramBusinessRegistration(row)
}

func (r *TelegramBusinessRegistrationRepository) UpdateStatus(
	ctx context.Context,
	id, status, lastError string,
) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE telegram_business_registrations
		SET status = $2, last_error = NULLIF($3, ''), updated_at = NOW()
		WHERE id = $1
	`, id, status, lastError)
	return err
}

func (r *TelegramBusinessRegistrationRepository) ListByWorkspace(
	ctx context.Context,
	workspaceID string,
) ([]*TelegramBusinessRegistration, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, workspace_id, bot_user_id, bot_username, bot_token_encrypted,
		       webhook_secret, status, COALESCE(last_error, ''), created_at, updated_at
		FROM telegram_business_registrations
		WHERE workspace_id = $1
		ORDER BY updated_at DESC
	`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]*TelegramBusinessRegistration, 0)
	for rows.Next() {
		rec, err := scanTelegramBusinessRegistration(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, rec)
	}
	return out, rows.Err()
}
