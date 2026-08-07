package service

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

const telegramHealthInterval = 30 * time.Second
const telegramQueueInterval = 5 * time.Second

// TelegramService sends admin notifications and runs a background health supervisor
// that starts with the backend process (container restart / server reboot).
type TelegramService struct {
	settings *TelegramSettingsService
	queue    *repository.TelegramNotificationQueueRepository
	client   *http.Client
	logger   *slog.Logger

	mu                sync.RWMutex
	runtime           model.TelegramBotRuntimeStatus
	supervisorRunning bool
	started           bool
	stopCh            chan struct{}
	triggerCh         chan struct{}
	queueTriggerCh    chan struct{}
}

func NewTelegramService(
	settings *TelegramSettingsService,
	queue *repository.TelegramNotificationQueueRepository,
	logger *slog.Logger,
) *TelegramService {
	if logger == nil {
		logger = slog.Default()
	}
	return &TelegramService{
		settings: settings,
		queue:    queue,
		client: &http.Client{
			Timeout:   60 * time.Second,
			Transport: directHTTPTransport(),
		},
		logger: logger,
		runtime: model.TelegramBotRuntimeStatus{
			Status:  model.TelegramBotStatusDisabled,
			Message: "Супервизор не запущен",
		},
		triggerCh:      make(chan struct{}, 1),
		queueTriggerCh: make(chan struct{}, 1),
	}
}

func (s *TelegramService) Start() {
	s.mu.Lock()
	if s.started {
		s.mu.Unlock()
		return
	}
	s.started = true
	s.stopCh = make(chan struct{})
	s.supervisorRunning = true
	s.mu.Unlock()

	s.logger.Info("telegram bot supervisor starting")
	go s.supervisorLoop()
	go s.queueLoop()
	s.triggerQueueDelivery()
}

func (s *TelegramService) Stop() {
	s.mu.Lock()
	if !s.started {
		s.mu.Unlock()
		return
	}
	close(s.stopCh)
	s.started = false
	s.supervisorRunning = false
	s.mu.Unlock()
	s.logger.Info("telegram bot supervisor stopped")
}

func (s *TelegramService) Restart(ctx context.Context) model.TelegramBotRuntimeStatus {
	s.Start()
	s.triggerHealthCheck()
	if ctx != nil {
		select {
		case <-ctx.Done():
		case <-time.After(12 * time.Second):
		}
	}
	return s.GetRuntimeStatus()
}

func (s *TelegramService) GetRuntimeStatus() model.TelegramBotRuntimeStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.runtime
}

func (s *TelegramService) setRuntime(st model.TelegramBotRuntimeStatus) {
	s.mu.Lock()
	st.SupervisorRunning = s.supervisorRunning
	s.runtime = st
	s.mu.Unlock()
}

func (s *TelegramService) triggerHealthCheck() {
	select {
	case s.triggerCh <- struct{}{}:
	default:
	}
}

func (s *TelegramService) supervisorLoop() {
	ticker := time.NewTicker(telegramHealthInterval)
	defer ticker.Stop()

	s.runHealthCheck()

	for {
		select {
		case <-s.stopCh:
			s.mu.Lock()
			s.supervisorRunning = false
			s.mu.Unlock()
			return
		case <-s.triggerCh:
			s.runHealthCheck()
		case <-ticker.C:
			s.runHealthCheck()
		}
	}
}

func (s *TelegramService) runHealthCheck() {
	s.setRuntime(model.TelegramBotRuntimeStatus{
		Status:  model.TelegramBotStatusStarting,
		Message: "Проверка подключения…",
	})

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	st := s.checkHealth(ctx)
	s.setRuntime(st)

	if st.Status == model.TelegramBotStatusOnline {
		s.logger.Info("telegram bot online", "username", st.BotUsername)
	} else if st.Status == model.TelegramBotStatusOffline || st.Status == model.TelegramBotStatusMisconfigured {
		s.logger.Warn("telegram bot unhealthy", "status", st.Status, "error", st.LastError)
	}
}

func (s *TelegramService) checkHealth(ctx context.Context) model.TelegramBotRuntimeStatus {
	now := time.Now()
	cfg, err := s.settings.GetEffective(ctx)
	if err != nil {
		return model.TelegramBotRuntimeStatus{
			Status:      model.TelegramBotStatusOffline,
			Message:     "Ошибка загрузки настроек",
			LastError:   err.Error(),
			LastCheckAt: now,
		}
	}

	if !cfg.Enabled {
		return model.TelegramBotRuntimeStatus{
			Status:      model.TelegramBotStatusDisabled,
			Message:     "Уведомления отключены",
			LastCheckAt: now,
		}
	}

	token := strings.TrimSpace(cfg.BotToken)
	chatID := strings.TrimSpace(cfg.ChatID)
	if token == "" {
		return model.TelegramBotRuntimeStatus{
			Status:      model.TelegramBotStatusMisconfigured,
			Message:     "Не задан токен бота",
			LastCheckAt: now,
		}
	}
	me, err := s.telegramGetMe(ctx, token)
	if err != nil {
		return model.TelegramBotRuntimeStatus{
			Status:      model.TelegramBotStatusOffline,
			Message:     "Бот недоступен",
			LastError:   err.Error(),
			LastCheckAt: now,
		}
	}

	if chatID == "" {
		return model.TelegramBotRuntimeStatus{
			Status:      model.TelegramBotStatusMisconfigured,
			Message:     "Не задан ID чата для уведомлений",
			LastCheckAt: now,
		}
	}
	if err := s.telegramGetChat(ctx, token, chatID); err != nil {
		return model.TelegramBotRuntimeStatus{
			Status:      model.TelegramBotStatusOffline,
			Message:     "Бот не видит указанный чат",
			BotUsername: me.Username,
			LastError:   err.Error(),
			LastCheckAt: now,
		}
	}

	msg := "Бот работает"
	if me.Username != "" {
		msg = "Бот работает (@" + me.Username + ")"
	}
	return model.TelegramBotRuntimeStatus{
		Status:      model.TelegramBotStatusOnline,
		Message:     msg,
		BotUsername: me.Username,
		LastCheckAt: now,
	}
}
