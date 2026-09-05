package metrics

import (
	"context"
	"time"

	"github.com/postilka/postilka/internal/repository"
)

func ObservePool(registry *Registry, db *repository.Postgres) {
	if registry == nil || db == nil {
		return
	}
	total, acquired, idle, max := db.PoolStats()
	registry.SetGauge("postgres_pool_total_connections", float64(total))
	registry.SetGauge("postgres_pool_acquired_connections", float64(acquired))
	registry.SetGauge("postgres_pool_idle_connections", float64(idle))
	registry.SetGauge("postgres_pool_max_connections", float64(max))
}

func StartPoolCollector(ctx context.Context, registry *Registry, db *repository.Postgres, interval time.Duration) {
	if interval <= 0 {
		interval = 10 * time.Second
	}
	ObservePool(registry, db)
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				ObservePool(registry, db)
			}
		}
	}()
}
