package service

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

type AnalyticsService struct {
	analytics *repository.AnalyticsRepository
	posts     *repository.PostRepository
	metrika   *MetrikaConnectionService
	wsSvc     *WorkspaceService
}

func NewAnalyticsService(
	analytics *repository.AnalyticsRepository,
	posts *repository.PostRepository,
	metrika *MetrikaConnectionService,
	wsSvc *WorkspaceService,
) *AnalyticsService {
	return &AnalyticsService{
		analytics: analytics,
		posts:     posts,
		metrika:   metrika,
		wsSvc:     wsSvc,
	}
}

func (s *AnalyticsService) Overview(ctx context.Context, userID string, r *http.Request, from, to time.Time) (*model.AnalyticsOverview, []model.AnalyticsDailyPoint, []model.AnalyticsProviderBreakdown, error) {
	ws, err := s.activeWorkspace(ctx, userID, r)
	if err != nil {
		return nil, nil, nil, err
	}
	overview, err := s.analytics.Overview(ctx, ws.ID, from, to)
	if err != nil {
		return nil, nil, nil, err
	}
	if s.metrika != nil {
		status, err := s.metrika.Status(ctx, userID, r)
		if err == nil && status != nil {
			overview.MetrikaConnected = status.Connected && status.Enabled
		}
	}
	series, err := s.analytics.DailySeries(ctx, ws.ID, from, to)
	if err != nil {
		return nil, nil, nil, err
	}
	providers, err := s.analytics.ProviderBreakdown(ctx, ws.ID, from, to)
	if err != nil {
		return nil, nil, nil, err
	}
	return overview, series, providers, nil
}

func (s *AnalyticsService) ListPosts(
	ctx context.Context,
	userID string,
	r *http.Request,
	from, to time.Time,
	limit, offset int,
) ([]model.AnalyticsPostSummary, int, error) {
	ws, err := s.activeWorkspace(ctx, userID, r)
	if err != nil {
		return nil, 0, err
	}
	return s.analytics.ListPostSummaries(ctx, ws.ID, from, to, limit, offset)
}

func (s *AnalyticsService) PostAnalytics(ctx context.Context, userID string, r *http.Request, postID string) (*model.PostAnalyticsResponse, error) {
	ws, err := s.activeWorkspace(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleViewer); err != nil {
		return nil, err
	}
	post, err := s.posts.Get(ctx, ws.ID, postID)
	if err != nil {
		return nil, err
	}
	if post.Status != model.PostStatusPublished {
		return nil, fmt.Errorf("статистика доступна только для опубликованных записей")
	}

	targets, err := s.analytics.ListMetricsByPost(ctx, ws.ID, postID)
	if err != nil {
		return nil, err
	}
	timeline, err := s.analytics.ListSnapshotsByPost(ctx, ws.ID, postID, 90)
	if err != nil {
		return nil, err
	}

	resp := &model.PostAnalyticsResponse{
		PostID:      post.ID,
		Status:      string(post.Status),
		Preview:     postPreviewText(post),
		PublishedAt: post.PublishedAt,
		Targets:     targets,
		Timeline:    timeline,
	}
	resp.Totals = sumTargetMetrics(targets)
	resp.HasData = resp.Totals.HasData
	resp.Visible = resp.HasData
	if !resp.Visible {
		resp.Explanation = "Статистика набирается после публикации. Первые просмотры, клики или переходы появятся в течение нескольких часов — данные обновляются автоматически."
	} else {
		resp.Explanation = "Показатели обновляются автоматически каждые 15 минут. Переходы считаются через короткие ссылки Postilka; визиты на сайте — через Яндекс Метрику, если она подключена."
	}
	return resp, nil
}

func (s *AnalyticsService) activeWorkspace(ctx context.Context, userID string, r *http.Request) (*model.Workspace, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if ws == nil {
		return nil, ErrWorkspaceNotFound
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleViewer); err != nil {
		return nil, err
	}
	return ws, nil
}

func sumTargetMetrics(targets []model.PostTargetMetrics) model.PostTargetMetrics {
	var total model.PostTargetMetrics
	for _, item := range targets {
		total.Views += item.Views
		total.Likes += item.Likes
		total.Comments += item.Comments
		total.Shares += item.Shares
		total.Reach += item.Reach
		total.Clicks += item.Clicks
		total.ClicksUnique += item.ClicksUnique
		total.MetrikaVisits += item.MetrikaVisits
		total.MetrikaUsers += item.MetrikaUsers
		total.MetrikaGoals += item.MetrikaGoals
		if item.HasData {
			total.HasData = true
		}
	}
	return total
}

func postPreviewText(post *model.Post) string {
	if post == nil {
		return ""
	}
	if title := strings.TrimSpace(post.Content.Title); title != "" {
		return title
	}
	text := strings.TrimSpace(post.Content.Text)
	if len([]rune(text)) > 120 {
		return string([]rune(text)[:120]) + "…"
	}
	return text
}
