package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

const (
	telegramQueueClaimLimit = 20
	telegramQueueLockTTL    = 2 * time.Minute
)

var ErrTelegramQueueUnavailable = errors.New("telegram queue unavailable")

func (s *TelegramService) triggerQueueDelivery() {
	select {
	case s.queueTriggerCh <- struct{}{}:
	default:
	}
}

func (s *TelegramService) queueLoop() {
	if s.queue == nil {
		return
	}
	ticker := time.NewTicker(telegramQueueInterval)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopCh:
			return
		case <-s.queueTriggerCh:
			s.processQueue()
		case <-ticker.C:
			s.processQueue()
		}
	}
}

func (s *TelegramService) processQueue() {
	if s.queue == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()

	cfg, err := s.settings.GetEffective(ctx)
	if err != nil {
		s.logger.Warn("telegram queue skipped: settings unavailable", "err", err)
		return
	}
	if !cfg.Enabled {
		return
	}
	if strings.TrimSpace(cfg.BotToken) == "" || strings.TrimSpace(cfg.ChatID) == "" {
		return
	}

	for {
		batch, err := s.queue.ClaimPending(ctx, telegramQueueClaimLimit, time.Now().Add(-telegramQueueLockTTL))
		if err != nil {
			s.logger.Warn("telegram queue claim failed", "err", err)
			return
		}
		if len(batch) == 0 {
			return
		}
		for i := range batch {
			s.processQueueRecord(ctx, cfg, &batch[i])
		}
		if len(batch) < telegramQueueClaimLimit {
			return
		}
	}
}

func (s *TelegramService) processQueueRecord(ctx context.Context, cfg model.TelegramSettings, rec *model.TelegramNotificationRecord) {
	sendCtx, cancel := context.WithTimeout(ctx, 12*time.Second)
	defer cancel()

	if err := s.send(sendCtx, cfg, rec.MessageText); err != nil {
		nextAttempt := time.Now().Add(queueRetryDelay(rec.AttemptCount + 1))
		markErr := s.queue.MarkFailed(ctx, rec.ID, err.Error(), nextAttempt)
		if markErr != nil && !errors.Is(markErr, repository.ErrNotFound) {
			s.logger.Warn("telegram queue mark failed error", "id", rec.ID, "err", markErr)
		}
		s.logger.Warn("telegram queue delivery failed", "id", rec.ID, "kind", rec.Kind, "err", err, "next_attempt_at", nextAttempt)
		return
	}
	if err := s.queue.MarkSent(ctx, rec.ID); err != nil && !errors.Is(err, repository.ErrNotFound) {
		s.logger.Warn("telegram queue mark sent error", "id", rec.ID, "err", err)
		return
	}
	s.logger.Info("telegram queue delivered", "id", rec.ID, "kind", rec.Kind)
}

func queueRetryDelay(attempt int) time.Duration {
	if attempt <= 1 {
		return 15 * time.Second
	}
	delay := 15 * time.Second
	for i := 1; i < attempt; i++ {
		delay *= 2
		if delay >= 30*time.Minute {
			return 30 * time.Minute
		}
	}
	return delay
}

func (s *TelegramService) enqueueTelegramNotification(
	ctx context.Context,
	kind, text string,
	payload map[string]any,
) error {
	if s.queue == nil {
		return ErrTelegramQueueUnavailable
	}
	text = strings.TrimSpace(text)
	if text == "" {
		return fmt.Errorf("empty notification text")
	}
	if _, err := s.queue.Enqueue(ctx, kind, text, payload); err != nil {
		return err
	}
	s.triggerQueueDelivery()
	return nil
}

func (s *TelegramService) ListNotifications(
	ctx context.Context,
	status model.TelegramNotificationStatus,
	limit, offset int,
) (*model.TelegramNotificationListResult, error) {
	if s.queue == nil {
		return nil, ErrTelegramQueueUnavailable
	}
	return s.queue.List(ctx, status, limit, offset)
}

func (s *TelegramService) RetryNotificationNow(ctx context.Context, id string) error {
	if s.queue == nil {
		return ErrTelegramQueueUnavailable
	}
	if err := s.queue.RetryNow(ctx, id); err != nil {
		return err
	}
	s.triggerQueueDelivery()
	return nil
}

func (s *TelegramService) queueLogger() *slog.Logger {
	if s.logger != nil {
		return s.logger
	}
	return slog.Default()
}
