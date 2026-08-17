package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/postilka/postilka/internal/model"
)

type ListPostsAdminFilter struct {
	Query         string
	WorkspaceID   string
	Status        string
	Origin        string
	CreatedByUser string
	MissionID     string
	ChannelID     string
	Provider      string
	CreatedFrom   *time.Time
	CreatedTo     *time.Time
	PublishedFrom *time.Time
	PublishedTo   *time.Time
	HasMetrics    *bool
	Limit         int
	Offset        int
}

func (r *PostRepository) AdminStats(ctx context.Context, f ListPostsAdminFilter) (*model.AdminPostStats, error) {
	statsFilter := f
	statsFilter.Status = ""
	statsFilter.Origin = ""
	statsFilter.HasMetrics = nil
	where, args := buildAdminPostsWhere(statsFilter, "p")

	q := `
		SELECT
			COUNT(*)::int,
			COUNT(*) FILTER (WHERE p.status = 'draft')::int,
			COUNT(*) FILTER (WHERE p.status = 'pending_approval')::int,
			COUNT(*) FILTER (WHERE p.status = 'scheduled')::int,
			COUNT(*) FILTER (WHERE p.status = 'publishing')::int,
			COUNT(*) FILTER (WHERE p.status = 'published')::int,
			COUNT(*) FILTER (WHERE p.status = 'failed')::int,
			COUNT(*) FILTER (WHERE p.status = 'canceled')::int,
			COUNT(*) FILTER (WHERE EXISTS (
				SELECT 1 FROM post_target_metrics m
				WHERE m.post_id = p.id AND m.workspace_id = p.workspace_id AND m.has_data = true
			))::int
		FROM posts p
		JOIN workspaces w ON w.id = p.workspace_id
		LEFT JOIN users u ON u.id = p.created_by_user_id
		LEFT JOIN missions mi ON mi.id = p.mission_id
	` + where

	var stats model.AdminPostStats
	if err := r.pool.QueryRow(ctx, q, args...).Scan(
		&stats.TotalPosts,
		&stats.DraftCount,
		&stats.PendingCount,
		&stats.ScheduledCount,
		&stats.PublishingCount,
		&stats.PublishedCount,
		&stats.FailedCount,
		&stats.CanceledCount,
		&stats.WithMetricsCount,
	); err != nil {
		return nil, err
	}
	return &stats, nil
}

func (r *PostRepository) ListForAdmin(ctx context.Context, f ListPostsAdminFilter) ([]model.AdminPostListItem, int, error) {
	if f.Limit <= 0 || f.Limit > 200 {
		f.Limit = 50
	}
	if f.Offset < 0 {
		f.Offset = 0
	}

	where, args := buildAdminPostsWhere(f, "p")

	countQ := `
		SELECT COUNT(DISTINCT p.id)
		FROM posts p
		JOIN workspaces w ON w.id = p.workspace_id
		LEFT JOIN users u ON u.id = p.created_by_user_id
		LEFT JOIN missions mi ON mi.id = p.mission_id
	` + where

	var total int
	if err := r.pool.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, f.Limit, f.Offset)
	limitIdx := len(args) - 1
	offsetIdx := len(args)

	listQ := fmt.Sprintf(`
		SELECT
			p.id, p.workspace_id, w.name,
			p.created_by_user_id, u.email, u.name,
			p.mission_id, mi.title,
			p.origin, p.status,
			LEFT(COALESCE(p.content->>'text', p.content->>'title', ''), 160),
			(SELECT COUNT(*)::int FROM post_targets pt WHERE pt.post_id = p.id AND pt.workspace_id = p.workspace_id),
			(SELECT COUNT(*)::int FROM post_media pm WHERE pm.post_id = p.id AND pm.workspace_id = p.workspace_id),
			COALESCE((
				SELECT string_agg(DISTINCT c.provider, ', ' ORDER BY c.provider)
				FROM post_targets pt
				JOIN channels c ON c.id = pt.channel_id AND c.workspace_id = pt.workspace_id
				WHERE pt.post_id = p.id AND pt.workspace_id = p.workspace_id
			), ''),
			COALESCE(SUM(m.views), 0)::int,
			COALESCE(SUM(m.likes), 0)::int,
			COALESCE(SUM(m.comments), 0)::int,
			COALESCE(SUM(m.shares), 0)::int,
			COALESCE(SUM(m.reach), 0)::int,
			COALESCE(SUM(m.clicks), 0)::int,
			COALESCE(SUM(m.clicks_unique), 0)::int,
			COALESCE(SUM(m.metrika_visits), 0)::int,
			COALESCE(SUM(m.metrika_goals), 0)::int,
			COALESCE(BOOL_OR(m.has_data), false),
			p.due_at, p.published_at, COALESCE(p.last_error, ''),
			p.created_at, p.updated_at
		FROM posts p
		JOIN workspaces w ON w.id = p.workspace_id
		LEFT JOIN users u ON u.id = p.created_by_user_id
		LEFT JOIN missions mi ON mi.id = p.mission_id
		LEFT JOIN post_target_metrics m ON m.post_id = p.id AND m.workspace_id = p.workspace_id
		%s
		GROUP BY p.id, w.name, u.email, u.name, mi.title
		ORDER BY p.updated_at DESC, p.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, limitIdx, offsetIdx)

	rows, err := r.pool.Query(ctx, listQ, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]model.AdminPostListItem, 0)
	for rows.Next() {
		item, err := scanAdminPostListRow(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, *item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *PostRepository) GetForAdmin(ctx context.Context, postID string) (*model.AdminPostDetail, error) {
	var detail model.AdminPostDetail
	var authorID, authorEmail, authorName, missionID, missionTitle *string
	var dueAt, publishedAt *time.Time

	err := r.pool.QueryRow(ctx, `
		SELECT
			p.id, p.workspace_id, w.name,
			p.created_by_user_id, u.email, u.name,
			p.mission_id, mi.title,
			p.origin, p.status,
			LEFT(COALESCE(p.content->>'text', p.content->>'title', ''), 160),
			(SELECT COUNT(*)::int FROM post_targets pt WHERE pt.post_id = p.id AND pt.workspace_id = p.workspace_id),
			(SELECT COUNT(*)::int FROM post_media pm WHERE pm.post_id = p.id AND pm.workspace_id = p.workspace_id),
			COALESCE((
				SELECT string_agg(DISTINCT c.provider, ', ' ORDER BY c.provider)
				FROM post_targets pt
				JOIN channels c ON c.id = pt.channel_id AND c.workspace_id = pt.workspace_id
				WHERE pt.post_id = p.id AND pt.workspace_id = p.workspace_id
			), ''),
			COALESCE(SUM(m.views), 0)::int,
			COALESCE(SUM(m.likes), 0)::int,
			COALESCE(SUM(m.comments), 0)::int,
			COALESCE(SUM(m.shares), 0)::int,
			COALESCE(SUM(m.reach), 0)::int,
			COALESCE(SUM(m.clicks), 0)::int,
			COALESCE(SUM(m.clicks_unique), 0)::int,
			COALESCE(SUM(m.metrika_visits), 0)::int,
			COALESCE(SUM(m.metrika_goals), 0)::int,
			COALESCE(BOOL_OR(m.has_data), false),
			p.due_at, p.published_at, COALESCE(p.last_error, ''),
			p.created_at, p.updated_at,
			p.content, p.settings
		FROM posts p
		JOIN workspaces w ON w.id = p.workspace_id
		LEFT JOIN users u ON u.id = p.created_by_user_id
		LEFT JOIN missions mi ON mi.id = p.mission_id
		LEFT JOIN post_target_metrics m ON m.post_id = p.id AND m.workspace_id = p.workspace_id
		WHERE p.id = $1
		GROUP BY p.id, w.name, u.email, u.name, mi.title, p.content, p.settings
	`, postID).Scan(
		&detail.ID, &detail.WorkspaceID, &detail.WorkspaceName,
		&authorID, &authorEmail, &authorName,
		&missionID, &missionTitle,
		&detail.Origin, &detail.Status,
		&detail.PreviewText,
		&detail.TargetsCount, &detail.MediaCount, &detail.ChannelsLabel,
		&detail.Views, &detail.Likes, &detail.Comments, &detail.Shares, &detail.Reach,
		&detail.Clicks, &detail.ClicksUnique, &detail.MetrikaVisits, &detail.MetrikaGoals,
		&detail.HasMetrics,
		&dueAt, &publishedAt, &detail.LastError,
		&detail.CreatedAt, &detail.UpdatedAt,
		&detail.Content, &detail.Settings,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	detail.AuthorUserID = authorID
	detail.AuthorEmail = authorEmail
	detail.AuthorName = authorName
	detail.MissionID = missionID
	detail.MissionTitle = missionTitle
	detail.DueAt = dueAt
	detail.PublishedAt = publishedAt

	targets, err := r.listAdminPostTargets(ctx, detail.WorkspaceID, postID)
	if err != nil {
		return nil, err
	}
	detail.Targets = targets

	media, err := r.listAdminPostMedia(ctx, detail.WorkspaceID, postID)
	if err != nil {
		return nil, err
	}
	detail.Media = media

	metrics, err := r.listAdminPostMetrics(ctx, detail.WorkspaceID, postID)
	if err != nil {
		return nil, err
	}
	detail.Metrics = metrics

	return &detail, nil
}

func (r *PostRepository) listAdminPostTargets(ctx context.Context, workspaceID, postID string) ([]model.AdminPostTargetItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			pt.id, pt.channel_id, COALESCE(c.name, ''), c.provider,
			pt.status, COALESCE(pt.provider_post_id, ''), COALESCE(pt.last_error, ''),
			pt.attempts, pt.published_at
		FROM post_targets pt
		JOIN channels c ON c.id = pt.channel_id AND c.workspace_id = pt.workspace_id
		WHERE pt.workspace_id = $1 AND pt.post_id = $2
		ORDER BY c.name ASC
	`, workspaceID, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]model.AdminPostTargetItem, 0)
	for rows.Next() {
		var item model.AdminPostTargetItem
		if err := rows.Scan(
			&item.ID, &item.ChannelID, &item.ChannelName, &item.Provider,
			&item.Status, &item.ProviderPostID, &item.LastError,
			&item.Attempts, &item.PublishedAt,
		); err != nil {
			return nil, err
		}
		item.ProviderLabel = model.ChannelProvider(item.Provider).Label()
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *PostRepository) listAdminPostMedia(ctx context.Context, workspaceID, postID string) ([]model.AdminPostMediaItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT pm.id, pm.file_id, pm.position, f.name, f.mime_type, f.size
		FROM post_media pm
		JOIN workspace_files f ON f.id = pm.file_id AND f.workspace_id = pm.workspace_id
		WHERE pm.workspace_id = $1 AND pm.post_id = $2
		ORDER BY pm.position ASC
	`, workspaceID, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]model.AdminPostMediaItem, 0)
	for rows.Next() {
		var item model.AdminPostMediaItem
		if err := rows.Scan(&item.ID, &item.FileID, &item.Position, &item.Name, &item.MimeType, &item.Size); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *PostRepository) listAdminPostMetrics(ctx context.Context, workspaceID, postID string) ([]model.PostTargetMetrics, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			m.target_id::text, m.post_id::text, m.channel_id::text, m.provider,
			COALESCE(c.name, ''),
			m.views, m.likes, m.comments, m.shares, m.reach,
			m.clicks, m.clicks_unique, m.metrika_visits, m.metrika_users, m.metrika_goals,
			m.subscriber_count, m.measurability, COALESCE(m.provider_note, ''),
			m.has_data, m.first_data_at, m.fetched_at, m.updated_at
		FROM post_target_metrics m
		LEFT JOIN channels c ON c.id = m.channel_id AND c.workspace_id = m.workspace_id
		WHERE m.workspace_id = $1 AND m.post_id = $2
		ORDER BY m.updated_at DESC
	`, workspaceID, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]model.PostTargetMetrics, 0)
	for rows.Next() {
		var item model.PostTargetMetrics
		if err := rows.Scan(
			&item.TargetID, &item.PostID, &item.ChannelID, &item.Provider, &item.ChannelName,
			&item.Views, &item.Likes, &item.Comments, &item.Shares, &item.Reach,
			&item.Clicks, &item.ClicksUnique, &item.MetrikaVisits, &item.MetrikaUsers, &item.MetrikaGoals,
			&item.SubscriberCount, &item.Measurability, &item.ProviderNote,
			&item.HasData, &item.FirstDataAt, &item.FetchedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		item.ProviderLabel = model.ChannelProvider(item.Provider).Label()
		items = append(items, item)
	}
	return items, rows.Err()
}

func buildAdminPostsWhere(f ListPostsAdminFilter, alias string) (string, []any) {
	args := make([]any, 0, 16)
	where := make([]string, 0, 12)

	if q := strings.TrimSpace(f.Query); q != "" {
		args = append(args, "%"+q+"%")
		idx := len(args)
		where = append(where, fmt.Sprintf(`(
			%s.content->>'text' ILIKE $%d OR
			%s.content->>'title' ILIKE $%d OR
			u.email ILIKE $%d OR
			u.name ILIKE $%d OR
			w.name ILIKE $%d
		)`, alias, idx, alias, idx, idx, idx, idx))
	}
	if ws := strings.TrimSpace(f.WorkspaceID); ws != "" {
		args = append(args, ws)
		where = append(where, fmt.Sprintf("%s.workspace_id = $%d", alias, len(args)))
	}
	if st := strings.TrimSpace(f.Status); st != "" {
		args = append(args, st)
		where = append(where, fmt.Sprintf("%s.status = $%d", alias, len(args)))
	}
	if origin := strings.TrimSpace(f.Origin); origin != "" {
		args = append(args, origin)
		where = append(where, fmt.Sprintf("%s.origin = $%d", alias, len(args)))
	}
	if uid := strings.TrimSpace(f.CreatedByUser); uid != "" {
		args = append(args, uid)
		where = append(where, fmt.Sprintf("%s.created_by_user_id = $%d", alias, len(args)))
	}
	if mid := strings.TrimSpace(f.MissionID); mid != "" {
		args = append(args, mid)
		where = append(where, fmt.Sprintf("%s.mission_id = $%d", alias, len(args)))
	}
	if ch := strings.TrimSpace(f.ChannelID); ch != "" {
		args = append(args, ch)
		where = append(where, fmt.Sprintf(`EXISTS (
			SELECT 1 FROM post_targets pt
			WHERE pt.post_id = %s.id AND pt.workspace_id = %s.workspace_id AND pt.channel_id = $%d
		)`, alias, alias, len(args)))
	}
	if prov := strings.TrimSpace(f.Provider); prov != "" {
		args = append(args, prov)
		where = append(where, fmt.Sprintf(`EXISTS (
			SELECT 1 FROM post_targets pt
			JOIN channels c ON c.id = pt.channel_id AND c.workspace_id = pt.workspace_id
			WHERE pt.post_id = %s.id AND pt.workspace_id = %s.workspace_id AND c.provider = $%d
		)`, alias, alias, len(args)))
	}
	if f.CreatedFrom != nil {
		args = append(args, *f.CreatedFrom)
		where = append(where, fmt.Sprintf("%s.created_at >= $%d", alias, len(args)))
	}
	if f.CreatedTo != nil {
		args = append(args, *f.CreatedTo)
		where = append(where, fmt.Sprintf("%s.created_at <= $%d", alias, len(args)))
	}
	if f.PublishedFrom != nil {
		args = append(args, *f.PublishedFrom)
		where = append(where, fmt.Sprintf("%s.published_at >= $%d", alias, len(args)))
	}
	if f.PublishedTo != nil {
		args = append(args, *f.PublishedTo)
		where = append(where, fmt.Sprintf("%s.published_at <= $%d", alias, len(args)))
	}
	if f.HasMetrics != nil {
		if *f.HasMetrics {
			where = append(where, fmt.Sprintf(`EXISTS (
				SELECT 1 FROM post_target_metrics m
				WHERE m.post_id = %s.id AND m.workspace_id = %s.workspace_id AND m.has_data = true
			)`, alias, alias))
		} else {
			where = append(where, fmt.Sprintf(`NOT EXISTS (
				SELECT 1 FROM post_target_metrics m
				WHERE m.post_id = %s.id AND m.workspace_id = %s.workspace_id AND m.has_data = true
			)`, alias, alias))
		}
	}

	whereSQL := ""
	if len(where) > 0 {
		whereSQL = "WHERE " + strings.Join(where, " AND ")
	}
	return whereSQL, args
}

func scanAdminPostListRow(row pgx.Row) (*model.AdminPostListItem, error) {
	var item model.AdminPostListItem
	var authorID, authorEmail, authorName, missionID, missionTitle *string
	var dueAt, publishedAt *time.Time

	if err := row.Scan(
		&item.ID, &item.WorkspaceID, &item.WorkspaceName,
		&authorID, &authorEmail, &authorName,
		&missionID, &missionTitle,
		&item.Origin, &item.Status,
		&item.PreviewText,
		&item.TargetsCount, &item.MediaCount, &item.ChannelsLabel,
		&item.Views, &item.Likes, &item.Comments, &item.Shares, &item.Reach,
		&item.Clicks, &item.ClicksUnique, &item.MetrikaVisits, &item.MetrikaGoals,
		&item.HasMetrics,
		&dueAt, &publishedAt, &item.LastError,
		&item.CreatedAt, &item.UpdatedAt,
	); err != nil {
		return nil, err
	}

	item.AuthorUserID = authorID
	item.AuthorEmail = authorEmail
	item.AuthorName = authorName
	item.MissionID = missionID
	item.MissionTitle = missionTitle
	item.DueAt = dueAt
	item.PublishedAt = publishedAt
	return &item, nil
}
