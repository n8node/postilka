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
	ErrShortsProjectNotFound     = errors.New("shorts project not found")
	ErrShortsSourceRequired      = errors.New("shorts source video is required")
	ErrShortsDurationRequired    = errors.New("shorts source duration is required")
	ErrShortsProjectNameRequired = errors.New("shorts project name is required")
	ErrInvalidShortsClip         = errors.New("invalid shorts clip")
)

type ShortsService struct {
	repo        *repository.ShortsRepository
	files       *repository.WorkspaceFileRepository
	fileStorage *FileStorageService
	wsSvc       *WorkspaceService
	aiBilling   *AIBillingService
	kieConfig   *KieConfigService
}

func (s *ShortsService) SetAIBilling(billing *AIBillingService) { s.aiBilling = billing }
func (s *ShortsService) SetKieConfig(config *KieConfigService)  { s.kieConfig = config }

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
	ProjectName           string                  `json:"project_name,omitempty"`
}

func (s *ShortsService) CreateProject(ctx context.Context, userID string, r *http.Request, input CreateShortsProjectInput) (*model.ShortsProject, *model.ShortsJob, error) {
	if strings.TrimSpace(input.ProjectName) == "" {
		return nil, nil, ErrShortsProjectNameRequired
	}
	input.ProjectName = strings.TrimSpace(input.ProjectName)
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
	if source, found, lookupErr := s.repo.GetAnalysisForFile(ctx, ws.ID, input.SourceFileID); lookupErr != nil {
		return nil, nil, lookupErr
	} else if found {
		selected := ShortsProcessingRange{StartSeconds: 0, EndSeconds: input.SourceDurationSeconds}
		if input.ProcessingRange != nil {
			selected = *input.ProcessingRange
		}
		selected, err = NormalizeShortsRange(selected, input.SourceDurationSeconds)
		if err != nil {
			return nil, nil, err
		}
		if err := s.repo.UpdateSourceProcessingRange(ctx, ws.ID, source.ID, selected.StartSeconds, selected.EndSeconds); err != nil {
			return nil, nil, err
		}
		settings := source.Settings
		if settings == nil {
			settings = json.RawMessage(`{}`)
		}
		var settingsMap map[string]any
		if err := json.Unmarshal(settings, &settingsMap); err != nil {
			settingsMap = map[string]any{}
		}
		settingsMap["processing_start_seconds"] = selected.StartSeconds
		settingsMap["processing_end_seconds"] = selected.EndSeconds
		settingsMap["project_name"] = input.ProjectName
		source.Settings, _ = json.Marshal(settingsMap)
		source.SourceDurationSeconds = selected.DurationSeconds()
		edit, editErr := s.repo.GetEditProjectForSource(ctx, ws.ID, source.ID)
		if errors.Is(editErr, repository.ErrNotFound) {
			edit, editErr = s.repo.CreateEditProject(ctx, ws.ID, userID, source.ID, input.ProjectName)
		}
		if editErr != nil {
			return nil, nil, editErr
		}
		if edit.Name == "" || edit.Name == "Montage 1" {
			_ = s.repo.RenameEditProject(ctx, ws.ID, edit.ID, input.ProjectName)
			edit.Name = input.ProjectName
		}
		job, jobErr := s.repo.CreateSourceJob(ctx, ws.ID, source.ID, "analyze")
		if jobErr != nil {
			return nil, nil, jobErr
		}
		return edit, job, nil
	}

	selected := ShortsProcessingRange{StartSeconds: 0, EndSeconds: input.SourceDurationSeconds}
	if input.ProcessingRange != nil {
		selected = *input.ProcessingRange
	}
	selected, err = NormalizeShortsRange(selected, input.SourceDurationSeconds)
	if err != nil {
		return nil, nil, err
	}
	if s.aiBilling != nil && s.kieConfig != nil {
		kieSettings, settingsErr := s.kieConfig.GetSettings(ctx)
		if settingsErr != nil {
			return nil, nil, settingsErr
		}
		if kieSettings.TranscriptionEnabled {
			if err := s.aiBilling.PrefailTranscriptionWithPrice(ctx, ws.ID, userID, kieSettings.TranscriptionCreditsPerSecond, selected.DurationSeconds(), kieSettings.TranscriptionKopecksPerCredit); err != nil {
				return nil, nil, err
			}
		}
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
	var settingsMap map[string]any
	if err := json.Unmarshal(settings, &settingsMap); err != nil {
		settingsMap = map[string]any{}
	}
	settingsMap["processing_start_seconds"] = selected.StartSeconds
	settingsMap["processing_end_seconds"] = selected.EndSeconds
	settingsMap["project_name"] = input.ProjectName
	settings, _ = json.Marshal(settingsMap)
	sourceExpiresAt := time.Now().UTC().Add(48 * time.Hour)
	source, err := s.repo.CreateSource(ctx, &model.ShortsProject{
		WorkspaceID: ws.ID, CreatedByUserID: userID, SourceFileID: &input.SourceFileID,
		ContentType: contentType, Language: language, Status: model.ShortsProjectAnalyzing,
		SourceDurationSeconds: selected.DurationSeconds(), ProcessingMinutesReserved: selected.DurationSeconds() / 60,
		SourceExpiresAt: &sourceExpiresAt, Settings: settings,
	})
	if err != nil {
		return nil, nil, err
	}
	job, err := s.repo.CreateJob(ctx, source.ID, "analyze")
	if err != nil {
		return nil, nil, err
	}
	edit, err := s.repo.CreateEditProject(ctx, ws.ID, userID, source.ID, input.ProjectName)
	if err != nil {
		return nil, nil, err
	}
	return edit, job, nil
}

func (s *ShortsService) CreateSourceProject(ctx context.Context, userID string, r *http.Request, input CreateShortsProjectInput) (*model.ShortsProject, *model.ShortsJob, error) {
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
		if !strings.HasPrefix(file.MimeType, "video/") {
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
	if s.aiBilling != nil && s.kieConfig != nil {
		config, configErr := s.kieConfig.GetSettings(ctx)
		if configErr != nil {
			return nil, nil, configErr
		}
		if config.TranscriptionEnabled {
			if err := s.aiBilling.PrefailTranscriptionWithPrice(ctx, ws.ID, userID, config.TranscriptionCreditsPerSecond, selected.DurationSeconds(), config.TranscriptionKopecksPerCredit); err != nil {
				return nil, nil, err
			}
		}
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
	var sourceSettings map[string]any
	if err := json.Unmarshal(settings, &sourceSettings); err != nil {
		sourceSettings = map[string]any{}
	}
	sourceSettings["processing_start_seconds"] = selected.StartSeconds
	sourceSettings["processing_end_seconds"] = selected.EndSeconds
	settings, _ = json.Marshal(sourceSettings)
	expires := time.Now().UTC().Add(48 * time.Hour)
	source, err := s.repo.CreateSource(ctx, &model.ShortsProject{WorkspaceID: ws.ID, CreatedByUserID: userID, SourceFileID: &input.SourceFileID, ContentType: contentType, Language: language, Status: model.ShortsProjectAnalyzing, SourceDurationSeconds: selected.DurationSeconds(), ProcessingMinutesReserved: selected.DurationSeconds() / 60, SourceExpiresAt: &expires, Settings: settings})
	if err != nil {
		return nil, nil, err
	}
	job, err := s.repo.CreateJob(ctx, source.ID, "analyze")
	if err != nil {
		return nil, nil, err
	}
	if err := s.repo.CreateLegacyProject(ctx, source.ID); err != nil {
		return nil, nil, err
	}
	return source, job, nil
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
	project, err := s.repo.GetEditProject(ctx, ws.ID, projectID)
	if errors.Is(err, repository.ErrNotFound) {
		project, err = s.repo.GetProject(ctx, ws.ID, projectID)
	}
	if errors.Is(err, repository.ErrNotFound) {
		project, err = s.repo.GetSource(ctx, ws.ID, projectID)
	}
	if errors.Is(err, repository.ErrNotFound) {
		return nil, nil, ErrShortsProjectNotFound
	}
	if err != nil {
		return nil, nil, err
	}
	if project.IsEditProject {
		if err := s.repo.EnsureEditProjectClips(ctx, ws.ID, projectID); err != nil {
			return nil, nil, err
		}
	}
	clips, err := s.repo.ListClips(ctx, ws.ID, projectID)
	return project, clips, err
}

func (s *ShortsService) GetSource(ctx context.Context, userID string, r *http.Request, sourceID string) (*model.ShortsProject, []model.ShortsClip, error) {
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
	source, err := s.repo.GetSource(ctx, ws.ID, sourceID)
	if err != nil {
		return nil, nil, err
	}
	clips, err := s.repo.ListClips(ctx, ws.ID, sourceID)
	return source, clips, err
}

func (s *ShortsService) DeleteClip(ctx context.Context, userID string, r *http.Request, editProjectID, clipID string) error {
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
	if err := s.repo.DeleteClip(ctx, ws.ID, editProjectID, clipID); errors.Is(err, repository.ErrNotFound) {
		return ErrShortsProjectNotFound
	} else {
		return err
	}
}

func (s *ShortsService) UpdateClip(ctx context.Context, userID string, r *http.Request, editProjectID, clipID string, input model.ShortsClipUpdate) (*model.ShortsClip, error) {
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
	project, err := s.repo.GetEditProject(ctx, ws.ID, editProjectID)
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
	return s.repo.UpdateClip(ctx, ws.ID, editProjectID, clipID, input)
}

func (s *ShortsService) ListEditProjectsForSource(ctx context.Context, userID string, r *http.Request, sourceID string) ([]model.ShortsProject, error) {
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
	return s.repo.ListEditProjectsForSource(ctx, ws.ID, sourceID)
}

func (s *ShortsService) ListSources(ctx context.Context, userID string, r *http.Request) ([]model.ShortsProject, error) {
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
	return s.repo.ListSourcesForWorkspace(ctx, ws.ID)
}

func (s *ShortsService) GetAnalysisForFile(ctx context.Context, userID string, r *http.Request, fileID string) (*model.ShortsProject, bool, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, false, err
	}
	if ws == nil {
		return nil, false, ErrWorkspaceNotFound
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, ws.ID, model.RoleViewer); err != nil {
		return nil, false, err
	}
	return s.repo.GetAnalysisForFile(ctx, ws.ID, fileID)
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
	return s.repo.ListShortsWorkspaceAll(ctx, ws.ID, limit, offset)
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

func (s *ShortsService) CreateEditProject(ctx context.Context, userID string, r *http.Request, sourceID, name string) (*model.ShortsProject, error) {
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
	if _, err := s.repo.GetSource(ctx, ws.ID, sourceID); err != nil {
		return nil, err
	}
	return s.repo.CreateEditProject(ctx, ws.ID, userID, sourceID, name)
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
	job, err := s.repo.CreateSourceJob(ctx, ws.ID, projectID, "analyze")
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrShortsProjectNotFound
	}
	return job, err
}

func (s *ShortsService) CancelJob(ctx context.Context, userID string, r *http.Request, jobID string) (*model.ShortsJob, error) {
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
	job, err := s.repo.CancelJob(ctx, ws.ID, jobID, "Обработка остановлена пользователем")
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

func (s *ShortsService) TranscriptResult(ctx context.Context, userID string, r *http.Request, projectID string) ([]byte, error) {
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
	project, err := s.repo.GetProject(ctx, ws.ID, projectID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrShortsProjectNotFound
	}
	if err != nil {
		return nil, err
	}
	var settings struct {
		TranscriptResult json.RawMessage `json:"transcript_result"`
	}
	if err := json.Unmarshal(project.Settings, &settings); err != nil {
		return nil, err
	}
	if len(settings.TranscriptResult) == 0 {
		return nil, repository.ErrNotFound
	}
	return settings.TranscriptResult, nil
}

func (s *ShortsService) DraftDownloadURL(ctx context.Context, userID string, r *http.Request, clipID string) (string, int, error) {
	return s.DraftDownloadURLForEdit(ctx, userID, r, "", clipID)
}

func (s *ShortsService) GetEditClip(ctx context.Context, userID string, r *http.Request, editProjectID, clipID string) (*model.ShortsClip, error) {
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
	return s.repo.GetEditClip(ctx, ws.ID, editProjectID, clipID)
}

func (s *ShortsService) DraftDownloadURLForEdit(ctx context.Context, userID string, r *http.Request, editProjectID, clipID string) (string, int, error) {
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
	var clip *model.ShortsClip
	if editProjectID != "" {
		clip, err = s.repo.GetEditClip(ctx, ws.ID, editProjectID, clipID)
	} else {
		clip, err = s.repo.GetClip(ctx, ws.ID, clipID)
	}
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

func (s *ShortsService) AddClipToEditProject(ctx context.Context, userID string, r *http.Request, editProjectID, clipID string) error {
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
	if _, err := s.repo.GetEditProject(ctx, ws.ID, editProjectID); err != nil {
		return err
	}
	return s.repo.AddClipToEditProject(ctx, ws.ID, editProjectID, clipID)
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
	if len(clipIDs) > 100 {
		return fmt.Errorf("invalid clip order")
	}
	if len(clipIDs) == 0 {
		return s.repo.SetClipOrder(ctx, ws.ID, projectID, clipIDs)
	}
	if _, err := s.repo.GetEditProject(ctx, ws.ID, projectID); err != nil {
		return err
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
	if _, err := s.repo.GetEditProject(ctx, ws.ID, projectID); err != nil {
		return nil, err
	}
	return s.repo.CreateRerenderJob(ctx, ws.ID, projectID)
}

func (s *ShortsService) ExportProject(ctx context.Context, userID string, r *http.Request, projectID string) (*model.ShortsJob, error) {
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
	if _, err := s.repo.GetEditProject(ctx, ws.ID, projectID); err != nil {
		return nil, err
	}
	return s.repo.CreateExportJob(ctx, ws.ID, projectID)
}

func (s *ShortsService) FinalDownloadURL(ctx context.Context, userID string, r *http.Request, projectID string) (string, int, error) {
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
	finalFileID, err := s.repo.GetFinalFileID(ctx, ws.ID, projectID)
	if err != nil {
		return "", 0, err
	}
	file, err := s.files.GetByID(ctx, ws.ID, finalFileID, false)
	if err != nil {
		return "", 0, err
	}
	return s.fileStorage.DownloadURL(ctx, userID, r, file.ID, true)
}
