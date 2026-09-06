package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/postilka/postilka/internal/config"
	oauthclient "github.com/postilka/postilka/internal/oauth"
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

	// Инициализация необходимых репозиториев и сервисов для генерации
	encKey := cfg.EncryptionKey
	if encKey == "" {
		encKey = cfg.JWTSecret
	}
	secretCipher, err := service.NewSecretCipher(encKey)
	if err != nil {
		logger.Error("initialize encryption", "error", err)
		os.Exit(1)
	}

	storageSettingsRepo := repository.NewStorageSettingsRepository(db.Pool)
	storageSettingsSvc := service.NewStorageSettingsService(storageSettingsRepo, cfg)
	objectStorage := service.NewObjectStorage(storageSettingsSvc)

	// Сервисы для AI-генерации
	kieSettingsRepo := repository.NewKieSettingsRepository(db.Pool)
	kieConfigSvc := service.NewKieConfigService(kieSettingsRepo, cfg, secretCipher)
	kieVideoSettingsRepo := repository.NewKieVideoSettingsRepository(db.Pool)
	kieVideoConfigSvc := service.NewKieVideoConfigService(kieVideoSettingsRepo, cfg, secretCipher)
	yandexGptConfigRepo := repository.NewYandexGptConfigRepository(db.Pool)
	yandexGptConfigSvc := service.NewYandexGptConfigService(yandexGptConfigRepo, cfg, secretCipher)

	// Сервисы для работы с генерацией
	genRepo := repository.NewAIGenerationRepository(db.Pool)
	genJobRepo := repository.NewAIGenerationJobRepository(db.Pool)
	genUploadRepo := repository.NewGenerationSourceUploadRepository(db.Pool)
	userRepo := repository.NewUserRepository(db.Pool)
	workspaceRepo := repository.NewWorkspaceRepository(db.Pool)
	planRepo := repository.NewPlanRepository(db.Pool)
	subscriptionRepo := repository.NewSubscriptionRepository(db.Pool)
	usageRepo := repository.NewUsageRepository(db.Pool)
	walletRepo := repository.NewWalletRepository(db.Pool)
	channelRepo := repository.NewChannelRepository(db.Pool)
	workflowRepo := repository.NewWorkflowRepository(db.Pool)
	quotaSvc := service.NewQuotaService(planRepo, workspaceRepo, subscriptionRepo, usageRepo, channelRepo, workflowRepo)
	aiBillingSvc := service.NewAIBillingService(quotaSvc, usageRepo, walletRepo, kieSettingsRepo)
	fileStorageRepo := repository.NewWorkspaceFileRepository(db.Pool)
	folderStorageRepo := repository.NewWorkspaceFolderRepository(db.Pool)
	wsSvc := service.NewWorkspaceService(workspaceRepo, planRepo)
	uploadFileSettingsRepo := repository.NewUploadFileSettingsRepository(db.Pool)
	uploadFileSettingsSvc := service.NewUploadFileSettingsService(uploadFileSettingsRepo)
	uploadSessions := service.NewUploadSessionService(cfg.JWTSecret)
	fileStorageSvc := service.NewFileStorageService(
		fileStorageRepo, folderStorageRepo, workspaceRepo, planRepo, wsSvc, objectStorage, uploadSessions, uploadFileSettingsSvc,
	)

	// Уведомления должны работать в отдельном generation-worker так же, как в API.
	notificationRepo := repository.NewNotificationRepository(db.Pool)
	notificationSvc := service.NewNotificationService(
		notificationRepo, workspaceRepo, quotaSvc, planRepo, channelRepo, subscriptionRepo,
		fileStorageRepo, folderStorageRepo, walletRepo, logger,
	)
	settingsRepo := repository.NewSettingsRepository(db.Pool)
	identityRepo := repository.NewUserLoginIdentityRepository(db.Pool)
	oauthSettingsRepo := repository.NewOAuthSettingsRepository(settingsRepo)
	telegramProviderSettingsRepo := repository.NewTelegramProviderSettingsRepository(db.Pool)
	telegramProviderSettingsSvc := service.NewTelegramProviderSettingsService(telegramProviderSettingsRepo)
	telegramSettingsRepo := repository.NewTelegramSettingsRepository(db.Pool)
	telegramSettingsSvc := service.NewTelegramSettingsService(telegramSettingsRepo)
	telegramBotClient := service.NewTelegramBotClient(telegramProviderSettingsSvc, cfg.TelegramLocalProxy)
	userMessenger := service.NewUserMessengerService(
		identityRepo, oauthSettingsRepo, telegramSettingsSvc, telegramBotClient, oauthclient.NewMAXBotClient(), logger,
	)
	mailSettingsRepo := repository.NewSMTPSettingsRepository(db.Pool)
	mailSettingsSvc := service.NewSMTPSettingsService(mailSettingsRepo)
	mailSvc := service.NewMailService(mailSettingsSvc)
	emailTemplateRepo := repository.NewEmailTemplateSettingsRepository(db.Pool)
	emailTemplateSvc := service.NewEmailTemplateSettingsService(emailTemplateRepo)
	emailSvc := service.NewEmailService(mailSvc, emailTemplateSvc, service.NewEmailRenderer())
	txEmailSvc := service.NewTransactionalEmailService(emailSvc, userRepo, planRepo, workspaceRepo, cfg, logger)
	notificationSvc.BindOutbound(userRepo, txEmailSvc, userMessenger, cfg)

	// Сервис генерации
	generationSvc := service.NewGenerationService(
		kieConfigSvc, kieVideoConfigSvc, genRepo, genJobRepo, genUploadRepo, aiBillingSvc, objectStorage, fileStorageSvc, wsSvc, yandexGptConfigSvc, quotaSvc,
	)
	generationSvc.SetNotifier(notificationSvc)

	logger.Info("generation worker started",
		"version", config.Version,
	)

	workerCtx, workerCancel := context.WithCancel(ctx)
	defer workerCancel()

	// Запуск worker'а для генерации
	generationSvc.StartGenerationWorker(workerCtx)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	<-quit
	logger.Info("generation worker stopped")
}
