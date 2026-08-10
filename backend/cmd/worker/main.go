package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"strings"
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
	channelTestSvc := service.NewChannelTestService(
		channelRepo, userRepo, telegramBotClient, youtubeAPIClient, socialProviderSettingsSvc, wsSvc, secretCipher,
	)
	postRepo := repository.NewPostRepository(db.Pool)
	usageRepo := repository.NewUsageRepository(db.Pool)
	quotaSvc := service.NewQuotaService(planRepo, wsRepo, subscriptionRepo, usageRepo, channelRepo)
	linkCodeRepo := repository.NewLinkCodeRepository(db.Pool)
	linkShortener := service.NewLinkShortenerService(linkCodeRepo, cfg.LinkBaseURL)
	publicationSvc := service.NewPublicationService(
		postRepo, channelRepo, fileStorageRepo, objectStorage, channelTestSvc, telegramBotClient, quotaSvc, linkShortener,
	)
	logger.Info("worker started", "publish_concurrency", cfg.WorkerPublishConcurrency, "version", config.Version)

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	for {
		select {
		case <-ticker.C:
			if err := db.Ping(ctx); err != nil {
				logger.Warn("worker db ping failed", "error", err)
				continue
			}
			if err := renewalSvc.Process(ctx); err != nil {
				logger.Warn("subscription renewal tick failed", "error", err)
			}
			if err := youtubeReconnectNotifier.Process(ctx); err != nil {
				logger.Warn("youtube reconnect notify tick failed", "error", err)
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
		case <-quit:
			logger.Info("worker stopped")
			return
		}
	}
}
