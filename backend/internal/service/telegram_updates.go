package service

import (
	"context"
	"strings"
	"time"
)

const (
	telegramPollLongTimeout = 25 * time.Second
	telegramPollContextWait = 50 * time.Second
	telegramPollReconcile   = 2 * time.Second
	telegramPollRetryWait   = 3 * time.Second
)

type telegramTokenSource struct {
	name string
	fn   func(context.Context) string
}

// TelegramBotUpdateHandler receives every update from the shared getUpdates pump.
type TelegramBotUpdateHandler func(ctx context.Context, token string, upd adminBotUpdate)

func (s *TelegramService) WatchBotToken(name string, fn func(context.Context) string) {
	if s == nil || fn == nil {
		return
	}
	s.pollersMu.Lock()
	s.tokenSources = append(s.tokenSources, telegramTokenSource{name: strings.TrimSpace(name), fn: fn})
	s.pollersMu.Unlock()
	s.mu.RLock()
	started := s.started
	s.mu.RUnlock()
	if started {
		s.reconcileBotPollers()
	}
}

func (s *TelegramService) OnBotUpdate(h TelegramBotUpdateHandler) {
	if s == nil || h == nil {
		return
	}
	s.pollersMu.Lock()
	s.updateHandlers = append(s.updateHandlers, h)
	s.pollersMu.Unlock()
}

func (s *TelegramService) botUpdateLoop() {
	defer s.stopAllBotPollers()
	s.reconcileBotPollers()
	ticker := time.NewTicker(telegramPollReconcile)
	defer ticker.Stop()
	for {
		select {
		case <-s.stopCh:
			return
		case <-ticker.C:
			s.reconcileBotPollers()
		}
	}
}

func (s *TelegramService) collectBotTokens() []string {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	seen := make(map[string]struct{})
	var out []string
	add := func(token string) {
		token = strings.TrimSpace(token)
		if token == "" {
			return
		}
		if _, ok := seen[token]; ok {
			return
		}
		seen[token] = struct{}{}
		out = append(out, token)
	}

	if s.settings != nil {
		if cfg, err := s.settings.GetEffective(ctx); err == nil && cfg.Enabled {
			add(cfg.BotToken)
		}
	}

	s.pollersMu.Lock()
	sources := append([]telegramTokenSource(nil), s.tokenSources...)
	s.pollersMu.Unlock()
	for _, src := range sources {
		if src.fn == nil {
			continue
		}
		add(src.fn(ctx))
	}
	return out
}

func (s *TelegramService) reconcileBotPollers() {
	wanted := s.collectBotTokens()
	wantedSet := make(map[string]struct{}, len(wanted))
	for _, token := range wanted {
		wantedSet[token] = struct{}{}
	}

	s.pollersMu.Lock()
	defer s.pollersMu.Unlock()
	if s.activePollers == nil {
		s.activePollers = make(map[string]chan struct{})
	}
	for token, stop := range s.activePollers {
		if _, ok := wantedSet[token]; ok {
			continue
		}
		close(stop)
		delete(s.activePollers, token)
	}
	for _, token := range wanted {
		if _, ok := s.activePollers[token]; ok {
			continue
		}
		stop := make(chan struct{})
		s.activePollers[token] = stop
		go s.runTokenPoller(token, stop)
	}
}

func (s *TelegramService) stopAllBotPollers() {
	s.pollersMu.Lock()
	defer s.pollersMu.Unlock()
	for token, stop := range s.activePollers {
		close(stop)
		delete(s.activePollers, token)
	}
}

func (s *TelegramService) runTokenPoller(token string, stop <-chan struct{}) {
	s.logger.Info("telegram update poller started")
	defer s.logger.Info("telegram update poller stopped")

	primed := false
	var offset int64
	for {
		select {
		case <-stop:
			return
		default:
		}

		ctx, cancel := context.WithTimeout(context.Background(), telegramPollContextWait)
		if !primed {
			_ = s.telegramDeleteWebhook(ctx, token)
			updates, err := s.telegramGetAdminUpdates(ctx, token, -1, 0)
			cancel()
			if err != nil {
				s.logger.Warn("telegram update prime failed", "err", err)
				if !sleepOrStop(stop, telegramPollRetryWait) {
					return
				}
				continue
			}
			offset = nextTelegramUpdateOffset(updates, 1)
			primed = true
			continue
		}

		updates, err := s.telegramGetAdminUpdates(ctx, token, offset, int(telegramPollLongTimeout/time.Second))
		cancel()
		if err != nil {
			s.logger.Warn("telegram update poll failed", "err", err)
			if isTelegramGetUpdatesConflict(err) {
				clearCtx, clearCancel := context.WithTimeout(context.Background(), 15*time.Second)
				_ = s.telegramDeleteWebhook(clearCtx, token)
				clearCancel()
			}
			if !sleepOrStop(stop, telegramPollRetryWait) {
				return
			}
			continue
		}
		for _, upd := range updates {
			if next := upd.UpdateID + 1; next > offset {
				offset = next
			}
			s.dispatchBotUpdate(token, upd)
		}
	}
}

func (s *TelegramService) dispatchBotUpdate(token string, upd adminBotUpdate) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	adminChat := ""
	adminToken := ""
	if s.settings != nil {
		if cfg, err := s.settings.GetEffective(ctx); err == nil {
			adminChat = strings.TrimSpace(cfg.ChatID)
			adminToken = strings.TrimSpace(cfg.BotToken)
		}
	}
	if adminToken == "" || adminToken == token {
		s.handleHealthAckUpdate(ctx, token, adminChat, upd)
	}

	s.pollersMu.Lock()
	handlers := append([]TelegramBotUpdateHandler(nil), s.updateHandlers...)
	s.pollersMu.Unlock()
	for _, h := range handlers {
		h(ctx, token, upd)
	}
}

func nextTelegramUpdateOffset(updates []adminBotUpdate, fallback int64) int64 {
	next := fallback
	for _, upd := range updates {
		if candidate := upd.UpdateID + 1; candidate > next {
			next = candidate
		}
	}
	return next
}

func sleepOrStop(stop <-chan struct{}, d time.Duration) bool {
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-stop:
		return false
	case <-timer.C:
		return true
	}
}
