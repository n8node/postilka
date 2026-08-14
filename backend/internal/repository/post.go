package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
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

type PostListFilter struct {
	WorkspaceID string
	Status      string
	ChannelID   string
	Query       string
	Format      string
	Limit       int
	Offset      int
}

func (r *PostRepository) buildListWhere(filter PostListFilter) (string, []any) {
	conditions := []string{"workspace_id = $1"}
	args := []any{filter.WorkspaceID}
	argN := 2

	if filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argN))
		args = append(args, filter.Status)
		argN++
	}
	if filter.ChannelID != "" {
		conditions = append(conditions, fmt.Sprintf(`EXISTS (
			SELECT 1 FROM post_targets pt
			WHERE pt.post_id = posts.id AND pt.channel_id = $%d
		)`, argN))
		args = append(args, filter.ChannelID)
		argN++
	}
	if filter.Query != "" {
		pattern := "%" + filter.Query + "%"
		conditions = append(conditions, fmt.Sprintf(`(
			COALESCE(content->>'text', '') ILIKE $%d
			OR COALESCE(content->'rich_message'->>'title', '') ILIKE $%d
			OR COALESCE(content->>'title', '') ILIKE $%d
		)`, argN, argN, argN))
		args = append(args, pattern)
		argN++
	}
	if filter.Format != "" {
		conditions = append(conditions, fmt.Sprintf("COALESCE(content->>'format', 'message') = $%d", argN))
		args = append(args, filter.Format)
		argN++
	}

	return strings.Join(conditions, " AND "), args
}

func (r *PostRepository) List(ctx context.Context, filter PostListFilter) ([]model.Post, int, error) {
	if filter.Limit <= 0 || filter.Limit > 100 {
		filter.Limit = 50
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}

	where, args := r.buildListWhere(filter)

	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM posts WHERE `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listArgs := append(append([]any{}, args...), filter.Limit, filter.Offset)
	limitArg := len(args) + 1
	offsetArg := len(args) + 2
	rows, err := r.pool.Query(ctx, `
		SELECT `+postColumns+`
		FROM posts
		WHERE `+where+`
		ORDER BY updated_at DESC
		LIMIT $`+fmt.Sprint(limitArg)+` OFFSET $`+fmt.Sprint(offsetArg),
		listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]model.Post, 0)
	for rows.Next() {
		post, err := scanPost(rows)
		if err != nil {
			return nil, 0, err
		}
		if err := r.loadRelations(ctx, post); err != nil {
			return nil, 0, err
		}
		items = append(items, *post)
	}
	return items, total, rows.Err()
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
		  AND status IN ('draft', 'failed', 'canceled', 'pending_approval', 'scheduled', 'publishing')
	`, postID, workspaceID, contentRaw, settingsRaw)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	if _, err := tx.Exec(ctx, `
		UPDATE post_targets
		SET status = 'pending', last_error = NULL, next_attempt_at = NULL, updated_at = NOW()
		WHERE post_id = $1 AND status = 'publishing'
	`, postID); err != nil {
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

func (r *PostRepository) UpdatePublishedStory(
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
		SET content = $3, settings = $4, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2
		  AND status = 'published'
		  AND lower(content->>'format') = 'story'
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
	if _, err := tx.Exec(ctx, `
		DELETE FROM post_targets WHERE post_id = $1 AND status <> 'published'
	`, postID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM post_media WHERE post_id = $1`, postID); err != nil {
		return err
	}
	for _, target := range req.Targets {
		tag, err := tx.Exec(ctx, `
			UPDATE post_targets
			SET settings = $3, updated_at = NOW()
			WHERE post_id = $1 AND channel_id = $2 AND status = 'published'
		`, postID, target.ChannelID, normalizeJSON(target.Settings))
		if err != nil {
			return err
		}
		if tag.RowsAffected() > 0 {
			continue
		}
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
		DELETE FROM posts
		WHERE id = $1 AND workspace_id = $2 AND status IN ('draft', 'canceled', 'failed')
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
		WHERE id = $1 AND workspace_id = $2 AND status IN ('draft', 'scheduled', 'failed', 'pending_approval', 'canceled')
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
		WHERE id = $1 AND workspace_id = $2 AND status IN ('draft', 'failed', 'scheduled', 'pending_approval')
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
		WHERE id = $1 AND workspace_id = $2 AND status IN ('draft', 'scheduled', 'failed', 'pending_approval')
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
		SET status = $2::varchar, due_at = $3,
		    published_at = CASE WHEN $2::varchar = 'published' THEN NOW() ELSE published_at END,
		    last_error = NULLIF($4, ''), updated_at = NOW()
		WHERE id = $1
	`, postID, string(status), dueAt, lastError)
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

func (r *PostRepository) SetPendingApproval(
	ctx context.Context,
	workspaceID, postID string,
	dueAt *time.Time,
) (*model.Post, error) {
	tag, err := r.pool.Exec(ctx, `
		UPDATE posts
		SET status = 'pending_approval', due_at = $3, last_error = NULL, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2
		  AND status IN ('draft', 'failed', 'canceled', 'pending_approval')
	`, postID, workspaceID, dueAt)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	return r.Get(ctx, workspaceID, postID)
}

func (r *PostRepository) RejectApproval(
	ctx context.Context,
	workspaceID, postID string,
) (*model.Post, error) {
	tag, err := r.pool.Exec(ctx, `
		UPDATE posts
		SET status = 'draft', due_at = NULL, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2 AND status = 'pending_approval'
	`, postID, workspaceID)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	return r.Get(ctx, workspaceID, postID)
}

func (r *PostRepository) CloneForRecurrence(
	ctx context.Context,
	source *model.Post,
	nextDue time.Time,
) (*model.Post, error) {
	if source == nil {
		return nil, fmt.Errorf("source post required")
	}
	settings := source.Settings
	if settings.Recurrence == nil {
		return nil, fmt.Errorf("recurrence settings missing")
	}
	recurrence := *settings.Recurrence
	sourceID := source.ID
	if recurrence.SourcePostID != "" {
		sourceID = recurrence.SourcePostID
	}
	runNumber := recurrence.RunNumber
	if runNumber <= 0 {
		runNumber = 1
	}
	runNumber++
	recurrence.SourcePostID = sourceID
	recurrence.RunNumber = runNumber
	settings.Recurrence = &recurrence

	contentRaw, err := json.Marshal(source.Content)
	if err != nil {
		return nil, err
	}
	settingsRaw, err := json.Marshal(settings)
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
		INSERT INTO posts (workspace_id, created_by_user_id, status, content, settings, due_at)
		VALUES ($1, $2, 'scheduled', $3, $4, $5)
		RETURNING id
	`, source.WorkspaceID, source.CreatedByUserID, contentRaw, settingsRaw, nextDue.UTC()).Scan(&postID); err != nil {
		return nil, err
	}

	for _, target := range source.Targets {
		if _, err := tx.Exec(ctx, `
			INSERT INTO post_targets (workspace_id, post_id, channel_id, settings)
			VALUES ($1, $2, $3, $4)
		`, source.WorkspaceID, postID, target.ChannelID, normalizeJSON(target.Settings)); err != nil {
			return nil, err
		}
	}
	for _, media := range source.Media {
		if _, err := tx.Exec(ctx, `
			INSERT INTO post_media (workspace_id, post_id, file_id, position, settings)
			VALUES ($1, $2, $3, $4, $5)
		`, source.WorkspaceID, postID, media.FileID, media.Position, normalizeJSON(media.Settings)); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.Get(ctx, source.WorkspaceID, postID)
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
