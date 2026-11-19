package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrShortsProjectNotFound  = errors.New("shorts project not found")
	ErrShortsSourceRequired   = errors.New("shorts source video is required")
	ErrShortsDurationRequired = errors.New("shorts source duration is required")
	ErrInvalidShortsClip      = errors.New("invalid shorts clip")
)

type ShortsService struct {
	repo        *repository.ShortsRepository
	files       *repository.WorkspaceFileRepository
	fileStorage *FileStorageService
	wsSvc       *WorkspaceService
}

func NewShortsService(repo *repository.ShortsRepository, files *repository.WorkspaceFileRepository, fileStorage *FileStorageService, wsSvc *WorkspaceService) *ShortsService {
	return &ShortsService{repo: repo, files: files, fileStorage: fileStorage, wsSvc: wsSvc}
}

type CreateShortsProjectInput struct {
	SourceFileID          string                  `json:"source_file_id"`
	ContentType           model.ShortsContentType `json:"content_type"`
	Language              string                  `json:"language"`
	SourceDurationSeconds float64                 `json:"source_duration_seconds"`
	ProcessingRange       *ShortsProcessingRange  `json:"processing_range,omitempty"`
	Settings              json.RawMessage         `json:"settings,omitempty"`
}

func (s *ShortsService) CreateProject(ctx context.Context, userID string, r *http.Request, input CreateShortsProjectInput) (*model.ShortsProject, *model.ShortsJob, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, nil, err
	}
	if ws == nil {
		return nil, nil, ErrWorkspaceNotFound
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleEditor); err != nil {
		return nil, nil, err
	}
	if input.SourceFileID == "" {
		return nil, nil, ErrShortsSourceRequired
	}
	if s.files != nil {
		file, fileErr := s.files.GetByID(ctx, ws.ID, input.SourceFileID, false)
		if errors.Is(fileErr, repository.ErrNotFound) {
			return nil, nil, ErrShortsSourceRequired
		}
		if fileErr != nil {
			return nil, nil, fileErr
		}
		if len(file.MimeType) < len("video/") || file.MimeType[:len("video/")] != "video/" {
			return nil, nil, ErrShortsSourceRequired
		}
	}
	if input.SourceDurationSeconds <= 0 {
		return nil, nil, ErrShortsDurationRequired
	}

	selected := ShortsProcessingRange{StartSeconds: 0, EndSeconds: input.SourceDurationSeconds}
	if input.ProcessingRange != nil {
		selected = *input.ProcessingRange
	}
	selected, err = NormalizeShortsRange(selected, input.SourceDurationSeconds)
	if err != nil {
		return nil, nil, err
	}

	contentType := input.ContentType
	if contentType == "" {
		contentType = model.ShortsContentOther
	}
	language := input.Language
	if language == "" {
		language = "ru"
	}
	settings := input.Settings
	if settings == nil {
		settings = json.RawMessage(`{}`)
	}
	sourceExpiresAt := time.Now().UTC().Add(48 * time.Hour)
	project, err := s.repo.CreateProject(ctx, &model.ShortsProject{
		WorkspaceID: ws.ID, CreatedByUserID: userID, SourceFileID: &input.SourceFileID,
		ContentType: contentType, Language: language, Status: model.ShortsProjectAnalyzing,
		SourceDurationSeconds: selected.DurationSeconds(), ProcessingMinutesReserved: selected.DurationSeconds() / 60,
		SourceExpiresAt: &sourceExpiresAt, Settings: settings,
	})
	if err != nil {
		return nil, nil, err
	}
	job, err := s.repo.CreateJob(ctx, project.ID, "analyze")
	if err != nil {
		return nil, nil, err
	}
	return project, job, nil
}

func (s *ShortsService) GetProject(ctx context.Context, userID string, r *http.Request, projectID string) (*model.ShortsProject, []model.ShortsClip, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, nil, err
	}
	if ws == nil {
		return nil, nil, ErrWorkspaceNotFound
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleViewer); err != nil {
		return nil, nil, err
	}
	project, err := s.repo.GetProject(ctx, ws.ID, projectID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, nil, ErrShortsProjectNotFound
	}
	if err != nil {
		return nil, nil, err
	}
	clips, err := s.repo.ListClips(ctx, ws.ID, projectID)
	return project, clips, err
}

func (s *ShortsService) UpdateClip(ctx context.Context, userID string, r *http.Request, clipID string, input model.ShortsClipUpdate) (*model.ShortsClip, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if ws == nil {
		return nil, ErrWorkspaceNotFound
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleEditor); err != nil {
		return nil, err
	}
	project, err := s.repo.GetProjectByClip(ctx, ws.ID, clipID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrShortsProjectNotFound
	}
	if err != nil {
		return nil, err
	}
	if input.StartSeconds < 0 || input.EndSeconds <= input.StartSeconds || input.EndSeconds > project.SourceDurationSeconds || strings.TrimSpace(input.Status) == "" {
		return nil, ErrInvalidShortsClip
	}
	if input.Status != "candidate" && input.Status != "selected" && input.Status != "draft" {
		return nil, ErrInvalidShortsClip
	}
	input.TranscriptText = strings.TrimSpace(input.TranscriptText)
	return s.repo.UpdateClip(ctx, ws.ID, clipID, input)
}

func (s *ShortsService) ListProjects(ctx context.Context, userID string, r *http.Request, limit, offset int) ([]model.ShortsProjectListItem, int, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, 0, err
	}
	if ws == nil {
		return nil, 0, ErrWorkspaceNotFound
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleViewer); err != nil {
		return nil, 0, err
	}
	return s.repo.ListForWorkspace(ctx, ws.ID, limit, offset)
}

func (s *ShortsService) DeleteProject(ctx context.Context, userID string, r *http.Request, projectID string) error {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return err
	}
	if ws == nil {
		return ErrWorkspaceNotFound
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleEditor); err != nil {
		return err
	}
	return s.repo.DeleteProject(ctx, ws.ID, projectID)
}

func (s *ShortsService) AnalyzeProject(ctx context.Context, userID string, r *http.Request, projectID string) (*model.ShortsJob, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if ws == nil {
		return nil, ErrWorkspaceNotFound
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleEditor); err != nil {
		return nil, err
	}
	job, err := s.repo.CreateAnalyzeJob(ctx, ws.ID, projectID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrShortsProjectNotFound
	}
	return job, err
}

func (s *ShortsService) GetJob(ctx context.Context, userID string, r *http.Request, jobID string) (*model.ShortsJob, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if ws == nil {
		return nil, ErrWorkspaceNotFound
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleViewer); err != nil {
		return nil, err
	}
	return s.repo.GetJob(ctx, ws.ID, jobID)
}

func (s *ShortsService) AudioDownloadURL(ctx context.Context, userID string, r *http.Request, projectID string) (string, int, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return "", 0, err
	}
	if ws == nil {
		return "", 0, ErrWorkspaceNotFound
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleViewer); err != nil {
		return "", 0, err
	}
	project, err := s.repo.GetProject(ctx, ws.ID, projectID)
	if errors.Is(err, repository.ErrNotFound) {
		return "", 0, ErrShortsProjectNotFound
	}
	if err != nil {
		return "", 0, err
	}
	if project.AudioFileID == nil || project.AudioExpiresAt == nil || !project.AudioExpiresAt.After(time.Now().UTC()) {
		return "", 0, repository.ErrNotFound
	}
	if s.fileStorage == nil || s.files == nil {
		return "", 0, ErrStorageNotConfigured
	}
	file, err := s.files.GetByID(ctx, ws.ID, *project.AudioFileID, false)
	if errors.Is(err, repository.ErrNotFound) {
		return "", 0, repository.ErrNotFound
	}
	if err != nil {
		return "", 0, err
	}
	url, expiresIn, err := s.fileStorage.DownloadURL(ctx, userID, r, file.ID, false)
	if err != nil {
		return "", 0, err
	}
	return url, expiresIn, nil
}

func (s *ShortsService) DraftDownloadURL(ctx context.Context, userID string, r *http.Request, clipID string) (string, int, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return "", 0, err
	}
	if ws == nil {
		return "", 0, ErrWorkspaceNotFound
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleViewer); err != nil {
		return "", 0, err
	}
	clip, err := s.repo.GetClip(ctx, ws.ID, clipID)
	if errors.Is(err, repository.ErrNotFound) {
		return "", 0, repository.ErrNotFound
	}
	if err != nil {
		return "", 0, err
	}
	if clip.DraftFileID == nil || s.files == nil || s.fileStorage == nil {
		return "", 0, repository.ErrNotFound
	}
	file, err := s.files.GetByID(ctx, ws.ID, *clip.DraftFileID, false)
	if errors.Is(err, repository.ErrNotFound) {
		return "", 0, repository.ErrNotFound
	}
	if err != nil {
		return "", 0, err
	}
	return s.fileStorage.DownloadURL(ctx, userID, r, file.ID, true)
}

func (s *ShortsService) UpdateSubtitleSettings(ctx context.Context, userID string, r *http.Request, projectID string, config ShortsSubtitleConfig) error {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return err
	}
	if ws == nil {
		return ErrWorkspaceNotFound
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleEditor); err != nil {
		return err
	}
	config = NormalizeShortsSubtitleConfig(config)
	return s.repo.SetSubtitleSettings(ctx, ws.ID, projectID, config.Style, config.Position, config.FontSize, config.TextColor, config.Background, config.Watermark, config.SafeZone)
}

func (s *ShortsService) SetClipOrder(ctx context.Context, userID string, r *http.Request, projectID string, clipIDs []string) error {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return err
	}
	if ws == nil {
		return ErrWorkspaceNotFound
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleEditor); err != nil {
		return err
	}
	if len(clipIDs) == 0 || len(clipIDs) > 100 {
		return fmt.Errorf("invalid clip order")
	}
	return s.repo.SetClipOrder(ctx, ws.ID, projectID, clipIDs)
}

func (s *ShortsService) RerenderProject(ctx context.Context, userID string, r *http.Request, projectID string) (*model.ShortsJob, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if ws == nil {
		return nil, ErrWorkspaceNotFound
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleEditor); err != nil {
		return nil, err
	}
	return s.repo.CreateRerenderJob(ctx, ws.ID, projectID)
}
