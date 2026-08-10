package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type PostRepository struct {
	pool *pgxpool.Pool
}

func NewPostRepository(pool *pgxpool.Pool) *PostRepository {
	return &PostRepository{pool: pool}
}

const postColumns = `
	id, workspace_id, COALESCE(created_by_user_id::text, ''), status, content, settings,
	due_at, published_at, COALESCE(last_error, ''), created_at, updated_at
`

func scanPost(row pgx.Row) (*model.Post, error) {
	var post model.Post
	var contentRaw, settingsRaw []byte
	err := row.Scan(
		&post.ID, &post.WorkspaceID, &post.CreatedByUserID, &post.Status, &contentRaw, &settingsRaw,
		&post.DueAt, &post.PublishedAt, &post.LastError, &post.CreatedAt, &post.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(contentRaw, &post.Content); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(settingsRaw, &post.Settings); err != nil {
		return nil, err
	}
	post.Targets = []model.PostTarget{}
	post.Media = []model.PostMedia{}
	return &post, nil
}

func (r *PostRepository) List(ctx context.Context, workspaceID string, limit, offset int) ([]model.Post, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	rows, err := r.pool.Query(ctx, `
		SELECT `+postColumns+`
		FROM posts
		WHERE workspace_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, workspaceID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]model.Post, 0)
	for rows.Next() {
		post, err := scanPost(rows)
		if err != nil {
			return nil, err
		}
		if err := r.loadRelations(ctx, post); err != nil {
			return nil, err
		}
		items = append(items, *post)
	}
	return items, rows.Err()
}

func (r *PostRepository) Get(ctx context.Context, workspaceID, postID string) (*model.Post, error) {
	post, err := scanPost(r.pool.QueryRow(ctx, `
		SELECT `+postColumns+` FROM posts WHERE id = $1 AND workspace_id = $2
	`, postID, workspaceID))
	if err != nil {
		return nil, err
	}
	if err := r.loadRelations(ctx, post); err != nil {
		return nil, err
	}
	return post, nil
}

func (r *PostRepository) GetByID(ctx context.Context, postID string) (*model.Post, error) {
	post, err := scanPost(r.pool.QueryRow(ctx, `
		SELECT `+postColumns+` FROM posts WHERE id = $1
	`, postID))
	if err != nil {
		return nil, err
	}
	if err := r.loadRelations(ctx, post); err != nil {
		return nil, err
	}
	return post, nil
}

func (r *PostRepository) loadRelations(ctx context.Context, post *model.Post) error {
	targetRows, err := r.pool.Query(ctx, `
		SELECT id, channel_id, status, settings, COALESCE(provider_post_id, ''),
		       COALESCE(last_error, ''), attempts, last_attempt_at, next_attempt_at, published_at
		FROM post_targets WHERE post_id = $1 ORDER BY created_at, id
	`, post.ID)
	if err != nil {
		return err
	}
	for targetRows.Next() {
		var target model.PostTarget
		if err := targetRows.Scan(
			&target.ID, &target.ChannelID, &target.Status, &target.Settings, &target.ProviderPostID,
			&target.LastError, &target.Attempts, &target.LastAttemptAt, &target.NextAttemptAt, &target.PublishedAt,
		); err != nil {
			targetRows.Close()
			return err
		}
		post.Targets = append(post.Targets, target)
	}
	if err := targetRows.Err(); err != nil {
		targetRows.Close()
		return err
	}
	targetRows.Close()

	mediaRows, err := r.pool.Query(ctx, `
		SELECT id, file_id, position, settings
		FROM post_media WHERE post_id = $1 ORDER BY position
	`, post.ID)
	if err != nil {
		return err
	}
	defer mediaRows.Close()
	for mediaRows.Next() {
		var media model.PostMedia
		if err := mediaRows.Scan(&media.ID, &media.FileID, &media.Position, &media.Settings); err != nil {
			return err
		}
		post.Media = append(post.Media, media)
	}
	return mediaRows.Err()
}

func normalizeJSON(raw json.RawMessage) []byte {
	if len(raw) == 0 {
		return []byte("{}")
	}
	return raw
}

func (r *PostRepository) Create(
	ctx context.Context,
	workspaceID, userID string,
	req model.PostSaveRequest,
) (*model.Post, error) {
	contentRaw, err := json.Marshal(req.Content)
	if err != nil {
		return nil, err
	}
	settingsRaw, err := json.Marshal(req.Settings)
	if err != nil {
		return nil, err
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var postID string
	if err := tx.QueryRow(ctx, `
		INSERT INTO posts (workspace_id, created_by_user_id, content, settings)
		VALUES ($1, $2, $3, $4) RETURNING id
	`, workspaceID, userID, contentRaw, settingsRaw).Scan(&postID); err != nil {
		return nil, err
	}
	if err := replacePostRelations(ctx, tx, workspaceID, postID, req); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.Get(ctx, workspaceID, postID)
}

func (r *PostRepository) Update(
	ctx context.Context,
	workspaceID, postID string,
	req model.PostSaveRequest,
) (*model.Post, error) {
	contentRaw, err := json.Marshal(req.Content)
	if err != nil {
		return nil, err
	}
	settingsRaw, err := json.Marshal(req.Settings)
	if err != nil {
		return nil, err
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE posts
		SET content = $3, settings = $4, status = 'draft', due_at = NULL,
		    published_at = NULL, last_error = NULL, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2
		  AND status IN ('draft', 'failed', 'canceled')
	`, postID, workspaceID, contentRaw, settingsRaw)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	if err := replacePostRelations(ctx, tx, workspaceID, postID, req); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.Get(ctx, workspaceID, postID)
}

func replacePostRelations(
	ctx context.Context,
	tx pgx.Tx,
	workspaceID, postID string,
	req model.PostSaveRequest,
) error {
	if _, err := tx.Exec(ctx, `DELETE FROM post_targets WHERE post_id = $1`, postID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM post_media WHERE post_id = $1`, postID); err != nil {
		return err
	}
	for _, target := range req.Targets {
		if _, err := tx.Exec(ctx, `
			INSERT INTO post_targets (workspace_id, post_id, channel_id, settings)
			VALUES ($1, $2, $3, $4)
		`, workspaceID, postID, target.ChannelID, normalizeJSON(target.Settings)); err != nil {
			return err
		}
	}
	for position, media := range req.Media {
		if _, err := tx.Exec(ctx, `
			INSERT INTO post_media (workspace_id, post_id, file_id, position, settings)
			VALUES ($1, $2, $3, $4, $5)
		`, workspaceID, postID, media.FileID, position, normalizeJSON(media.Settings)); err != nil {
			return err
		}
	}
	return nil
}

func (r *PostRepository) DeleteDraft(ctx context.Context, workspaceID, postID string) error {
	tag, err := r.pool.Exec(ctx, `
		DELETE FROM posts WHERE id = $1 AND workspace_id = $2 AND status = 'draft'
	`, postID, workspaceID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PostRepository) SetScheduled(ctx context.Context, workspaceID, postID string, dueAt time.Time) (*model.Post, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	tag, err := tx.Exec(ctx, `
		UPDATE posts SET status = 'scheduled', due_at = $3, last_error = NULL, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2 AND status IN ('draft', 'scheduled', 'failed', 'canceled')
	`, postID, workspaceID, dueAt)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	if _, err := tx.Exec(ctx, `
		UPDATE post_targets
		SET status = 'pending', last_error = NULL, attempts = 0,
		    last_attempt_at = NULL, next_attempt_at = $2, published_at = NULL, updated_at = NOW()
		WHERE post_id = $1 AND status <> 'published'
	`, postID, dueAt); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.Get(ctx, workspaceID, postID)
}

func (r *PostRepository) SetPublishing(ctx context.Context, workspaceID, postID string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE posts SET status = 'publishing', due_at = NULL, last_error = NULL, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2 AND status IN ('draft', 'failed', 'scheduled')
	`, postID, workspaceID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PostRepository) Cancel(ctx context.Context, workspaceID, postID string) (*model.Post, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	tag, err := tx.Exec(ctx, `
		UPDATE posts SET status = 'canceled', due_at = NULL, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2 AND status IN ('draft', 'scheduled', 'failed')
	`, postID, workspaceID)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	if _, err := tx.Exec(ctx, `
		UPDATE post_targets SET status = 'canceled', next_attempt_at = NULL, updated_at = NOW()
		WHERE post_id = $1 AND status <> 'published'
	`, postID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.Get(ctx, workspaceID, postID)
}

func (r *PostRepository) StartTarget(ctx context.Context, targetID string) (bool, error) {
	tag, err := r.pool.Exec(ctx, `
		UPDATE post_targets
		SET status = 'publishing', attempts = attempts + 1, last_attempt_at = NOW(),
		    next_attempt_at = NULL, last_error = NULL, updated_at = NOW()
		WHERE id = $1 AND status IN ('pending', 'failed') AND attempts < 5
		  AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
	`, targetID)
	return tag.RowsAffected() == 1, err
}

func (r *PostRepository) CompleteTarget(ctx context.Context, targetID, providerPostID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE post_targets
		SET status = 'published', provider_post_id = NULLIF($2, ''), published_at = NOW(),
		    last_error = NULL, next_attempt_at = NULL, updated_at = NOW()
		WHERE id = $1 AND status = 'publishing'
	`, targetID, providerPostID)
	return err
}

func (r *PostRepository) FailTarget(ctx context.Context, targetID, message string, retryAt *time.Time) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE post_targets
		SET status = 'failed', last_error = $2, next_attempt_at = $3, updated_at = NOW()
		WHERE id = $1 AND status = 'publishing'
	`, targetID, message, retryAt)
	return err
}

func (r *PostRepository) FinalizePublication(ctx context.Context, postID string, retryAt *time.Time) error {
	var pending, failed, published int
	var lastError string
	var queuedRetry *time.Time
	err := r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE status IN ('pending', 'publishing')),
			COUNT(*) FILTER (WHERE status = 'failed'),
			COUNT(*) FILTER (WHERE status = 'published'),
			COALESCE(MAX(last_error) FILTER (WHERE status = 'failed'), ''),
			MIN(next_attempt_at) FILTER (WHERE status = 'failed' AND attempts < 5)
		FROM post_targets WHERE post_id = $1
	`, postID).Scan(&pending, &failed, &published, &lastError, &queuedRetry)
	if err != nil {
		return err
	}
	if retryAt == nil || (queuedRetry != nil && queuedRetry.Before(*retryAt)) {
		retryAt = queuedRetry
	}
	status := model.PostStatusPublished
	var dueAt *time.Time
	if pending > 0 || failed > 0 {
		status = model.PostStatusFailed
		if retryAt != nil {
			status = model.PostStatusScheduled
			dueAt = retryAt
		}
	}
	if published == 0 && failed == 0 && pending == 0 {
		status = model.PostStatusFailed
		lastError = "У публикации нет получателей"
	}
	_, err = r.pool.Exec(ctx, `
		UPDATE posts
		SET status = $2, due_at = $3,
		    published_at = CASE WHEN $2 = 'published' THEN NOW() ELSE published_at END,
		    last_error = NULLIF($4, ''), updated_at = NOW()
		WHERE id = $1
	`, postID, status, dueAt, lastError)
	return err
}

func (r *PostRepository) ClaimDue(ctx context.Context, limit int) ([]string, error) {
	if limit <= 0 {
		limit = 1
	}
	rows, err := r.pool.Query(ctx, `
		WITH due AS (
			SELECT id
			FROM posts
			WHERE (status = 'scheduled' AND due_at <= NOW())
			   OR (status = 'publishing' AND updated_at < NOW() - INTERVAL '5 minutes')
			ORDER BY due_at NULLS FIRST, id
			FOR UPDATE SKIP LOCKED
			LIMIT $1
		)
		UPDATE posts p
		SET status = 'publishing', due_at = NULL, updated_at = NOW()
		FROM due
		WHERE p.id = due.id
		RETURNING p.id
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ids := make([]string, 0, limit)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (r *PostRepository) ResetStaleTargets(ctx context.Context, postID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE post_targets
		SET status = 'failed', last_error = 'Предыдущая попытка публикации была прервана',
		    next_attempt_at = NOW(), updated_at = NOW()
		WHERE post_id = $1 AND status = 'publishing'
		  AND last_attempt_at < NOW() - INTERVAL '5 minutes'
	`, postID)
	return err
}

func (r *PostRepository) ValidateFiles(ctx context.Context, workspaceID string, fileIDs []string) error {
	if len(fileIDs) == 0 {
		return nil
	}
	var count int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM workspace_files
		WHERE workspace_id = $1 AND id::text = ANY($2) AND deleted_at IS NULL
	`, workspaceID, fileIDs).Scan(&count)
	if err != nil {
		return err
	}
	if count != len(fileIDs) {
		return fmt.Errorf("один или несколько медиафайлов не найдены")
	}
	return nil
}
