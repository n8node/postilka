package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

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

	// Инициализация необходимых репозиториев и сервисов для генерации
	storageSettingsRepo := repository.NewStorageSettingsRepository(db.Pool)
	storageSettingsSvc := service.NewStorageSettingsService(storageSettingsRepo, cfg)
	objectStorage := service.NewObjectStorage(storageSettingsSvc)

	// Сервисы для AI-генерации
	kieSettingsRepo := repository.NewKieSettingsRepository(db.Pool)
	kieConfigSvc := service.NewKieConfigService(kieSettingsRepo, cfg, nil)
	kieVideoSettingsRepo := repository.NewKieVideoSettingsRepository(db.Pool)
	kieVideoConfigSvc := service.NewKieVideoConfigService(kieVideoSettingsRepo, cfg, nil)
	yandexGptConfigRepo := repository.NewYandexGptConfigRepository(db.Pool)
	yandexGptConfigSvc := service.NewYandexGptConfigService(yandexGptConfigRepo, cfg, nil)

	// Сервисы для работы с генерацией
	genRepo := repository.NewAIGenerationRepository(db.Pool)
	genJobRepo := repository.NewAIGenerationJobRepository(db.Pool)
	genUploadRepo := repository.NewGenerationSourceUploadRepository(db.Pool)
	aiBillingSvc := service.NewAIBillingService(nil, nil, nil, kieSettingsRepo)
	fileStorageRepo := repository.NewWorkspaceFileRepository(db.Pool)
	folderStorageRepo := repository.NewWorkspaceFolderRepository(db.Pool)
	wsRepo := repository.NewWorkspaceRepository(db.Pool)
	planRepo := repository.NewPlanRepository(db.Pool)
	wsSvc := service.NewWorkspaceService(wsRepo, planRepo)
	uploadFileSettingsRepo := repository.NewUploadFileSettingsRepository(db.Pool)
	uploadFileSettingsSvc := service.NewUploadFileSettingsService(uploadFileSettingsRepo)
	uploadSessions := service.NewUploadSessionService(cfg.JWTSecret)
	fileStorageSvc := service.NewFileStorageService(
		fileStorageRepo, folderStorageRepo, wsRepo, planRepo, wsSvc, objectStorage, uploadSessions, uploadFileSettingsSvc,
	)

	// Сервис генерации
	generationSvc := service.NewGenerationService(
		kieConfigSvc, kieVideoConfigSvc, genRepo, genJobRepo, genUploadRepo, aiBillingSvc, objectStorage, fileStorageSvc, wsSvc, yandexGptConfigSvc, nil,
	)

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
