package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

func main() {
	dir := flag.String("dir", envOr("TRENDS_IMPORT_DIR", "/data/trends-import/images"), "folder with image trend JSON and kie-source files")
	dryRun := flag.Bool("dry-run", false, "report without uploading media or updating template media keys")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		fail("load config: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Minute)
	defer cancel()
	db, err := repository.NewPostgres(ctx, cfg.DatabaseURL, cfg.DatabaseMaxConns)
	if err != nil {
		fail("connect postgres: %v", err)
	}
	defer db.Close()
	settingsRepo := repository.NewStorageSettingsRepository(db.Pool)
	providersRepo := repository.NewStorageProvidersRepository(db.Pool)
	settingsSvc := service.NewStorageSettingsService(settingsRepo, providersRepo, cfg)
	store := service.NewObjectStorage(settingsSvc)
	svc := service.NewAdStudioService(repository.NewAdStudioRepository(db.Pool), nil, repository.NewSettingsRepository(db.Pool), nil, store)
	result, err := svc.RestoreExistingImageTrendMedia(ctx, *dir, *dryRun)
	if err != nil {
		fail("restore: %v", err)
	}
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	_ = enc.Encode(result)
	if result.Failed > 0 {
		os.Exit(1)
	}
}

func envOr(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}
func fail(format string, args ...any) { fmt.Fprintf(os.Stderr, format+"\n", args...); os.Exit(1) }
