package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"strings"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/postilka/postilka/internal/config"
	oauthclient "github.com/postilka/postilka/internal/oauth"
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
	db, err := repository.NewPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("connect postgres", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	wsRepo := repository.NewWorkspaceRepository(db.Pool)
	planRepo := repository.NewPlanRepository(db.Pool)
	walletRepo := repository.NewWalletRepository(db.Pool)
	subscriptionRepo := repository.NewSubscriptionRepository(db.Pool)
	subscriptionSvc := service.NewSubscriptionService(subscriptionRepo, planRepo, wsRepo)
	renewalSvc := service.NewRenewalService(subscriptionRepo, planRepo, walletRepo, wsRepo, subscriptionSvc, logger)
	smtpSettingsRepo := repository.NewSMTPSettingsRepository(db.Pool)
	smtpSettingsSvc := service.NewSMTPSettingsService(smtpSettingsRepo)
	mailSvc := service.NewMailService(smtpSettingsSvc)
	emailTemplateSettingsRepo := repository.NewEmailTemplateSettingsRepository(db.Pool)
	emailTemplateSettingsSvc := service.NewEmailTemplateSettingsService(emailTemplateSettingsRepo)
	emailRenderer := service.NewEmailRenderer()
	emailSvc := service.NewEmailService(mailSvc, emailTemplateSettingsSvc, emailRenderer)
	channelRepo := repository.NewChannelRepository(db.Pool)
	youtubeReconnectNotifier := service.NewYouTubeOAuthReconnectNotifier(channelRepo, wsRepo, emailSvc, cfg, logger)

	storageSettingsRepo := repository.NewStorageSettingsRepository(db.Pool)
	storageSettingsSvc := service.NewStorageSettingsService(storageSettingsRepo, cfg)
	uploadFileSettingsRepo := repository.NewUploadFileSettingsRepository(db.Pool)
	uploadFileSettingsSvc := service.NewUploadFileSettingsService(uploadFileSettingsRepo)
	wsSvc := service.NewWorkspaceService(wsRepo, planRepo)
	objectStorage := service.NewObjectStorage(storageSettingsSvc)
	uploadSessions := service.NewUploadSessionService(cfg.JWTSecret)
	fileStorageRepo := repository.NewWorkspaceFileRepository(db.Pool)
	folderStorageRepo := repository.NewWorkspaceFolderRepository(db.Pool)
	fileStorageSvc := service.NewFileStorageService(
		fileStorageRepo, folderStorageRepo, wsRepo, planRepo, wsSvc, objectStorage, uploadSessions, uploadFileSettingsSvc,
	)
	backupRepo := repository.NewBackupRepository(db.Pool)
	backupSvc := service.NewBackupService(backupRepo, objectStorage, cfg, logger)

	encKey := cfg.EncryptionKey
	if strings.TrimSpace(encKey) == "" {
		encKey = cfg.JWTSecret
	}
	secretCipher, _ := service.NewSecretCipher(encKey)
	userRepo := repository.NewUserRepository(db.Pool)
	telegramProviderSettingsRepo := repository.NewTelegramProviderSettingsRepository(db.Pool)
	telegramProviderSettingsSvc := service.NewTelegramProviderSettingsService(telegramProviderSettingsRepo)
	socialProviderSettingsRepo := repository.NewSocialProviderSettingsRepository(db.Pool)
	socialProviderSettingsSvc := service.NewSocialProviderSettingsService(socialProviderSettingsRepo)
	youtubeProviderSettingsRepo := repository.NewYouTubeProviderSettingsRepository(db.Pool)
	youtubeProviderSettingsSvc := service.NewYouTubeProviderSettingsService(youtubeProviderSettingsRepo)
	telegramBotClient := service.NewTelegramBotClient(telegramProviderSettingsSvc, cfg.TelegramLocalProxy)
	youtubeAPIClient := service.NewYouTubeAPIClient(youtubeProviderSettingsSvc, cfg.YouTubeLocalProxy)
	service.SetYouTubeAPIClient(youtubeAPIClient)
	photochkaClient := photochka.NewClient(cfg.PhotochkaAPIBaseURL)
	channelTestSvc := service.NewChannelTestService(
		channelRepo, userRepo, telegramBotClient, youtubeAPIClient, socialProviderSettingsSvc, wsSvc, secretCipher, photochkaClient,
	)
	postRepo := repository.NewPostRepository(db.Pool)
	usageRepo := repository.NewUsageRepository(db.Pool)
	workflowRepo := repository.NewWorkflowRepository(db.Pool)
	quotaSvc := service.NewQuotaService(planRepo, wsRepo, subscriptionRepo, usageRepo, channelRepo, workflowRepo)
	linkCodeRepo := repository.NewLinkCodeRepository(db.Pool)
	linkShortener := service.NewLinkShortenerService(linkCodeRepo, cfg.LinkBaseURL)
	publicationSvc := service.NewPublicationService(
		postRepo, channelRepo, fileStorageRepo, objectStorage, channelTestSvc, telegramBotClient, oauthclient.NewMAXBotClient(), photochkaClient, quotaSvc, linkShortener,
	)
	notificationRepo := repository.NewNotificationRepository(db.Pool)
	notificationSvc := service.NewNotificationService(
		notificationRepo, wsRepo, quotaSvc, planRepo, channelRepo, subscriptionRepo,
		fileStorageRepo, folderStorageRepo, walletRepo, logger,
	)
	renewalSvc.SetNotifier(notificationSvc)
	youtubeReconnectNotifier.SetNotifier(notificationSvc)
	publicationSvc.SetNotifier(notificationSvc)
	fileStorageSvc.SetNotifier(notificationSvc)
	analyticsRepo := repository.NewAnalyticsRepository(db.Pool)
	metrikaRepo := repository.NewMetrikaRepository(db.Pool)
	metrikaPlatformConfigRepo := repository.NewMetrikaPlatformConfigRepository(db.Pool)
	metrikaPlatformConfigSvc := service.NewMetrikaPlatformConfigService(metrikaPlatformConfigRepo, cfg, secretCipher)
	metrikaSvc := service.NewMetrikaConnectionService(metrikaRepo, wsSvc, metrikaPlatformConfigSvc, secretCipher, cfg, nil)
	metricsCollector := service.NewMetricsCollectorService(
		analyticsRepo, linkCodeRepo, postRepo, channelRepo, channelTestSvc, metrikaSvc, telegramBotClient, photochkaClient, logger,
	)
	logger.Info("worker started", "publish_concurrency", cfg.WorkerPublishConcurrency, "version", config.Version)

	approvalRepo := repository.NewPostApprovalRepository(db.Pool)
	postSvc := service.NewPostService(postRepo, channelRepo, wsSvc, publicationSvc, approvalRepo, userRepo)
	postSvc.SetNotifier(notificationSvc)

	kieSettingsRepo := repository.NewKieSettingsRepository(db.Pool)
	aiBillingSvc := service.NewAIBillingService(quotaSvc, usageRepo, walletRepo, kieSettingsRepo)
	yandexGptConfigRepo := repository.NewYandexGptConfigRepository(db.Pool)
	yandexGptConfigSvc := service.NewYandexGptConfigService(yandexGptConfigRepo, cfg, secretCipher)
	kieConfigSvc := service.NewKieConfigService(kieSettingsRepo, cfg, secretCipher)
	kieVideoSettingsRepo := repository.NewKieVideoSettingsRepository(db.Pool)
	kieVideoConfigSvc := service.NewKieVideoConfigService(kieVideoSettingsRepo, cfg, secretCipher)
	telegramSettingsRepo := repository.NewTelegramSettingsRepository(db.Pool)
	telegramQueueRepo := repository.NewTelegramNotificationQueueRepository(db.Pool)
	telegramSettingsSvc := service.NewTelegramSettingsService(telegramSettingsRepo)
	telegramSvc := service.NewTelegramService(telegramSettingsSvc, telegramQueueRepo, cfg.TelegramLocalProxy, logger)
	opsStateRepo := repository.NewOpsStateRepository(db.Pool)
	opsDigestSvc := service.NewOpsDigestService(
		telegramSvc, telegramSettingsSvc, opsStateRepo, postRepo, db, mailSvc, smtpSettingsSvc,
		storageSettingsSvc, kieConfigSvc, kieVideoConfigSvc, yandexGptConfigSvc, socialProviderSettingsSvc,
		telegramProviderSettingsSvc, telegramBotClient, secretCipher, photochkaClient, logger,
	)
	settingsRepo := repository.NewSettingsRepository(db.Pool)
	loadMonitorRepo := repository.NewLoadMonitorRepository(db.Pool)
	loadMonitorSvc := service.NewLoadMonitorService(
		settingsRepo, loadMonitorRepo, postRepo, opsStateRepo, db, telegramSvc, telegramSettingsSvc, logger,
	)
	genRepo := repository.NewAIGenerationRepository(db.Pool)
	genJobRepo := repository.NewAIGenerationJobRepository(db.Pool)
	genUploadRepo := repository.NewGenerationSourceUploadRepository(db.Pool)
	generationSvc := service.NewGenerationService(
		nil, nil, genRepo, genJobRepo, genUploadRepo, aiBillingSvc, objectStorage, fileStorageSvc, wsSvc, yandexGptConfigSvc, quotaSvc,
	)
	workflowSvc := service.NewWorkflowService(
		workflowRepo, channelRepo, postSvc, generationSvc, aiBillingSvc, yandexGptConfigSvc, wsSvc, fileStorageSvc, planRepo, quotaSvc, notificationSvc, logger,
	)
	workflowSvc.SetWorkflowConfig(cfg)
	workflowSvc.SetNotifier(notificationSvc)

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	var lastMetricsRun time.Time
	var backupRunning atomic.Bool

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	for {
		select {
		case <-ticker.C:
			if err := db.Ping(ctx); err != nil {
				logger.Warn("worker db ping failed", "error", err)
				continue
			}
			if err := opsDigestSvc.TouchWorkerHeartbeat(ctx); err != nil {
				logger.Warn("ops heartbeat failed", "error", err)
			}
			if err := opsDigestSvc.ProcessDue(ctx); err != nil {
				logger.Warn("ops digest tick failed", "error", err)
			}
			if err := loadMonitorSvc.ProcessSnapshotIfDue(ctx); err != nil {
				logger.Warn("load monitor snapshot failed", "error", err)
			}
			if err := loadMonitorSvc.ProcessDailyReport(ctx); err != nil {
				logger.Warn("load monitor report failed", "error", err)
			}
			if backupRunning.CompareAndSwap(false, true) {
				go func() {
					defer backupRunning.Store(false)
					runCtx, cancel := context.WithTimeout(context.Background(), 90*time.Minute)
					defer cancel()
					if err := backupSvc.Process(runCtx); err != nil {
						logger.Warn("platform backup tick failed", "error", err)
					}
				}()
			}
			if err := renewalSvc.Process(ctx); err != nil {
				logger.Warn("subscription renewal tick failed", "error", err)
			}
			if err := youtubeReconnectNotifier.Process(ctx); err != nil {
				logger.Warn("youtube reconnect notify tick failed", "error", err)
			}
			if err := notificationSvc.ProcessScheduled(ctx); err != nil {
				logger.Warn("notification scheduled tick failed", "error", err)
			}
			if n, err := publicationSvc.ProcessDue(ctx, cfg.WorkerPublishConcurrency); err != nil {
				logger.Warn("post publication tick failed", "error", err, "claimed", n)
			} else if n > 0 {
				logger.Info("processed due posts", "count", n)
			}
			if n, err := fileStorageSvc.PurgeExpiredTrash(ctx); err != nil {
				logger.Warn("purge trash tick failed", "error", err)
			} else if n > 0 {
				logger.Info("purged expired trash files", "count", n)
			}
			if n, err := workflowSvc.ProcessRSSFeeds(ctx); err != nil {
				logger.Warn("workflow rss poll failed", "error", err)
			} else if n > 0 {
				logger.Info("started workflow runs from rss", "count", n)
			}
			if time.Since(lastMetricsRun) >= 15*time.Minute {
				if n, err := metricsCollector.Process(ctx, 50); err != nil {
					logger.Warn("metrics collection tick failed", "error", err)
				} else if n > 0 {
					logger.Info("collected post metrics", "count", n)
				}
				lastMetricsRun = time.Now()
			}
		case <-quit:
			logger.Info("worker stopped")
			return
		}
	}
}
