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
	dir := flag.String("dir", envOr("TRENDS_IMPORT_DIR", "/data/trends-import"), "folder with Syntx image JSON and postilka-preview/")
	dryRun := flag.Bool("dry-run", false, "parse and report without writing templates")
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

	storageSettingsRepo := repository.NewStorageSettingsRepository(db.Pool)
	storageSettingsSvc := service.NewStorageSettingsService(storageSettingsRepo, cfg)
	objectStorage := service.NewObjectStorage(storageSettingsSvc)
	adStudioRepo := repository.NewAdStudioRepository(db.Pool)
	settingsRepo := repository.NewSettingsRepository(db.Pool)
	adStudioSvc := service.NewAdStudioService(adStudioRepo, nil, settingsRepo, nil, objectStorage)

	result, err := adStudioSvc.ImportUnpublishedImageTrends(ctx, *dir, *dryRun)
	if err != nil {
		fail("import: %v", err)
	}

	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(result); err != nil {
		fail("encode result: %v", err)
	}
	if result.Failed > 0 {
		os.Exit(1)
	}
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func fail(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
