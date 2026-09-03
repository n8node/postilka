package service

import (
	"testing"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
)

func TestAssessLoadTrendStable(t *testing.T) {
	history := []model.LoadDailyAggregate{
		{Day: time.Now(), AvgPublishBacklog: 0, MaxPublishBacklog: 0, AvgGenJobsActive: 1, AvgDBPoolUtil: 0.2},
		{Day: time.Now(), AvgPublishBacklog: 0, MaxPublishBacklog: 1, AvgGenJobsActive: 0, AvgDBPoolUtil: 0.15},
		{Day: time.Now(), AvgPublishBacklog: 1, MaxPublishBacklog: 2, AvgGenJobsActive: 1, AvgDBPoolUtil: 0.25},
		{Day: time.Now(), AvgPublishBacklog: 0, MaxPublishBacklog: 0, AvgGenJobsActive: 2, AvgDBPoolUtil: 0.18},
	}
	out := assessLoadTrend(history, 6)
	if out.Level != model.LoadTrendStable {
		t.Fatalf("expected stable, got %s", out.Level)
	}
}

func TestAssessLoadTrendGrowingBacklog(t *testing.T) {
	older := []model.LoadDailyAggregate{
		{AvgPublishBacklog: 1, MaxPublishBacklog: 2, AvgGenJobsActive: 1, AvgDBPoolUtil: 0.3},
		{AvgPublishBacklog: 2, MaxPublishBacklog: 3, AvgGenJobsActive: 1, AvgDBPoolUtil: 0.35},
		{AvgPublishBacklog: 1, MaxPublishBacklog: 2, AvgGenJobsActive: 2, AvgDBPoolUtil: 0.32},
	}
	recent := []model.LoadDailyAggregate{
		{AvgPublishBacklog: 8, MaxPublishBacklog: 25, AvgGenJobsActive: 2, AvgDBPoolUtil: 0.4},
		{AvgPublishBacklog: 10, MaxPublishBacklog: 30, AvgGenJobsActive: 3, AvgDBPoolUtil: 0.45},
		{AvgPublishBacklog: 9, MaxPublishBacklog: 22, AvgGenJobsActive: 2, AvgDBPoolUtil: 0.42},
	}
	history := append(older, recent...)
	out := assessLoadTrend(history, 6)
	if out.Level != model.LoadTrendGrowing {
		t.Fatalf("expected growing, got %s (%s)", out.Level, out.Summary)
	}
	if out.RAMAdvice == "" {
		t.Fatal("expected RAM advice")
	}
}

func TestRuntimeTuningRecommendations(t *testing.T) {
	rec6 := runtimeTuningRecommendations(6)
	if rec6.PublishConcurrencyMax != 5 || rec6.PublishIntervalSec != 30 {
		t.Fatalf("unexpected 6GB rec: %+v", rec6)
	}
	rec16 := runtimeTuningRecommendations(16)
	if rec16.PublishConcurrencyMin != 10 || rec16.PublishIntervalSec != 10 {
		t.Fatalf("unexpected 16GB rec: %+v", rec16)
	}
	rec32 := runtimeTuningRecommendations(32)
	if rec32.PublishConcurrencyMin != 25 || rec32.PublishIntervalSec != 5 {
		t.Fatalf("unexpected 32GB rec: %+v", rec32)
	}
}

func TestResolveRuntimeTuning(t *testing.T) {
	cfg := &config.Config{
		WorkerPublishConcurrency: 3,
		WorkerPublishIntervalSec: 30,
		DatabaseMaxConns:         10,
	}
	effective := resolveRuntimeTuning(cfg, model.LoadMonitorSettings{
		RuntimeTuning: model.RuntimeTuningSettings{
			PublishConcurrency: 25,
			PublishIntervalSec: 5,
		},
	}, 10)
	if effective.PublishConcurrency != 25 || effective.PublishIntervalSec != 5 {
		t.Fatalf("admin override failed: %+v", effective)
	}
	if effective.EstimatedPostsPerHour != 25*(3600/5) {
		t.Fatalf("expected 18000 posts/h, got %d", effective.EstimatedPostsPerHour)
	}
}

func TestRecommendRAMTarget(t *testing.T) {
	if got := recommendRAMTarget(6, model.LoadTrendGrowing); got != 16 {
		t.Fatalf("expected 16, got %d", got)
	}
	if got := recommendRAMTarget(16, model.LoadTrendWatch); got != 32 {
		t.Fatalf("expected 32, got %d", got)
	}
}
