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
	quota     *QuotaService
}

func NewAnalyticsService(
	analytics *repository.AnalyticsRepository,
	posts *repository.PostRepository,
	metrika *MetrikaConnectionService,
	wsSvc *WorkspaceService,
	quota *QuotaService,
) *AnalyticsService {
	return &AnalyticsService{
		analytics: analytics,
		posts:     posts,
		metrika:   metrika,
		wsSvc:     wsSvc,
		quota:     quota,
	}
}

func (s *AnalyticsService) ensureAnalyticsAccess(ctx context.Context, workspaceID string) error {
	if s.quota == nil {
		return nil
	}
	return s.quota.CheckAnalyticsAccess(ctx, workspaceID)
}

func (s *AnalyticsService) Overview(ctx context.Context, userID string, r *http.Request, from, to time.Time) (*model.AnalyticsOverview, []model.AnalyticsDailyPoint, []model.AnalyticsProviderBreakdown, error) {
	ws, err := s.activeWorkspace(ctx, userID, r)
	if err != nil {
		return nil, nil, nil, err
	}
	if err := s.ensureAnalyticsAccess(ctx, ws.ID); err != nil {
		return nil, nil, nil, err
	}
	overview, err := s.analytics.Overview(ctx, ws.ID, from, to)
	if err != nil {
		return nil, nil, nil, err
	}
	if s.metrika != nil {
		status, err := s.metrika.Status(ctx, userID, r)
		if err == nil && status != nil {
			overview.MetrikaConnected = len(status.Counters) > 0
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
	if err := s.ensureAnalyticsAccess(ctx, ws.ID); err != nil {
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
	if err := s.ensureAnalyticsAccess(ctx, ws.ID); err != nil {
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
	for i := range targets {
		byCounter, err := s.analytics.ListCounterMetricsByTarget(ctx, targets[i].TargetID)
		if err == nil && len(byCounter) > 0 {
			targets[i].MetrikaByCounter = byCounter
		}
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

func (s *AnalyticsService) MetrikaUTMBindings(
	ctx context.Context,
	userID string,
	r *http.Request,
	from, to time.Time,
) ([]model.MetrikaUTMBinding, error) {
	ws, err := s.activeWorkspace(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if err := s.ensureAnalyticsAccess(ctx, ws.ID); err != nil {
		return nil, err
	}
	rows, err := s.analytics.ListMetrikaUTMMetricRows(ctx, ws.ID, from, to)
	if err != nil {
		return nil, err
	}
	postUTM := make(map[string]struct{ source, medium string })
	if s.posts != nil {
		for _, row := range rows {
			key := row.PostID + "|" + row.TargetID
			if _, ok := postUTM[key]; ok {
				continue
			}
			post, err := s.posts.Get(ctx, ws.ID, row.PostID)
			if err != nil {
				continue
			}
			source, medium := utmFromPostTarget(post, row.TargetID)
			postUTM[key] = struct{ source, medium string }{source, medium}
		}
	}

	type bindingKey struct {
		postID, targetID, campaign string
	}
	grouped := make(map[bindingKey]*model.MetrikaUTMBinding)
	order := make([]bindingKey, 0)
	for _, row := range rows {
		key := bindingKey{postID: row.PostID, targetID: row.TargetID, campaign: row.UTMCampaign}
		item, ok := grouped[key]
		if !ok {
			preview := row.UTMCampaign
			if post, err := s.posts.Get(ctx, ws.ID, row.PostID); err == nil {
				preview = postPreviewText(post)
			}
			utmKey := row.PostID + "|" + row.TargetID
			utmMeta := postUTM[utmKey]
			item = &model.MetrikaUTMBinding{
				PostID:      row.PostID,
				PostPreview: preview,
				TargetID:    row.TargetID,
				ChannelName: row.ChannelName,
				PublishedAt: row.PublishedAt,
				UTMCampaign: row.UTMCampaign,
				UTMSource:   utmMeta.source,
				UTMMedium:   utmMeta.medium,
				Counters:    []model.MetrikaCounterStats{},
			}
			grouped[key] = item
			order = append(order, key)
		}
		item.Counters = append(item.Counters, model.MetrikaCounterStats{
			CounterID: row.CounterID,
			Label:     row.CounterLabel,
			Visits:    row.Visits,
			Users:     row.Users,
			Goals:     row.Goals,
		})
	}
	out := make([]model.MetrikaUTMBinding, 0, len(order))
	for _, key := range order {
		if item := grouped[key]; item != nil {
			out = append(out, *item)
		}
	}
	return out, nil
}

func (s *AnalyticsService) EnrichMetrikaStatusForUser(
	ctx context.Context,
	userID string,
	r *http.Request,
	status *model.WorkspaceMetrikaStatus,
	from, to time.Time,
) error {
	ws, err := s.activeWorkspace(ctx, userID, r)
	if err != nil {
		return err
	}
	return s.EnrichMetrikaStatus(ctx, ws.ID, status, from, to)
}

func (s *AnalyticsService) DisconnectMetrikaCounter(
	ctx context.Context,
	userID string,
	r *http.Request,
	counterID int64,
) error {
	ws, err := s.activeWorkspace(ctx, userID, r)
	if err != nil {
		return err
	}
	if err := s.ensureAnalyticsAccess(ctx, ws.ID); err != nil {
		return err
	}
	if err := s.metrika.DisconnectCounter(ctx, userID, r, counterID); err != nil {
		return err
	}
	return s.analytics.DeleteCounterMetricsForWorkspaceCounter(ctx, ws.ID, counterID)
}

func (s *AnalyticsService) EnrichMetrikaStatus(
	ctx context.Context,
	workspaceID string,
	status *model.WorkspaceMetrikaStatus,
	from, to time.Time,
) error {
	if status == nil {
		return nil
	}
	stats, err := s.analytics.CounterPeriodStats(ctx, workspaceID, from, to)
	if err != nil {
		return err
	}
	for i := range status.Counters {
		if item, ok := stats[status.Counters[i].CounterID]; ok {
			status.Counters[i].Visits = item.Visits
			status.Counters[i].Goals = item.Goals
		}
	}
	return nil
}

func utmFromPostTarget(post *model.Post, targetID string) (source, medium string) {
	if post == nil {
		return "", ""
	}
	for _, t := range post.Targets {
		if t.ID != targetID {
			continue
		}
		settings, err := DecodePostTargetSettings(t.Settings)
		if err == nil && settings.Settings != nil && settings.Settings.UTM != nil {
			return strings.TrimSpace(settings.Settings.UTM.Source), strings.TrimSpace(settings.Settings.UTM.Medium)
		}
	}
	if post.Settings.UTM != nil {
		return strings.TrimSpace(post.Settings.UTM.Source), strings.TrimSpace(post.Settings.UTM.Medium)
	}
	return "", ""
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
