package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("load config", "error", err)
		os.Exit(1)
	}

	ctx := context.Background()
	db, err := repository.NewPostgres(ctx, cfg.DatabaseURL, cfg.DatabaseMaxConns)
	if err != nil {
		logger.Error("connect postgres", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	// Инициализация необходимых репозиториев и сервисов для технического обслуживания
	workspaceRepo := repository.NewWorkspaceRepository(db.Pool)
	planRepo := repository.NewPlanRepository(db.Pool)
	channelRepo := repository.NewChannelRepository(db.Pool)
	subscriptionRepo := repository.NewSubscriptionRepository(db.Pool)
	walletRepo := repository.NewWalletRepository(db.Pool)
	usageRepo := repository.NewUsageRepository(db.Pool)
	workflowRepo := repository.NewWorkflowRepository(db.Pool)
	notificationRepo := repository.NewNotificationRepository(db.Pool)
	analyticsRepo := repository.NewAnalyticsRepository(db.Pool)
	metrikaRepo := repository.NewMetrikaRepository(db.Pool)
	metrikaPlatformConfigRepo := repository.NewMetrikaPlatformConfigRepository(db.Pool)
	linkCodeRepo := repository.NewLinkCodeRepository(db.Pool)
	postRepo := repository.NewPostRepository(db.Pool)
	fileStorageRepo := repository.NewWorkspaceFileRepository(db.Pool)
	folderStorageRepo := repository.NewWorkspaceFolderRepository(db.Pool)
	opsStateRepo := repository.NewOpsStateRepository(db.Pool)
	backupRepo := repository.NewBackupRepository(db.Pool)

	// Сервисы для технического обслуживания
	wsSvc := service.NewWorkspaceService(workspaceRepo, planRepo)
	quotaSvc := service.NewQuotaService(planRepo, workspaceRepo, subscriptionRepo, usageRepo, channelRepo, workflowRepo)

	// Сервисы для подписок
	subscriptionSvc := service.NewSubscriptionService(subscriptionRepo, planRepo, workspaceRepo)
	renewalSvc := service.NewRenewalService(subscriptionRepo, planRepo, walletRepo, workspaceRepo, subscriptionSvc, logger)

	// Сервисы для метрик
	metrikaPlatformConfigSvc := service.NewMetrikaPlatformConfigService(metrikaPlatformConfigRepo, cfg, nil)
	metrikaSvc := service.NewMetrikaConnectionService(metrikaRepo, wsSvc, metrikaPlatformConfigSvc, nil, cfg, nil)

	// Сервисы для аналитики
	metricsCollector := service.NewMetricsCollectorService(
		analyticsRepo, linkCodeRepo, postRepo, channelRepo, nil, metrikaSvc, nil, nil, logger,
	)

	// Сервисы для бэкапов
	storageSettingsRepo := repository.NewStorageSettingsRepository(db.Pool)
	storageSettingsSvc := service.NewStorageSettingsService(storageSettingsRepo, cfg)
	objectStorage := service.NewObjectStorage(storageSettingsSvc)
	backupSvc := service.NewBackupService(backupRepo, objectStorage, cfg, logger)

	// Сервисы для оповещений
	notificationSvc := service.NewNotificationService(
		notificationRepo, workspaceRepo, quotaSvc, planRepo, channelRepo, subscriptionRepo,
		fileStorageRepo, folderStorageRepo, walletRepo, logger,
	)

	// Сервисы для операционных задач
	opsDigestSvc := service.NewOpsDigestService(
		nil, nil, opsStateRepo, postRepo, db, nil, nil,
		storageSettingsSvc, nil, nil, nil, nil, nil, nil, nil, nil, logger,
	)

	// Сервисы для workflow
	workflowSvc := service.NewWorkflowService(
		workflowRepo, channelRepo, nil, nil, nil, nil, wsSvc, nil, planRepo, quotaSvc, notificationSvc, logger,
	)
	workflowSvc.SetWorkflowConfig(cfg)

	// Сервисы для тестирования каналов
	logger.Info("maintenance worker started",
		"version", config.Version,
	)

	workerCtx, workerCancel := context.WithCancel(ctx)
	defer workerCancel()

	// Запуск основного цикла технического обслуживания
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		var lastMetricsRun time.Time
		var backupRunning bool

		for {
			select {
			case <-ticker.C:
				if err := db.Ping(ctx); err != nil {
					logger.Warn("maintenance worker db ping failed", "error", err)
					continue
				}

				// Обновление heartbeat
				if err := opsDigestSvc.TouchWorkerHeartbeat(ctx); err != nil {
					logger.Warn("ops heartbeat failed", "error", err)
				}

				// Обработка due задач
				if err := opsDigestSvc.ProcessDue(ctx); err != nil {
					logger.Warn("ops digest tick failed", "error", err)
				}

				// Обработка бэкапов
				if !backupRunning {
					backupRunning = true
					go func() {
						defer func() { backupRunning = false }()
						runCtx, cancel := context.WithTimeout(context.Background(), 90*time.Minute)
						defer cancel()
						if err := backupSvc.Process(runCtx); err != nil {
							logger.Warn("platform backup tick failed", "error", err)
						}
					}()
				}

				// Обработка продления подписок
				if err := renewalSvc.Process(ctx); err != nil {
					logger.Warn("subscription renewal tick failed", "error", err)
				}

				// Обработка scheduled уведомлений
				if err := notificationSvc.ProcessScheduled(ctx); err != nil {
					logger.Warn("notification scheduled tick failed", "error", err)
				}

				// Очистка trash
				if n, err := service.NewFileStorageService(fileStorageRepo, folderStorageRepo, workspaceRepo, planRepo, wsSvc, nil, nil, nil).PurgeExpiredTrash(ctx); err != nil {
					logger.Warn("purge trash tick failed", "error", err)
				} else if n > 0 {
					logger.Info("purged expired trash files", "count", n)
				}

				// Обработка RSS фидов
				if n, err := workflowSvc.ProcessRSSFeeds(ctx); err != nil {
					logger.Warn("workflow rss poll failed", "error", err)
				} else if n > 0 {
					logger.Info("started workflow runs from rss", "count", n)
				}

				// Сбор метрик
				if time.Since(lastMetricsRun) >= 15*time.Minute {
					if n, err := metricsCollector.Process(ctx, 50); err != nil {
						logger.Warn("metrics collection tick failed", "error", err)
					} else if n > 0 {
						logger.Info("collected post metrics", "count", n)
					}
					lastMetricsRun = time.Now()
				}
			case <-workerCtx.Done():
				logger.Info("maintenance worker main loop stopped")
				return
			}
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	<-quit
	logger.Info("maintenance worker stopped")
}
