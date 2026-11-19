package service

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrShortsProjectNotFound  = errors.New("shorts project not found")
	ErrShortsSourceRequired   = errors.New("shorts source video is required")
	ErrShortsDurationRequired = errors.New("shorts source duration is required")
)

type ShortsService struct {
	repo  *repository.ShortsRepository
	files *repository.WorkspaceFileRepository
	wsSvc *WorkspaceService
}

func NewShortsService(repo *repository.ShortsRepository, files *repository.WorkspaceFileRepository, wsSvc *WorkspaceService) *ShortsService {
	return &ShortsService{repo: repo, files: files, wsSvc: wsSvc}
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
