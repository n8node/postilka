package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type ChannelRepository struct {
	pool *pgxpool.Pool
}

func NewChannelRepository(pool *pgxpool.Pool) *ChannelRepository {
	return &ChannelRepository{pool: pool}
}

func (r *ChannelRepository) ListByWorkspace(ctx context.Context, workspaceID string) ([]model.Channel, error) {
	const q = `
		SELECT id, workspace_id, provider, name, chat_id, chat_type, bot_username,
		       COALESCE(max_post_mode, 'own'), status, COALESCE(last_error, ''), created_at, updated_at
		FROM channels
		WHERE workspace_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, q, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.Channel
	for rows.Next() {
		var ch model.Channel
		if err := rows.Scan(
			&ch.ID, &ch.WorkspaceID, &ch.Provider, &ch.Name, &ch.ChatID, &ch.ChatType,
			&ch.BotUsername, &ch.MaxPostMode, &ch.Status, &ch.LastError, &ch.CreatedAt, &ch.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, ch)
	}
	return items, rows.Err()
}

func (r *ChannelRepository) CountByWorkspace(ctx context.Context, workspaceID string) (int, error) {
	const q = `SELECT COUNT(*) FROM channels WHERE workspace_id = $1 AND status != 'disabled'`
	var n int
	err := r.pool.QueryRow(ctx, q, workspaceID).Scan(&n)
	return n, err
}

func (r *ChannelRepository) GetByID(ctx context.Context, workspaceID, channelID string) (*model.Channel, error) {
	const q = `
		SELECT id, workspace_id, provider, name, chat_id, chat_type, bot_username,
		       COALESCE(max_post_mode, 'own'), status, COALESCE(last_error, ''), created_at, updated_at
		FROM channels
		WHERE id = $1 AND workspace_id = $2
	`
	var ch model.Channel
	err := r.pool.QueryRow(ctx, q, channelID, workspaceID).Scan(
		&ch.ID, &ch.WorkspaceID, &ch.Provider, &ch.Name, &ch.ChatID, &ch.ChatType,
		&ch.BotUsername, &ch.MaxPostMode, &ch.Status, &ch.LastError, &ch.CreatedAt, &ch.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &ch, nil
}

func (r *ChannelRepository) GetTokenEncrypted(ctx context.Context, workspaceID, channelID string) (string, error) {
	const q = `
		SELECT bot_token_encrypted
		FROM channels
		WHERE id = $1 AND workspace_id = $2
	`
	var token string
	err := r.pool.QueryRow(ctx, q, channelID, workspaceID).Scan(&token)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return token, err
}

func (r *ChannelRepository) ExistsByChat(ctx context.Context, workspaceID, provider, chatID string) (bool, error) {
	const q = `
		SELECT EXISTS(
			SELECT 1 FROM channels
			WHERE workspace_id = $1 AND provider = $2 AND chat_id = $3
		)
	`
	var ok bool
	err := r.pool.QueryRow(ctx, q, workspaceID, provider, chatID).Scan(&ok)
	return ok, err
}

func (r *ChannelRepository) GetByChat(ctx context.Context, workspaceID, provider, chatID string) (*model.Channel, error) {
	const q = `
		SELECT id, workspace_id, provider, name, chat_id, chat_type, bot_username,
		       COALESCE(max_post_mode, 'own'), status, COALESCE(last_error, ''), created_at, updated_at
		FROM channels
		WHERE workspace_id = $1 AND provider = $2 AND chat_id = $3
	`
	var ch model.Channel
	err := r.pool.QueryRow(ctx, q, workspaceID, provider, chatID).Scan(
		&ch.ID, &ch.WorkspaceID, &ch.Provider, &ch.Name, &ch.ChatID, &ch.ChatType,
		&ch.BotUsername, &ch.MaxPostMode, &ch.Status, &ch.LastError, &ch.CreatedAt, &ch.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &ch, nil
}

type ChannelCreateParams struct {
	WorkspaceID        string
	Provider           model.ChannelProvider
	Name               string
	ChatID             string
	ChatType           string
	BotUsername        string
	BotTokenEncrypted  string
	MaxPostMode        model.MAXPostMode
	Status             model.ChannelStatus
}

func (r *ChannelRepository) Create(ctx context.Context, p ChannelCreateParams) (*model.Channel, error) {
	maxPostMode := p.MaxPostMode
	if maxPostMode == "" {
		maxPostMode = model.MAXPostModeOwn
	}
	const q = `
		INSERT INTO channels (
			workspace_id, provider, name, chat_id, chat_type, bot_username,
			bot_token_encrypted, max_post_mode, status
		) VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, ''), $8, $9)
		RETURNING id, workspace_id, provider, name, chat_id, chat_type, bot_username,
		          COALESCE(max_post_mode, 'own'), status, COALESCE(last_error, ''), created_at, updated_at
	`
	var ch model.Channel
	err := r.pool.QueryRow(ctx, q,
		p.WorkspaceID, p.Provider, p.Name, p.ChatID, p.ChatType, p.BotUsername,
		p.BotTokenEncrypted, maxPostMode, p.Status,
	).Scan(
		&ch.ID, &ch.WorkspaceID, &ch.Provider, &ch.Name, &ch.ChatID, &ch.ChatType,
		&ch.BotUsername, &ch.MaxPostMode, &ch.Status, &ch.LastError, &ch.CreatedAt, &ch.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &ch, nil
}

func (r *ChannelRepository) UpdateStatus(ctx context.Context, workspaceID, channelID string, status model.ChannelStatus, lastError string) error {
	const q = `
		UPDATE channels
		SET status = $3, last_error = NULLIF($4, ''), updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2
	`
	ct, err := r.pool.Exec(ctx, q, channelID, workspaceID, status, lastError)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *ChannelRepository) UpdateToken(ctx context.Context, workspaceID, channelID, botTokenEncrypted, botUsername string, status model.ChannelStatus) (*model.Channel, error) {
	const q = `
		UPDATE channels
		SET bot_token_encrypted = $3,
		    bot_username = $4,
		    status = $5,
		    last_error = NULL,
		    updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2
		RETURNING id, workspace_id, provider, name, chat_id, chat_type, bot_username,
		          COALESCE(max_post_mode, 'own'), status, COALESCE(last_error, ''), created_at, updated_at
	`
	var ch model.Channel
	err := r.pool.QueryRow(ctx, q, channelID, workspaceID, botTokenEncrypted, botUsername, status).Scan(
		&ch.ID, &ch.WorkspaceID, &ch.Provider, &ch.Name, &ch.ChatID, &ch.ChatType,
		&ch.BotUsername, &ch.MaxPostMode, &ch.Status, &ch.LastError, &ch.CreatedAt, &ch.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &ch, nil
}

type ChannelMAXReconnectParams struct {
	WorkspaceID       string
	ChannelID         string
	Name              string
	ChatType          string
	BotUsername       string
	BotTokenEncrypted string
	MaxPostMode       model.MAXPostMode
	Status            model.ChannelStatus
}

func (r *ChannelRepository) UpdateMAXConnection(ctx context.Context, p ChannelMAXReconnectParams) (*model.Channel, error) {
	maxPostMode := p.MaxPostMode
	if maxPostMode == "" {
		maxPostMode = model.MAXPostModeOwn
	}
	const q = `
		UPDATE channels
		SET name = $3,
		    chat_type = $4,
		    bot_username = $5,
		    bot_token_encrypted = NULLIF($6, ''),
		    max_post_mode = $7,
		    status = $8,
		    last_error = NULL,
		    updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2
		RETURNING id, workspace_id, provider, name, chat_id, chat_type, bot_username,
		          COALESCE(max_post_mode, 'own'), status, COALESCE(last_error, ''), created_at, updated_at
	`
	var ch model.Channel
	err := r.pool.QueryRow(ctx, q,
		p.ChannelID, p.WorkspaceID, p.Name, p.ChatType, p.BotUsername,
		p.BotTokenEncrypted, maxPostMode, p.Status,
	).Scan(
		&ch.ID, &ch.WorkspaceID, &ch.Provider, &ch.Name, &ch.ChatID, &ch.ChatType,
		&ch.BotUsername, &ch.MaxPostMode, &ch.Status, &ch.LastError, &ch.CreatedAt, &ch.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &ch, nil
}

func (r *ChannelRepository) Delete(ctx context.Context, workspaceID, channelID string) error {
	const q = `DELETE FROM channels WHERE id = $1 AND workspace_id = $2`
	ct, err := r.pool.Exec(ctx, q, channelID, workspaceID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
