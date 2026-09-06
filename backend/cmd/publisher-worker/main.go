package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/handler"
	appmetrics "github.com/postilka/postilka/internal/metrics"
	"github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/photochka"
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
	encKey := cfg.EncryptionKey
	if encKey == "" {
		encKey = cfg.JWTSecret
	}
	secretCipher, err := service.NewSecretCipher(encKey)
	if err != nil {
		logger.Error("initialize encryption", "error", err)
		os.Exit(1)
	}

	// Инициализация необходимых репозиториев и сервисов для публикации
	postRepo := repository.NewPostRepository(db.Pool)
	channelRepo := repository.NewChannelRepository(db.Pool)
	fileStorageRepo := repository.NewWorkspaceFileRepository(db.Pool)
	workflowRepo := repository.NewWorkflowRepository(db.Pool)

	// Сервисы для публикации
	workspaceRepo := repository.NewWorkspaceRepository(db.Pool)
	planRepo := repository.NewPlanRepository(db.Pool)
	notificationRepo := repository.NewNotificationRepository(db.Pool)
	userRepo := repository.NewUserRepository(db.Pool)
	settingsRepo := repository.NewSettingsRepository(db.Pool)
	identityRepo := repository.NewUserLoginIdentityRepository(db.Pool)
	oauthSettingsRepo := repository.NewOAuthSettingsRepository(settingsRepo)
	telegramSettingsRepo := repository.NewTelegramSettingsRepository(db.Pool)
	telegramSettingsSvc := service.NewTelegramSettingsService(telegramSettingsRepo)
	telegramProviderSettingsRepo := repository.NewTelegramProviderSettingsRepository(db.Pool)
	telegramProviderSettingsSvc := service.NewTelegramProviderSettingsService(telegramProviderSettingsRepo)
	telegramBotClient := service.NewTelegramBotClient(telegramProviderSettingsSvc, cfg.TelegramLocalProxy)
	userMessenger := service.NewUserMessengerService(
		identityRepo, oauthSettingsRepo, telegramSettingsSvc, telegramBotClient, oauth.NewMAXBotClient(), logger,
	)
	mailSettingsRepo := repository.NewSMTPSettingsRepository(db.Pool)
	mailSettingsSvc := service.NewSMTPSettingsService(mailSettingsRepo)
	mailSvc := service.NewMailService(mailSettingsSvc)
	emailTemplateSettingsRepo := repository.NewEmailTemplateSettingsRepository(db.Pool)
	emailTemplateSettingsSvc := service.NewEmailTemplateSettingsService(emailTemplateSettingsRepo)
	emailRenderer := service.NewEmailRenderer()
	emailSvc := service.NewEmailService(mailSvc, emailTemplateSettingsSvc, emailRenderer)
	txEmailSvc := service.NewTransactionalEmailService(emailSvc, userRepo, planRepo, workspaceRepo, cfg, logger)
	quotaSvc := service.NewQuotaService(planRepo, workspaceRepo, repository.NewSubscriptionRepository(db.Pool), repository.NewUsageRepository(db.Pool), channelRepo, workflowRepo)
	notificationSvc := service.NewNotificationService(
		notificationRepo, workspaceRepo, quotaSvc, planRepo, channelRepo, repository.NewSubscriptionRepository(db.Pool),
		fileStorageRepo, repository.NewWorkspaceFolderRepository(db.Pool), repository.NewWalletRepository(db.Pool), logger,
	)
	notificationSvc.BindOutbound(userRepo, txEmailSvc, userMessenger, cfg)
	wsSvc := service.NewWorkspaceService(workspaceRepo, planRepo)
	storageSettingsRepo := repository.NewStorageSettingsRepository(db.Pool)
	storageSettingsSvc := service.NewStorageSettingsService(storageSettingsRepo, cfg)
	objectStorage := service.NewObjectStorage(storageSettingsSvc)

	// Сервисы для тестирования каналов
	socialProviderSettingsRepo := repository.NewSocialProviderSettingsRepository(db.Pool)
	socialProviderSettingsSvc := service.NewSocialProviderSettingsService(socialProviderSettingsRepo)
	photochkaClient := photochka.NewClient(cfg.PhotochkaAPIBaseURL)

	// Сервисы для публикации
	channelTestSvc := service.NewChannelTestService(
		channelRepo, nil, telegramBotClient, nil, socialProviderSettingsSvc, wsSvc, secretCipher, photochkaClient,
	)

	publicationSvc := service.NewPublicationService(
		postRepo, channelRepo, fileStorageRepo, objectStorage, channelTestSvc, telegramBotClient, oauth.NewMAXBotClient(), photochkaClient, nil, nil,
	)
	attachPublicationNotifier(publicationSvc, notificationSvc)

	// Сервисы для работы с workflow
	approvalRepo := repository.NewPostApprovalRepository(db.Pool)
	postSvc := service.NewPostService(postRepo, channelRepo, wsSvc, publicationSvc, approvalRepo, nil)

	// Сервисы для работы с workflow
	workflowSvc := service.NewWorkflowService(
		workflowRepo, channelRepo, postSvc, nil, nil, nil, wsSvc, nil, planRepo, nil, nil, logger,
	)
	workflowSvc.SetWorkflowConfig(cfg)

	logger.Info("publisher worker started",
		"publish_concurrency", cfg.WorkerPublishConcurrency,
		"publish_interval_sec", cfg.WorkerPublishIntervalSec,
		"version", config.Version,
	)

	workerCtx, workerCancel := context.WithCancel(ctx)
	defer workerCancel()

	// Запуск публикационного цикла
	go runPublishLoop(workerCtx, logger, publicationSvc, db, cfg.WorkerPublishConcurrency)

	// Запуск метрик если нужно
	workerMetrics := appmetrics.New()
	appmetrics.StartPoolCollector(workerCtx, workerMetrics, db, 10*time.Second)
	workerMetrics.SetGauge("worker_up", 1)
	if cfg.WorkerMetricsPort != "" {
		runtimeHealth := handler.NewRuntimeHealthHandler(workerMetrics, db)
		mux := http.NewServeMux()
		mux.HandleFunc("/health", runtimeHealth.Health)
		mux.HandleFunc("/metrics", runtimeHealth.Metrics)
		go func() {
			logger.Info("publisher worker metrics server starting", "addr", cfg.WorkerMetricsPort)
			if err := http.ListenAndServe(cfg.WorkerMetricsPort, mux); err != nil {
				logger.Error("publisher worker metrics server stopped", "error", err)
			}
		}()
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	<-quit
	logger.Info("publisher worker stopped")
}

func attachPublicationNotifier(publicationSvc *service.PublicationService, notificationSvc *service.NotificationService) bool {
	if publicationSvc == nil || notificationSvc == nil {
		return false
	}
	publicationSvc.SetNotifier(notificationSvc)
	return true
}

func runPublishLoop(ctx context.Context, logger *slog.Logger, publicationSvc *service.PublicationService, db *repository.Postgres, concurrency int) {
	ticker := time.NewTicker(time.Duration(10) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := db.Ping(ctx); err != nil {
				logger.Warn("publisher worker db ping failed", "error", err)
				continue
			}

			// Выполняем публикацию по расписанию
			if _, err := publicationSvc.ProcessDue(ctx, concurrency); err != nil {
				logger.Warn("publisher worker scheduled publish failed", "error", err)
			}
		case <-ctx.Done():
			logger.Info("publisher worker publish loop stopped")
			return
		}
	}
}
