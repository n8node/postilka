package service

import (
	"fmt"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
)

const (
	runtimeTuningMinConcurrency = 1
	runtimeTuningMaxConcurrency = 100
	runtimeTuningMinIntervalSec = 1
	runtimeTuningMaxIntervalSec = 300
	runtimeTuningMinDBConns     = 5
	runtimeTuningMaxDBConns     = 200
)

func defaultRuntimeTuningEnv(cfg *config.Config) model.RuntimeTuningEffective {
	out := model.RuntimeTuningEffective{
		PublishConcurrency: 3,
		PublishIntervalSec: 30,
		DatabaseMaxConns:   10,
	}
	if cfg == nil {
		return out
	}
	if cfg.WorkerPublishConcurrency > 0 {
		out.PublishConcurrency = cfg.WorkerPublishConcurrency
	}
	if cfg.WorkerPublishIntervalSec > 0 {
		out.PublishIntervalSec = cfg.WorkerPublishIntervalSec
	}
	if cfg.DatabaseMaxConns > 0 {
		out.DatabaseMaxConns = cfg.DatabaseMaxConns
	}
	out.EstimatedPostsPerHour = estimatePostsPerHour(out.PublishConcurrency, out.PublishIntervalSec)
	return out
}

func resolveRuntimeTuning(cfg *config.Config, settings model.LoadMonitorSettings, poolMaxConns int) model.RuntimeTuningEffective {
	out := defaultRuntimeTuningEnv(cfg)
	t := settings.RuntimeTuning
	if t.PublishConcurrency > 0 {
		out.PublishConcurrency = t.PublishConcurrency
	}
	if t.PublishIntervalSec > 0 {
		out.PublishIntervalSec = t.PublishIntervalSec
	}
	if t.DatabaseMaxConns > 0 {
		out.DatabaseMaxConns = t.DatabaseMaxConns
	}
	if poolMaxConns > 0 {
		out.PoolMaxConnsCurrent = poolMaxConns
		out.DatabaseMaxConnsRequiresRestart = out.DatabaseMaxConns != poolMaxConns
	}
	out.EstimatedPostsPerHour = estimatePostsPerHour(out.PublishConcurrency, out.PublishIntervalSec)
	return out
}

func normalizeRuntimeTuningSettings(t *model.RuntimeTuningSettings) {
	if t == nil {
		return
	}
	if t.PublishConcurrency < 0 {
		t.PublishConcurrency = 0
	}
	if t.PublishConcurrency > runtimeTuningMaxConcurrency {
		t.PublishConcurrency = runtimeTuningMaxConcurrency
	}
	if t.PublishIntervalSec < 0 {
		t.PublishIntervalSec = 0
	}
	if t.PublishIntervalSec > runtimeTuningMaxIntervalSec {
		t.PublishIntervalSec = runtimeTuningMaxIntervalSec
	}
	if t.PublishIntervalSec > 0 && t.PublishIntervalSec < runtimeTuningMinIntervalSec {
		t.PublishIntervalSec = runtimeTuningMinIntervalSec
	}
	if t.DatabaseMaxConns < 0 {
		t.DatabaseMaxConns = 0
	}
	if t.DatabaseMaxConns > runtimeTuningMaxDBConns {
		t.DatabaseMaxConns = runtimeTuningMaxDBConns
	}
	if t.DatabaseMaxConns > 0 && t.DatabaseMaxConns < runtimeTuningMinDBConns {
		t.DatabaseMaxConns = runtimeTuningMinDBConns
	}
}

func runtimeTuningRecommendations(ramGB int) model.RuntimeTuningRecommendations {
	if ramGB < 1 {
		ramGB = 6
	}
	switch {
	case ramGB <= 8:
		return model.RuntimeTuningRecommendations{
			PublishConcurrencyMin: 3,
			PublishConcurrencyMax: 5,
			PublishIntervalSec:    30,
			DatabaseMaxConnsMin:   10,
			DatabaseMaxConnsMax:   10,
			Summary:               fmt.Sprintf("При %d ГБ RAM — базовый режим: не поднимайте параллельность резко.", ramGB),
			EnvHint:               "WORKER_PUBLISH_CONCURRENCY=3–5, WORKER_PUBLISH_INTERVAL_SEC=30, DATABASE_MAX_CONNS=10",
		}
	case ramGB <= 16:
		return model.RuntimeTuningRecommendations{
			PublishConcurrencyMin: 10,
			PublishConcurrencyMax: 15,
			PublishIntervalSec:    10,
			DatabaseMaxConnsMin:   20,
			DatabaseMaxConnsMax:   20,
			Summary:               fmt.Sprintf("При %d ГБ RAM — можно ускорить очередь умеренно.", ramGB),
			EnvHint:               "WORKER_PUBLISH_CONCURRENCY=10–15, WORKER_PUBLISH_INTERVAL_SEC=10, DATABASE_MAX_CONNS=20",
		}
	default:
		return model.RuntimeTuningRecommendations{
			PublishConcurrencyMin: 25,
			PublishConcurrencyMax: 35,
			PublishIntervalSec:    5,
			DatabaseMaxConnsMin:   25,
			DatabaseMaxConnsMax:   40,
			Summary:               fmt.Sprintf("При %d ГБ RAM — целевой режим шага 3 (~2000 постов/ч).", ramGB),
			EnvHint:               "WORKER_PUBLISH_CONCURRENCY=25–35, WORKER_PUBLISH_INTERVAL_SEC=5, DATABASE_MAX_CONNS=25–40",
		}
	}
}

func estimatePostsPerHour(concurrency, intervalSec int) int {
	if concurrency <= 0 || intervalSec <= 0 {
		return 0
	}
	return concurrency * (3600 / intervalSec)
}
