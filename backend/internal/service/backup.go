package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

const backupTimezone = "Europe/Moscow"

var (
	ErrBackupBusy            = errors.New("backup already running")
	ErrInvalidBackupSettings = errors.New("invalid backup settings")
	ErrBackupStorage         = errors.New("s3 storage is not configured")
)

type BackupService struct {
	repo    *repository.BackupRepository
	storage *ObjectStorage
	cfg     *config.Config
	logger  *slog.Logger

	mu sync.Mutex
}

func NewBackupService(
	repo *repository.BackupRepository,
	storage *ObjectStorage,
	cfg *config.Config,
	logger *slog.Logger,
) *BackupService {
	if logger == nil {
		logger = slog.Default()
	}
	return &BackupService{repo: repo, storage: storage, cfg: cfg, logger: logger}
}

func (s *BackupService) GetAdminView(ctx context.Context) (*model.BackupAdminView, error) {
	settings, err := s.getSettings(ctx)
	if err != nil {
		return nil, err
	}
	runs, err := s.repo.ListRuns(ctx, 20)
	if err != nil {
		return nil, err
	}
	if runs == nil {
		runs = []model.BackupRun{}
	}
	st, err := s.storage.settings.GetEffective(ctx)
	storageReady := err == nil && StorageConfigured(st)
	return &model.BackupAdminView{
		Settings:     *settings,
		StorageReady: storageReady,
		RestoreHint:  "cd /opt/postilka && bash scripts/restore-full.sh --latest",
		Runs:         runs,
		Timezone:     backupTimezone,
	}, nil
}

func (s *BackupService) UpdateSettings(ctx context.Context, req model.BackupSettingsUpdateRequest) (*model.BackupAdminView, error) {
	if err := validateBackupSettings(req); err != nil {
		return nil, err
	}
	cur, err := s.getSettings(ctx)
	if err != nil {
		return nil, err
	}
	cur.Enabled = req.Enabled
	cur.Frequency = req.Frequency
	cur.Hour = req.Hour
	cur.Minute = req.Minute
	cur.Weekday = req.Weekday
	cur.RetainCount = req.RetainCount
	next := nextBackupRunAt(*cur, time.Now())
	cur.NextRunAt = next
	if _, err := s.repo.UpdateSettings(ctx, *cur); err != nil {
		return nil, err
	}
	return s.GetAdminView(ctx)
}

func (s *BackupService) EnqueueManual(ctx context.Context) (*model.BackupRun, error) {
	st, err := s.storage.settings.GetEffective(ctx)
	if err != nil {
		return nil, err
	}
	if !StorageConfigured(st) {
		return nil, ErrBackupStorage
	}
	active, err := s.repo.HasActiveRun(ctx)
	if err != nil {
		return nil, err
	}
	if active {
		return nil, ErrBackupBusy
	}
	return s.repo.InsertRun(ctx, model.BackupTriggerManual)
}

func (s *BackupService) Process(ctx context.Context) error {
	if err := s.repo.FailStuckRuns(ctx, 2*time.Hour); err != nil {
		s.logger.Warn("backup fail stuck runs", "error", err)
	}
	if err := s.enqueueScheduleIfDue(ctx); err != nil {
		s.logger.Warn("backup schedule enqueue", "error", err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	run, err := s.repo.ClaimNextQueued(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil
		}
		return err
	}
	s.logger.Info("platform backup started", "id", run.ID, "trigger", run.Trigger)
	result, runErr := s.buildAndStore(ctx)
	status := model.BackupRunSucceeded
	errMsg := ""
	s3Key := ""
	localName := ""
	var size int64
	media := 0
	if result != nil {
		s3Key = result.S3Key
		localName = result.LocalName
		size = result.SizeBytes
		media = result.MediaFiles
	}
	if runErr != nil {
		status = model.BackupRunFailed
		errMsg = runErr.Error()
		s.logger.Error("platform backup failed", "id", run.ID, "error", runErr)
	} else {
		s.logger.Info("platform backup finished", "id", run.ID, "s3_key", s3Key, "bytes", size)
	}
	return s.repo.FinishRun(ctx, run.ID, status, s3Key, localName, errMsg, size, media)
}

func (s *BackupService) PresignDownload(ctx context.Context, runID string) (string, error) {
	run, err := s.repo.GetRun(ctx, runID)
	if err != nil {
		return "", err
	}
	if run.Status != model.BackupRunSucceeded || strings.TrimSpace(run.S3Key) == "" {
		return "", fmt.Errorf("бекап ещё не загружен в S3")
	}
	return s.storage.PresignGet(ctx, run.S3Key, 15*time.Minute, run.LocalName)
}

func (s *BackupService) getSettings(ctx context.Context) (*model.BackupSettings, error) {
	srec, err := s.repo.GetSettings(ctx)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			def := model.DefaultBackupSettings()
			return &def, nil
		}
		return nil, err
	}
	return srec, nil
}

func (s *BackupService) enqueueScheduleIfDue(ctx context.Context) error {
	settings, err := s.getSettings(ctx)
	if err != nil {
		return err
	}
	if !settings.Enabled || settings.NextRunAt == nil || settings.NextRunAt.After(time.Now()) {
		return nil
	}
	st, err := s.storage.settings.GetEffective(ctx)
	if err != nil || !StorageConfigured(st) {
		return nil
	}
	active, err := s.repo.HasActiveRun(ctx)
	if err != nil {
		return err
	}
	if active {
		return nil
	}
	if _, err := s.repo.InsertRun(ctx, model.BackupTriggerSchedule); err != nil {
		return err
	}
	next := nextBackupRunAt(*settings, time.Now().Add(time.Minute))
	settings.NextRunAt = next
	_, err = s.repo.UpdateSettings(ctx, *settings)
	return err
}

func validateBackupSettings(req model.BackupSettingsUpdateRequest) error {
	if req.Frequency != model.BackupFrequencyDaily && req.Frequency != model.BackupFrequencyWeekly {
		return fmt.Errorf("%w: frequency", ErrInvalidBackupSettings)
	}
	if req.Hour < 0 || req.Hour > 23 || req.Minute < 0 || req.Minute > 59 {
		return fmt.Errorf("%w: time", ErrInvalidBackupSettings)
	}
	if req.Weekday < 0 || req.Weekday > 6 {
		return fmt.Errorf("%w: weekday", ErrInvalidBackupSettings)
	}
	if req.RetainCount < 1 || req.RetainCount > 90 {
		return fmt.Errorf("%w: retain_count", ErrInvalidBackupSettings)
	}
	return nil
}

func nextBackupRunAt(s model.BackupSettings, from time.Time) *time.Time {
	loc, err := time.LoadLocation(backupTimezone)
	if err != nil {
		loc = time.FixedZone("MSK", 3*60*60)
	}
	now := from.In(loc)
	candidate := time.Date(now.Year(), now.Month(), now.Day(), s.Hour, s.Minute, 0, 0, loc)
	if !candidate.After(now) {
		candidate = candidate.Add(24 * time.Hour)
	}
	if s.Frequency == model.BackupFrequencyWeekly {
		for candidate.Weekday() != time.Weekday(s.Weekday) {
			candidate = candidate.Add(24 * time.Hour)
		}
	}
	utc := candidate.UTC()
	return &utc
}

func (s *BackupService) backupDir() string {
	if d := strings.TrimSpace(os.Getenv("BACKUP_DIR")); d != "" {
		return d
	}
	return "/var/lib/postilka/backups"
}

func (s *BackupService) backupSrcDir() string {
	if d := strings.TrimSpace(os.Getenv("BACKUP_SRC_DIR")); d != "" {
		return d
	}
	return "/var/lib/postilka/src"
}
