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

	// Инициализация необходимых репозиториев и сервисов для бэкапов
	backupRepo := repository.NewBackupRepository(db.Pool)
	storageSettingsRepo := repository.NewStorageSettingsRepository(db.Pool)
	storageSettingsSvc := service.NewStorageSettingsService(storageSettingsRepo, cfg)
	objectStorage := service.NewObjectStorage(storageSettingsSvc)

	// Сервис бэкапов
	backupSvc := service.NewBackupService(backupRepo, objectStorage, cfg, logger)

	logger.Info("backup worker started",
		"version", config.Version,
	)

	workerCtx, workerCancel := context.WithCancel(ctx)
	defer workerCancel()

	// Запуск основного цикла бэкапов
	go func() {
		ticker := time.NewTicker(1 * time.Hour) // Бэкапы раз в час
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				if err := db.Ping(ctx); err != nil {
					logger.Warn("backup worker db ping failed", "error", err)
					continue
				}

				// Выполнение бэкапа
				runCtx, cancel := context.WithTimeout(context.Background(), 90*time.Minute)
				defer cancel()
				if err := backupSvc.Process(runCtx); err != nil {
					logger.Warn("platform backup failed", "error", err)
				} else {
					logger.Info("platform backup completed successfully")
				}
			case <-workerCtx.Done():
				logger.Info("backup worker main loop stopped")
				return
			}
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	<-quit
	logger.Info("backup worker stopped")
}
