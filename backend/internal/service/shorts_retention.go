package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/postilka/postilka/internal/repository"
)

type ShortsRetentionService struct {
	repo        *repository.ShortsRepository
	fileStorage *FileStorageService
	logger      *slog.Logger
}

func NewShortsRetentionService(repo *repository.ShortsRepository, fileStorage *FileStorageService, logger *slog.Logger) *ShortsRetentionService {
	return &ShortsRetentionService{repo: repo, fileStorage: fileStorage, logger: logger}
}

// PurgeExpired removes only Shorts source/audio references. Final clips remain
// independent media assets and are deliberately not touched here.
func (s *ShortsRetentionService) PurgeExpired(ctx context.Context, now time.Time) (int, error) {
	items, err := s.repo.ListExpiredProjects(ctx, now)
	if err != nil {
		return 0, err
	}
	removed := 0
	for _, item := range items {
		if item.SourceFileID != nil {
			if err := s.removeFile(ctx, item.WorkspaceID, *item.SourceFileID); err != nil && s.logger != nil {
				s.logger.Warn("shorts source retention cleanup failed", "project_id", item.ID, "error", err)
			}
			_ = s.repo.ClearExpiredSource(ctx, item.ID)
		}
		if item.AudioFileID != nil {
			if err := s.removeFile(ctx, item.WorkspaceID, *item.AudioFileID); err != nil && s.logger != nil {
				s.logger.Warn("shorts audio retention cleanup failed", "project_id", item.ID, "error", err)
			}
			_ = s.repo.ClearExpiredAudio(ctx, item.ID)
		}
		removed++
	}
	return removed, nil
}

func (s *ShortsRetentionService) removeFile(ctx context.Context, workspaceID, fileID string) error {
	if s.fileStorage == nil {
		return nil
	}
	return s.fileStorage.PermanentDeleteWorkspaceFile(ctx, workspaceID, fileID)
}
