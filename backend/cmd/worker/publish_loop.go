package main

import (
	"context"
	"log/slog"
	"time"

	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

func runPublishLoop(
	ctx context.Context,
	logger *slog.Logger,
	loadMonitor *service.LoadMonitorService,
	publication *service.PublicationService,
	db *repository.Postgres,
) {
	for {
		if ctx.Err() != nil {
			return
		}
		poolMax := 0
		if db != nil && db.Pool != nil {
			poolMax = int(db.Pool.Stat().MaxConns())
		}
		tuning := loadMonitor.GetEffectiveRuntimeTuning(ctx, poolMax)
		interval := time.Duration(tuning.PublishIntervalSec) * time.Second
		if interval < time.Second {
			interval = time.Second
		}

		if n, err := publication.ProcessDue(ctx, tuning.PublishConcurrency); err != nil {
			logger.Warn("post publication tick failed", "error", err, "claimed", n)
		} else if n > 0 {
			logger.Info("processed due posts", "count", n, "concurrency", tuning.PublishConcurrency)
		}

		select {
		case <-ctx.Done():
			return
		case <-time.After(interval):
		}
	}
}
