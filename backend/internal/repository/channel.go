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

const channelSelectSQL = `
	id, workspace_id, provider, name, chat_id, chat_type, bot_username,
	COALESCE(max_post_mode, 'own'), COALESCE(vk_oauth_mode, 'own'), status, COALESCE(last_error, ''),
	COALESCE(metadata, '{}'), metadata_refreshed_at, created_at, updated_at
`

type ChannelRepository struct {
	pool *pgxpool.Pool
}

type ChannelRow struct {
	Channel           model.Channel
	BotTokenEncrypted string
}

func NewChannelRepository(pool *pgxpool.Pool) *ChannelRepository {
	return &ChannelRepository{pool: pool}
}

func scanChannelMeta(raw []byte, meta *model.ChannelMetadata) error {
	if len(raw) == 0 {
		*meta = model.ChannelMetadata{}
		return nil
	}
	return json.Unmarshal(raw, meta)
}

func (r *ChannelRepository) scanChannel(row pgx.Row, ch *model.Channel) error {
	var metaRaw []byte
	err := row.Scan(
		&ch.ID, &ch.WorkspaceID, &ch.Provider, &ch.Name, &ch.ChatID, &ch.ChatType,
		&ch.BotUsername, &ch.MaxPostMode, &ch.VKOAuthMode, &ch.Status, &ch.LastError,
		&metaRaw, &ch.MetadataRefreshedAt, &ch.CreatedAt, &ch.UpdatedAt,
	)
	if err != nil {
		return err
	}
	return scanChannelMeta(metaRaw, &ch.Metadata)
}

func (r *ChannelRepository) ListRowsByWorkspace(ctx context.Context, workspaceID string) ([]ChannelRow, error) {
	q := `SELECT ` + channelSelectSQL + `, COALESCE(bot_token_encrypted, '')
		FROM channels WHERE workspace_id = $1 ORDER BY created_at DESC`
	rows, err := r.pool.Query(ctx, q, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []ChannelRow
	for rows.Next() {
		var row ChannelRow
		var metaRaw []byte
		err := rows.Scan(
			&row.Channel.ID, &row.Channel.WorkspaceID, &row.Channel.Provider, &row.Channel.Name,
			&row.Channel.ChatID, &row.Channel.ChatType, &row.Channel.BotUsername,
			&row.Channel.MaxPostMode, &row.Channel.VKOAuthMode, &row.Channel.Status, &row.Channel.LastError,
			&metaRaw, &row.Channel.MetadataRefreshedAt, &row.Channel.CreatedAt, &row.Channel.UpdatedAt,
			&row.BotTokenEncrypted,
		)
		if err != nil {
			return nil, err
		}
		if err := scanChannelMeta(metaRaw, &row.Channel.Metadata); err != nil {
			return nil, err
		}
		items = append(items, row)
	}
	return items, rows.Err()
}

func (r *ChannelRepository) ListByWorkspace(ctx context.Context, workspaceID string) ([]model.Channel, error) {
	rows, err := r.ListRowsByWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	items := make([]model.Channel, 0, len(rows))
	for _, row := range rows {
		items = append(items, row.Channel)
	}
	return items, nil
}

func (r *ChannelRepository) CountByWorkspace(ctx context.Context, workspaceID string) (int, error) {
	const q = `SELECT COUNT(*) FROM channels WHERE workspace_id = $1 AND status != 'disabled'`
	var n int
	err := r.pool.QueryRow(ctx, q, workspaceID).Scan(&n)
	return n, err
}

func (r *ChannelRepository) GetRowByID(ctx context.Context, workspaceID, channelID string) (*ChannelRow, error) {
	q := `SELECT ` + channelSelectSQL + `, COALESCE(bot_token_encrypted, '')
		FROM channels WHERE id = $1 AND workspace_id = $2`
	var row ChannelRow
	var metaRaw []byte
	err := r.pool.QueryRow(ctx, q, channelID, workspaceID).Scan(
		&row.Channel.ID, &row.Channel.WorkspaceID, &row.Channel.Provider, &row.Channel.Name,
		&row.Channel.ChatID, &row.Channel.ChatType, &row.Channel.BotUsername,
		&row.Channel.MaxPostMode, &row.Channel.VKOAuthMode, &row.Channel.Status, &row.Channel.LastError,
		&metaRaw, &row.Channel.MetadataRefreshedAt, &row.Channel.CreatedAt, &row.Channel.UpdatedAt,
		&row.BotTokenEncrypted,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if err := scanChannelMeta(metaRaw, &row.Channel.Metadata); err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *ChannelRepository) GetByID(ctx context.Context, workspaceID, channelID string) (*model.Channel, error) {
	row, err := r.GetRowByID(ctx, workspaceID, channelID)
	if err != nil {
		return nil, err
	}
	return &row.Channel, nil
}

func (r *ChannelRepository) GetTokenEncrypted(ctx context.Context, workspaceID, channelID string) (string, error) {
	const q = `
		SELECT COALESCE(bot_token_encrypted, '')
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
	q := `SELECT ` + channelSelectSQL + `
		FROM channels WHERE workspace_id = $1 AND provider = $2 AND chat_id = $3`
	var ch model.Channel
	row := r.pool.QueryRow(ctx, q, workspaceID, provider, chatID)
	if err := r.scanChannel(row, &ch); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &ch, nil
}

type ChannelCreateParams struct {
	WorkspaceID         string
	Provider            model.ChannelProvider
	Name                string
	ChatID              string
	ChatType            string
	BotUsername         string
	BotTokenEncrypted   string
	MaxPostMode         model.MAXPostMode
	VKOAuthMode         model.VKOAuthMode
	Status              model.ChannelStatus
	Metadata            model.ChannelMetadata
	MetadataRefreshedAt *time.Time
}

func (r *ChannelRepository) Create(ctx context.Context, p ChannelCreateParams) (*model.Channel, error) {
	maxPostMode := p.MaxPostMode
	if maxPostMode == "" {
		maxPostMode = model.MAXPostModeOwn
	}
	vkOAuthMode := p.VKOAuthMode
	if vkOAuthMode == "" {
		vkOAuthMode = model.VKOAuthModeOwn
	}
	metaRaw, err := json.Marshal(p.Metadata)
	if err != nil {
		return nil, err
	}
	const q = `
		INSERT INTO channels (
			workspace_id, provider, name, chat_id, chat_type, bot_username,
			bot_token_encrypted, max_post_mode, vk_oauth_mode, status, metadata, metadata_refreshed_at
		) VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, ''), $8, $9, $10, $11, $12)
		RETURNING ` + channelSelectSQL
	var ch model.Channel
	err = r.scanChannel(r.pool.QueryRow(ctx, q,
		p.WorkspaceID, p.Provider, p.Name, p.ChatID, p.ChatType, p.BotUsername,
		p.BotTokenEncrypted, maxPostMode, vkOAuthMode, p.Status, metaRaw, p.MetadataRefreshedAt,
	), &ch)
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

type ChannelSaveParams struct {
	WorkspaceID         string
	ChannelID           string
	Provider            model.ChannelProvider
	Name                string
	ChatType            string
	BotUsername         string
	BotTokenEncrypted   string
	MaxPostMode         model.MAXPostMode
	VKOAuthMode         model.VKOAuthMode
	Status              model.ChannelStatus
	Metadata            model.ChannelMetadata
	MetadataRefreshedAt *time.Time
}

func (r *ChannelRepository) SaveChannel(ctx context.Context, p ChannelSaveParams) (*model.Channel, error) {
	maxPostMode := p.MaxPostMode
	if maxPostMode == "" {
		maxPostMode = model.MAXPostModeOwn
	}
	vkOAuthMode := p.VKOAuthMode
	if vkOAuthMode == "" {
		vkOAuthMode = model.VKOAuthModeOwn
	}
	metaRaw, err := json.Marshal(p.Metadata)
	if err != nil {
		return nil, err
	}
	const q = `
		UPDATE channels
		SET name = $4,
		    chat_type = $5,
		    bot_username = $6,
		    bot_token_encrypted = NULLIF($7, ''),
		    max_post_mode = $8,
		    vk_oauth_mode = $9,
		    status = $10,
		    metadata = $11,
		    metadata_refreshed_at = $12,
		    last_error = NULL,
		    updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2 AND provider = $3
		RETURNING ` + channelSelectSQL
	var ch model.Channel
	err = r.scanChannel(r.pool.QueryRow(ctx, q,
		p.ChannelID, p.WorkspaceID, p.Provider, p.Name, p.ChatType, p.BotUsername,
		p.BotTokenEncrypted, maxPostMode, vkOAuthMode, p.Status, metaRaw, p.MetadataRefreshedAt,
	), &ch)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &ch, nil
}

func (r *ChannelRepository) UpdateToken(ctx context.Context, workspaceID, channelID, botTokenEncrypted, botUsername string, status model.ChannelStatus) (*model.Channel, error) {
	const q = `
		UPDATE channels
		SET bot_token_encrypted = NULLIF($3, ''),
		    bot_username = $4,
		    status = $5,
		    last_error = NULL,
		    updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2
		RETURNING ` + channelSelectSQL
	var ch model.Channel
	err := r.scanChannel(r.pool.QueryRow(ctx, q, channelID, workspaceID, botTokenEncrypted, botUsername, status), &ch)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &ch, nil
}

type ChannelMAXReconnectParams struct {
	WorkspaceID         string
	ChannelID           string
	Name                string
	ChatType            string
	BotUsername         string
	BotTokenEncrypted   string
	MaxPostMode         model.MAXPostMode
	VKOAuthMode         model.VKOAuthMode
	Status              model.ChannelStatus
	Metadata            model.ChannelMetadata
	MetadataRefreshedAt *time.Time
}

func (r *ChannelRepository) UpdateMAXConnection(ctx context.Context, p ChannelMAXReconnectParams) (*model.Channel, error) {
	return r.SaveChannel(ctx, ChannelSaveParams{
		WorkspaceID:         p.WorkspaceID,
		ChannelID:           p.ChannelID,
		Provider:            model.ChannelProviderMAX,
		Name:                p.Name,
		ChatType:            p.ChatType,
		BotUsername:         p.BotUsername,
		BotTokenEncrypted:   p.BotTokenEncrypted,
		MaxPostMode:         p.MaxPostMode,
		VKOAuthMode:         model.VKOAuthModeOwn,
		Status:              p.Status,
		Metadata:            p.Metadata,
		MetadataRefreshedAt: p.MetadataRefreshedAt,
	})
}

type ChannelVKReconnectParams struct {
	WorkspaceID         string
	ChannelID           string
	Name                string
	ChatType            string
	BotTokenEncrypted   string
	VKOAuthMode         model.VKOAuthMode
	Status              model.ChannelStatus
	Metadata            model.ChannelMetadata
	MetadataRefreshedAt *time.Time
}

func (r *ChannelRepository) UpdateVKConnection(ctx context.Context, p ChannelVKReconnectParams) (*model.Channel, error) {
	vkMode := p.VKOAuthMode
	if vkMode == "" {
		vkMode = model.VKOAuthModeOwn
	}
	return r.SaveChannel(ctx, ChannelSaveParams{
		WorkspaceID:         p.WorkspaceID,
		ChannelID:           p.ChannelID,
		Provider:            model.ChannelProviderVK,
		Name:                p.Name,
		ChatType:            p.ChatType,
		BotTokenEncrypted:   p.BotTokenEncrypted,
		MaxPostMode:         model.MAXPostModeOwn,
		VKOAuthMode:         vkMode,
		Status:              p.Status,
		Metadata:            p.Metadata,
		MetadataRefreshedAt: p.MetadataRefreshedAt,
	})
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
