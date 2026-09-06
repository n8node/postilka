package service

import (
	"context"
	"sync"
	"time"
)

// streamingLimiter applies a runtime-configurable concurrency and memory budget.
// Files are streamed through temporary files, so the memory reservation covers
// the bounded upload buffers rather than the full media object.
type streamingLimiter struct {
	mu     sync.Mutex
	active int
	usedMB int
}

func (l *streamingLimiter) acquire(ctx context.Context, concurrency, memoryBudget, reservationMB int) error {
	if concurrency < 1 {
		concurrency = 1
	}
	if memoryBudget < 1 {
		memoryBudget = 1
	}
	if reservationMB < 1 {
		reservationMB = 1
	}
	if reservationMB > memoryBudget {
		reservationMB = memoryBudget
	}
	for {
		l.mu.Lock()
		if l.active < concurrency && l.usedMB+reservationMB <= memoryBudget {
			l.active++
			l.usedMB += reservationMB
			l.mu.Unlock()
			return nil
		}
		l.mu.Unlock()
		timer := time.NewTimer(100 * time.Millisecond)
		select {
		case <-ctx.Done():
			timer.Stop()
			return ctx.Err()
		case <-timer.C:
		}
	}
}

func (l *streamingLimiter) release(reservationMB int) {
	l.mu.Lock()
	if l.active > 0 {
		l.active--
	}
	l.usedMB -= reservationMB
	if l.usedMB < 0 {
		l.usedMB = 0
	}
	l.mu.Unlock()
}
