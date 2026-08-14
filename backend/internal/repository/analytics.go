package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/postilka/postilka/internal/model"
)

type AnalyticsRepository struct {
	pool *pgxpool.Pool
}

func NewAnalyticsRepository(pool *pgxpool.Pool) *AnalyticsRepository {
	return &AnalyticsRepository{pool: pool}
}

type MetricsUpsertInput struct {
	TargetID        string
	WorkspaceID     string
	PostID          string
	ChannelID       string
	Provider        string
	Views           int
	Likes           int
	Comments        int
	Shares          int
	Reach           int
	Clicks          int
	ClicksUnique    int
	MetrikaVisits   int
	MetrikaUsers    int
	MetrikaGoals    int
	SubscriberCount *int
	Measurability   string
	ProviderNote    string
	FetchedAt       time.Time
}

func (r *AnalyticsRepository) UpsertMetrics(ctx context.Context, input MetricsUpsertInput) error {
	hasData := input.Views > 0 || input.Likes > 0 || input.Comments > 0 || input.Shares > 0 ||
		input.Reach > 0 || input.Clicks > 0 || input.MetrikaVisits > 0 || input.MetrikaGoals > 0

	_, err := r.pool.Exec(ctx, `
		INSERT INTO post_target_metrics (
			target_id, workspace_id, post_id, channel_id, provider,
			views, likes, comments, shares, reach, clicks, clicks_unique,
			metrika_visits, metrika_users, metrika_goals, subscriber_count,
			measurability, provider_note, has_data, first_data_at, fetched_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10, $11, $12,
			$13, $14, $15, $16,
			$17, NULLIF($18, ''), $19,
			CASE WHEN $19 THEN $20 ELSE NULL END,
			$20, NOW()
		)
		ON CONFLICT (target_id) DO UPDATE SET
			views = EXCLUDED.views,
			likes = EXCLUDED.likes,
			comments = EXCLUDED.comments,
			shares = EXCLUDED.shares,
			reach = EXCLUDED.reach,
			clicks = EXCLUDED.clicks,
			clicks_unique = EXCLUDED.clicks_unique,
			metrika_visits = EXCLUDED.metrika_visits,
			metrika_users = EXCLUDED.metrika_users,
			metrika_goals = EXCLUDED.metrika_goals,
			subscriber_count = EXCLUDED.subscriber_count,
			measurability = EXCLUDED.measurability,
			provider_note = EXCLUDED.provider_note,
			has_data = EXCLUDED.has_data OR post_target_metrics.has_data,
			first_data_at = COALESCE(post_target_metrics.first_data_at, EXCLUDED.first_data_at),
			fetched_at = EXCLUDED.fetched_at,
			updated_at = NOW()
	`, input.TargetID, input.WorkspaceID, input.PostID, input.ChannelID, input.Provider,
		input.Views, input.Likes, input.Comments, input.Shares, input.Reach, input.Clicks, input.ClicksUnique,
		input.MetrikaVisits, input.MetrikaUsers, input.MetrikaGoals, input.SubscriberCount,
		input.Measurability, input.ProviderNote, hasData, input.FetchedAt)
	return err
}

func (r *AnalyticsRepository) InsertSnapshot(ctx context.Context, input MetricsUpsertInput) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO post_target_metrics_snapshots (
			target_id, workspace_id, post_id, snapshot_at,
			views, likes, comments, shares, reach, clicks, metrika_visits, metrika_goals
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`, input.TargetID, input.WorkspaceID, input.PostID, input.FetchedAt,
		input.Views, input.Likes, input.Comments, input.Shares, input.Reach, input.Clicks,
		input.MetrikaVisits, input.MetrikaGoals)
	return err
}

type MetricsPollTarget struct {
	TargetID       string
	PostID         string
	WorkspaceID    string
	ChannelID      string
	Provider       string
	ProviderPostID string
	PublishedAt    *time.Time
	ChannelChatID  string
	ChannelName    string
}

func (r *AnalyticsRepository) ListTargetsForPolling(ctx context.Context, limit int) ([]MetricsPollTarget, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := r.pool.Query(ctx, `
		SELECT
			pt.id::text,
			pt.post_id::text,
			pt.workspace_id::text,
			pt.channel_id::text,
			c.provider,
			COALESCE(pt.provider_post_id, ''),
			pt.published_at,
			c.chat_id,
			c.name
		FROM post_targets pt
		JOIN channels c ON c.id = pt.channel_id AND c.workspace_id = pt.workspace_id
		WHERE pt.status = 'published'
		  AND pt.published_at IS NOT NULL
		  AND pt.published_at > NOW() - INTERVAL '90 days'
		ORDER BY COALESCE(
			(SELECT m.fetched_at FROM post_target_metrics m WHERE m.target_id = pt.id),
			TIMESTAMP '1970-01-01'
		) ASC, pt.published_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]MetricsPollTarget, 0)
	for rows.Next() {
		var item MetricsPollTarget
		if err := rows.Scan(
			&item.TargetID, &item.PostID, &item.WorkspaceID, &item.ChannelID,
			&item.Provider, &item.ProviderPostID, &item.PublishedAt, &item.ChannelChatID, &item.ChannelName,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *AnalyticsRepository) ListMetricsByPost(ctx context.Context, workspaceID, postID string) ([]model.PostTargetMetrics, error) {
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
	return scanTargetMetricsRows(rows)
}

func (r *AnalyticsRepository) ListSnapshotsByPost(ctx context.Context, workspaceID, postID string, limit int) ([]model.PostTargetMetricsSnapshot, error) {
	if limit <= 0 {
		limit = 60
	}
	rows, err := r.pool.Query(ctx, `
		SELECT snapshot_at,
		       SUM(views)::int, SUM(likes)::int, SUM(comments)::int, SUM(shares)::int,
		       SUM(reach)::int, SUM(clicks)::int, SUM(metrika_visits)::int, SUM(metrika_goals)::int
		FROM post_target_metrics_snapshots
		WHERE workspace_id = $1 AND post_id = $2
		GROUP BY snapshot_at
		ORDER BY snapshot_at ASC
		LIMIT $3
	`, workspaceID, postID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]model.PostTargetMetricsSnapshot, 0)
	for rows.Next() {
		var item model.PostTargetMetricsSnapshot
		if err := rows.Scan(
			&item.SnapshotAt,
			&item.Views, &item.Likes, &item.Comments, &item.Shares,
			&item.Reach, &item.Clicks, &item.MetrikaVisits, &item.MetrikaGoals,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *AnalyticsRepository) Overview(ctx context.Context, workspaceID string, from, to time.Time) (*model.AnalyticsOverview, error) {
	var overview model.AnalyticsOverview
	overview.From = from.Format("2006-01-02")
	overview.To = to.Format("2006-01-02")

	err := r.pool.QueryRow(ctx, `
		SELECT
			COUNT(DISTINCT p.id)::int,
			COUNT(DISTINCT p.id) FILTER (WHERE EXISTS (
				SELECT 1 FROM post_target_metrics m
				WHERE m.post_id = p.id AND m.workspace_id = p.workspace_id AND m.has_data = true
			))::int,
			COALESCE(SUM(m.views), 0)::int,
			COALESCE(SUM(m.reach), 0)::int,
			COALESCE(SUM(m.likes + m.comments + m.shares), 0)::int,
			COALESCE(SUM(m.clicks), 0)::int,
			COALESCE(SUM(m.clicks_unique), 0)::int,
			COALESCE(SUM(m.metrika_visits), 0)::int,
			COALESCE(SUM(m.metrika_goals), 0)::int
		FROM posts p
		LEFT JOIN post_target_metrics m ON m.post_id = p.id AND m.workspace_id = p.workspace_id
		WHERE p.workspace_id = $1
		  AND p.status = 'published'
		  AND p.published_at >= $2
		  AND p.published_at < $3
	`, workspaceID, from, to.Add(24*time.Hour)).Scan(
		&overview.PublishedPosts,
		&overview.PostsWithData,
		&overview.TotalViews,
		&overview.TotalReach,
		&overview.TotalEngagement,
		&overview.TotalClicks,
		&overview.TotalClicksUnique,
		&overview.MetrikaVisits,
		&overview.MetrikaGoals,
	)
	return &overview, err
}

func (r *AnalyticsRepository) DailySeries(ctx context.Context, workspaceID string, from, to time.Time) ([]model.AnalyticsDailyPoint, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			DATE(s.snapshot_at) AS day,
			SUM(s.views)::int,
			SUM(s.clicks)::int,
			SUM(s.likes + s.comments + s.shares)::int,
			SUM(s.metrika_visits)::int
		FROM post_target_metrics_snapshots s
		WHERE s.workspace_id = $1
		  AND s.snapshot_at >= $2
		  AND s.snapshot_at < $3
		GROUP BY day
		ORDER BY day ASC
	`, workspaceID, from, to.Add(24*time.Hour))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]model.AnalyticsDailyPoint, 0)
	for rows.Next() {
		var day time.Time
		var point model.AnalyticsDailyPoint
		if err := rows.Scan(&day, &point.Views, &point.Clicks, &point.Engagement, &point.MetrikaVisits); err != nil {
			return nil, err
		}
		point.Date = day.Format("2006-01-02")
		items = append(items, point)
	}
	return items, rows.Err()
}

func (r *AnalyticsRepository) ProviderBreakdown(ctx context.Context, workspaceID string, from, to time.Time) ([]model.AnalyticsProviderBreakdown, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			m.provider,
			COUNT(DISTINCT m.post_id)::int,
			COALESCE(SUM(m.views), 0)::int,
			COALESCE(SUM(m.clicks), 0)::int,
			COALESCE(SUM(m.likes + m.comments + m.shares), 0)::int
		FROM post_target_metrics m
		JOIN posts p ON p.id = m.post_id AND p.workspace_id = m.workspace_id
		WHERE m.workspace_id = $1
		  AND p.status = 'published'
		  AND p.published_at >= $2
		  AND p.published_at < $3
		GROUP BY m.provider
		ORDER BY SUM(m.views) DESC, m.provider ASC
	`, workspaceID, from, to.Add(24*time.Hour))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]model.AnalyticsProviderBreakdown, 0)
	for rows.Next() {
		var item model.AnalyticsProviderBreakdown
		if err := rows.Scan(&item.Provider, &item.Posts, &item.Views, &item.Clicks, &item.Engagement); err != nil {
			return nil, err
		}
		item.ProviderLabel = model.ChannelProvider(item.Provider).Label()
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *AnalyticsRepository) ListPostSummaries(
	ctx context.Context,
	workspaceID string,
	from, to time.Time,
	limit, offset int,
) ([]model.AnalyticsPostSummary, int, error) {
	if limit <= 0 {
		limit = 25
	}
	var total int
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)::int
		FROM posts p
		WHERE p.workspace_id = $1
		  AND p.status = 'published'
		  AND p.published_at >= $2
		  AND p.published_at < $3
	`, workspaceID, from, to.Add(24*time.Hour)).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.pool.Query(ctx, `
		SELECT
			p.id::text,
			LEFT(COALESCE(p.content->>'text', p.content->>'title', ''), 120),
			p.published_at,
			COALESCE(BOOL_OR(m.has_data), false),
			COALESCE(SUM(m.views), 0)::int,
			COALESCE(SUM(m.clicks), 0)::int,
			COALESCE(SUM(m.likes + m.comments + m.shares), 0)::int,
			COUNT(DISTINCT pt.id)::int
		FROM posts p
		JOIN post_targets pt ON pt.post_id = p.id AND pt.workspace_id = p.workspace_id AND pt.status = 'published'
		LEFT JOIN post_target_metrics m ON m.post_id = p.id AND m.workspace_id = p.workspace_id
		WHERE p.workspace_id = $1
		  AND p.status = 'published'
		  AND p.published_at >= $2
		  AND p.published_at < $3
		GROUP BY p.id, p.content, p.published_at
		ORDER BY p.published_at DESC
		LIMIT $4 OFFSET $5
	`, workspaceID, from, to.Add(24*time.Hour), limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]model.AnalyticsPostSummary, 0)
	for rows.Next() {
		var item model.AnalyticsPostSummary
		if err := rows.Scan(
			&item.PostID, &item.Preview, &item.PublishedAt, &item.HasData,
			&item.Views, &item.Clicks, &item.Engagement, &item.ChannelsCount,
		); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func scanTargetMetricsRows(rows pgx.Rows) ([]model.PostTargetMetrics, error) {
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

func (r *AnalyticsRepository) GetMetricsByTarget(ctx context.Context, targetID string) (*model.PostTargetMetrics, error) {
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
		WHERE m.target_id = $1
	`, targetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items, err := scanTargetMetricsRows(rows)
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, ErrNotFound
	}
	return &items[0], nil
}

func (r *AnalyticsRepository) PostHasVisibleMetrics(ctx context.Context, workspaceID, postID string) (bool, error) {
	var visible bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM post_target_metrics
			WHERE workspace_id = $1 AND post_id = $2 AND has_data = true
		)
	`, workspaceID, postID).Scan(&visible)
	return visible, err
}
