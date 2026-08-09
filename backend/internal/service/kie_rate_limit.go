package service

import (
	"context"
	"strings"
	"sync"
	"time"

	"github.com/postilka/postilka/internal/ai"
)

type kieCreateGate struct {
	mu     sync.Mutex
	window time.Duration
	max    int
	times  []time.Time
}

func newKieCreateGate() *kieCreateGate {
	return &kieCreateGate{
		window: ai.KieCreateTaskWindow,
		max:    ai.KieMaxCreateTasksPerWindow,
	}
}

func (g *kieCreateGate) Wait(ctx context.Context) error {
	for {
		wait, ok := g.tryAcquire()
		if ok {
			return nil
		}
		timer := time.NewTimer(wait)
		select {
		case <-ctx.Done():
			timer.Stop()
			return ctx.Err()
		case <-timer.C:
		}
	}
}

func (g *kieCreateGate) tryAcquire() (wait time.Duration, ok bool) {
	g.mu.Lock()
	defer g.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-g.window)
	kept := g.times[:0]
	for _, t := range g.times {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	g.times = kept

	if len(g.times) < g.max {
		g.times = append(g.times, now)
		return 0, true
	}
	return g.times[0].Add(g.window).Sub(now), false
}

func isKieRateLimited(err error) bool {
	if err == nil {
		return false
	}
	lower := strings.ToLower(err.Error())
	return strings.Contains(lower, "429") ||
		strings.Contains(lower, "rate limit") ||
		strings.Contains(lower, "too many requests")
}
