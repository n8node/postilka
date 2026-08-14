package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type LinkCodeRepository struct {
	pool *pgxpool.Pool
}

func NewLinkCodeRepository(pool *pgxpool.Pool) *LinkCodeRepository {
	return &LinkCodeRepository{pool: pool}
}

type LinkCodeCreateInput struct {
	Code           string
	DestinationURL string
	WorkspaceID    string
	PostID         string
	TargetID       string
	ChannelID      string
}

func (r *LinkCodeRepository) Create(ctx context.Context, input LinkCodeCreateInput) (*model.LinkCode, error) {
	var link model.LinkCode
	err := r.pool.QueryRow(ctx, `
		INSERT INTO link_codes (code, destination_url, workspace_id, post_id, target_id, channel_id)
		VALUES ($1, $2, $3, NULLIF($4, '')::uuid, NULLIF($5, '')::uuid, NULLIF($6, '')::uuid)
		RETURNING id, code, destination_url, workspace_id::text,
		          COALESCE(post_id::text, ''), COALESCE(target_id::text, ''), COALESCE(channel_id::text, ''), created_at
	`, input.Code, input.DestinationURL, input.WorkspaceID, input.PostID, input.TargetID, input.ChannelID).Scan(
		&link.ID, &link.Code, &link.DestinationURL, &link.WorkspaceID,
		&link.PostID, &link.TargetID, &link.ChannelID, &link.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &link, nil
}

func (r *LinkCodeRepository) FindExisting(
	ctx context.Context,
	workspaceID, postID, targetID, destinationURL string,
) (*model.LinkCode, error) {
	var link model.LinkCode
	err := r.pool.QueryRow(ctx, `
		SELECT id, code, destination_url, workspace_id::text,
		       COALESCE(post_id::text, ''), COALESCE(target_id::text, ''), COALESCE(channel_id::text, ''), created_at
		FROM link_codes
		WHERE workspace_id = $1
		  AND COALESCE(post_id::text, '') = $2
		  AND COALESCE(target_id::text, '') = $3
		  AND destination_url = $4
		ORDER BY created_at DESC
		LIMIT 1
	`, workspaceID, postID, targetID, destinationURL).Scan(
		&link.ID, &link.Code, &link.DestinationURL, &link.WorkspaceID,
		&link.PostID, &link.TargetID, &link.ChannelID, &link.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &link, nil
}

func (r *LinkCodeRepository) GetByCode(ctx context.Context, code string) (*model.LinkCode, error) {
	var link model.LinkCode
	err := r.pool.QueryRow(ctx, `
		SELECT id, code, destination_url, workspace_id::text,
		       COALESCE(post_id::text, ''), COALESCE(target_id::text, ''), COALESCE(channel_id::text, ''), created_at
		FROM link_codes WHERE code = $1
	`, code).Scan(
		&link.ID, &link.Code, &link.DestinationURL, &link.WorkspaceID,
		&link.PostID, &link.TargetID, &link.ChannelID, &link.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &link, nil
}

func (r *LinkCodeRepository) RecordClick(
	ctx context.Context,
	linkCodeID, referrerHash, userAgentHash string,
	isBot bool,
) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO link_clicks (link_code_id, referrer_hash, user_agent_hash, is_bot)
		VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), $4)
	`, linkCodeID, referrerHash, userAgentHash, isBot)
	return err
}

type LinkClickCounts struct {
	Total  int
	Unique int
}

func (r *LinkCodeRepository) CountClicksByTarget(ctx context.Context, targetID string) (LinkClickCounts, error) {
	var counts LinkClickCounts
	err := r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE lc.is_bot = false)::int,
			COUNT(DISTINCT COALESCE(lc.referrer_hash, '') || ':' || COALESCE(lc.user_agent_hash, ''))
				FILTER (WHERE lc.is_bot = false)::int
		FROM link_clicks lc
		JOIN link_codes lk ON lk.id = lc.link_code_id
		WHERE lk.target_id = $1::uuid
	`, targetID).Scan(&counts.Total, &counts.Unique)
	return counts, err
}

func (r *LinkCodeRepository) CountClicksByPost(ctx context.Context, postID string) (LinkClickCounts, error) {
	var counts LinkClickCounts
	err := r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE lc.is_bot = false)::int,
			COUNT(DISTINCT COALESCE(lc.referrer_hash, '') || ':' || COALESCE(lc.user_agent_hash, ''))
				FILTER (WHERE lc.is_bot = false)::int
		FROM link_clicks lc
		JOIN link_codes lk ON lk.id = lc.link_code_id
		WHERE lk.post_id = $1::uuid
	`, postID).Scan(&counts.Total, &counts.Unique)
	return counts, err
}

type PostApprovalRepository struct {
	pool *pgxpool.Pool
}

func NewPostApprovalRepository(pool *pgxpool.Pool) *PostApprovalRepository {
	return &PostApprovalRepository{pool: pool}
}

func (r *PostApprovalRepository) AddEvent(
	ctx context.Context,
	workspaceID, postID, actorUserID, action, comment string,
) (*model.PostApprovalEvent, error) {
	var event model.PostApprovalEvent
	err := r.pool.QueryRow(ctx, `
		INSERT INTO post_approval_events (post_id, workspace_id, actor_user_id, action, comment)
		VALUES ($1, $2, NULLIF($3, '')::uuid, $4, NULLIF($5, ''))
		RETURNING id, post_id::text, workspace_id::text, COALESCE(actor_user_id::text, ''), action,
		          COALESCE(comment, ''), created_at
	`, postID, workspaceID, actorUserID, action, comment).Scan(
		&event.ID, &event.PostID, &event.WorkspaceID, &event.ActorUserID, &event.Action, &event.Comment, &event.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &event, nil
}

func (r *PostApprovalRepository) ListByPost(ctx context.Context, workspaceID, postID string) ([]model.PostApprovalEvent, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, post_id::text, workspace_id::text, COALESCE(actor_user_id::text, ''), action,
		       COALESCE(comment, ''), created_at
		FROM post_approval_events
		WHERE workspace_id = $1 AND post_id = $2
		ORDER BY created_at ASC
	`, workspaceID, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]model.PostApprovalEvent, 0)
	for rows.Next() {
		var event model.PostApprovalEvent
		if err := rows.Scan(
			&event.ID, &event.PostID, &event.WorkspaceID, &event.ActorUserID, &event.Action, &event.Comment, &event.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, event)
	}
	return items, rows.Err()
}
