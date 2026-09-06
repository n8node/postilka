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

	// Инициализация необходимых репозиториев и сервисов для уведомлений
	notificationRepo := repository.NewNotificationRepository(db.Pool)
	userRepo := repository.NewUserRepository(db.Pool)
	settingsRepo := repository.NewSettingsRepository(db.Pool)
	workspaceRepo := repository.NewWorkspaceRepository(db.Pool)
	planRepo := repository.NewPlanRepository(db.Pool)
	channelRepo := repository.NewChannelRepository(db.Pool)
	subscriptionRepo := repository.NewSubscriptionRepository(db.Pool)
	usageRepo := repository.NewUsageRepository(db.Pool)
	workflowRepo := repository.NewWorkflowRepository(db.Pool)

	// Сервисы для уведомлений
	wsSvc := service.NewWorkspaceService(workspaceRepo, planRepo)
	quotaSvc := service.NewQuotaService(planRepo, workspaceRepo, subscriptionRepo, usageRepo, channelRepo, workflowRepo)

	// Сервисы для email
	smtpSettingsRepo := repository.NewSMTPSettingsRepository(db.Pool)
	smtpSettingsSvc := service.NewSMTPSettingsService(smtpSettingsRepo)
	mailSvc := service.NewMailService(smtpSettingsSvc)
	emailTemplateSettingsRepo := repository.NewEmailTemplateSettingsRepository(db.Pool)
	emailTemplateSettingsSvc := service.NewEmailTemplateSettingsService(emailTemplateSettingsRepo)
	emailRenderer := service.NewEmailRenderer()
	emailSvc := service.NewEmailService(mailSvc, emailTemplateSettingsSvc, emailRenderer)

	// Сервисы для Telegram
	telegramProviderSettingsRepo := repository.NewTelegramProviderSettingsRepository(db.Pool)
	telegramProviderSettingsSvc := service.NewTelegramProviderSettingsService(telegramProviderSettingsRepo)
	telegramSettingsRepo := repository.NewTelegramSettingsRepository(db.Pool)
	telegramSettingsSvc := service.NewTelegramSettingsService(telegramSettingsRepo)
	telegramQueueRepo := repository.NewTelegramNotificationQueueRepository(db.Pool)
	telegramBotClient := service.NewTelegramBotClient(telegramProviderSettingsSvc, cfg.TelegramLocalProxy)

	// Основной сервис уведомлений
	notificationSvc := service.NewNotificationService(
		notificationRepo, workspaceRepo, quotaSvc, planRepo, channelRepo, subscriptionRepo,
		nil, nil, nil, nil, logger,
	)

	// Сервисы для транзакционных email
	identityRepo := repository.NewUserLoginIdentityRepository(db.Pool)
	oauthSettingsRepo := repository.NewOAuthSettingsRepository(settingsRepo)
	txEmailSvc := service.NewTransactionalEmailService(emailSvc, userRepo, planRepo, workspaceRepo, cfg, logger)

	// Сервисы для пользователей
	userMessenger := service.NewUserMessengerService(
		identityRepo, oauthSettingsRepo, telegramSettingsSvc, telegramBotClient, nil, logger,
	)

	// Привязываем уведомления к внешним сервисам
	notificationSvc.BindOutbound(userRepo, txEmailSvc, userMessenger, cfg)

	logger.Info("notification worker started",
		"version", config.Version,
	)

	workerCtx, workerCancel := context.WithCancel(ctx)
	defer workerCancel()

	// Запуск обработкиscheduled уведомлений
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				if err := db.Ping(ctx); err != nil {
					logger.Warn("notification worker db ping failed", "error", err)
					continue
				}

				// Обработка scheduled уведомлений
				if err := notificationSvc.ProcessScheduled(ctx); err != nil {
					logger.Warn("notification worker scheduled process failed", "error", err)
				}
			case <-workerCtx.Done():
				logger.Info("notification worker scheduled loop stopped")
				return
			}
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	<-quit
	logger.Info("notification worker stopped")
}
