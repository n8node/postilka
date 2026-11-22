package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

type ShortsWorker struct {
	repo        *repository.ShortsRepository
	files       *repository.WorkspaceFileRepository
	storage     *ObjectStorage
	fileStore   *FileStorageService
	transcriber ShortsTranscriber
	aiBilling   *AIBillingService
	kieConfig   *KieConfigService
	notify      *NotificationService
	owner       string
}

func (w *ShortsWorker) SetAIBilling(billing *AIBillingService, config *KieConfigService) {
	w.aiBilling, w.kieConfig = billing, config
}

func (w *ShortsWorker) SetNotifier(notify *NotificationService) {
	w.notify = notify
}

func (w *ShortsWorker) notifyCompleted(ctx context.Context, job repository.ClaimedShortsJob) {
	if w.notify == nil || strings.TrimSpace(job.CreatedByUserID) == "" {
		return
	}
	clips, err := w.repo.CountCandidateClips(ctx, job.WorkspaceID, job.SourceID)
	if err != nil {
		return
	}
	w.notify.NotifyShortsDone(ctx, job.CreatedByUserID, job.WorkspaceID, job.ID, job.ProjectID, job.ProjectName, clips)
}

func NewShortsWorker(repo *repository.ShortsRepository, files *repository.WorkspaceFileRepository, storage *ObjectStorage, fileStore *FileStorageService, transcriber ShortsTranscriber, owner string) *ShortsWorker {
	return &ShortsWorker{repo: repo, files: files, storage: storage, fileStore: fileStore, transcriber: transcriber, owner: owner}
}

func (w *ShortsWorker) ProcessDue(ctx context.Context, limit int) (int, error) {
	if w.repo == nil || w.files == nil || w.storage == nil || w.fileStore == nil || w.transcriber == nil {
		return 0, fmt.Errorf("shorts worker dependencies are not configured")
	}
	jobs, err := w.repo.ClaimDueJobs(ctx, w.owner, limit, 15*time.Minute)
	if err != nil {
		return 0, err
	}
	var lastErr error
	for _, job := range jobs {
		if err := w.process(ctx, job); err != nil {
			err = fmt.Errorf("shorts job %s (%s): %w", job.ID, job.JobType, err)
			lastErr = err
			_ = w.repo.FailJob(ctx, job.ID, w.owner, err.Error(), time.Now().UTC().Add(time.Minute))
		}
	}
	return len(jobs), lastErr
}

func (w *ShortsWorker) process(ctx context.Context, job repository.ClaimedShortsJob) error {
	legacy := strings.HasPrefix(job.JobType, "legacy_")
	if legacy {
		job.JobType = strings.TrimPrefix(job.JobType, "legacy_")
	}
	if job.JobType == "rerender" {
		if legacy {
			return w.processLegacyRerender(ctx, job)
		}
		return w.processEditRerender(ctx, job)
	}
	if job.JobType == "export" {
		if legacy {
			return w.processLegacyExport(ctx, job)
		}
		return w.processEditExport(ctx, job)
	}
	if job.JobType != "analyze" {
		return fmt.Errorf("unsupported shorts job type %q", job.JobType)
	}
	project, err := w.repo.GetSource(ctx, job.WorkspaceID, job.SourceID)
	if err != nil {
		return err
	}
	legacyProject, err := w.repo.GetProject(ctx, job.WorkspaceID, job.SourceID)
	if err != nil {
		return err
	}
	job.ProjectID = job.SourceID
	if err := w.repo.UpdateJobProgress(ctx, job.ID, w.owner, "loading_project", 3); err != nil {
		return fmt.Errorf("stage loading_project: %w", err)
	}
	if project.AudioFileID != nil && project.AudioExpiresAt != nil && project.AudioExpiresAt.After(time.Now().UTC()) {
		if err := w.repo.CompleteJob(ctx, job.ID, w.owner, job.SourceID, job.WorkspaceID, model.ShortsProjectCompleted, "completed"); err != nil {
			return err
		}
		w.notifyCompleted(ctx, job)
		return nil
	}
	if project.SourceFileID == nil {
		return ErrShortsSourceRequired
	}
	file, err := w.files.GetByID(ctx, job.WorkspaceID, *project.SourceFileID, false)
	if err != nil {
		return err
	}
	if !ValidateShortsVideoFile(file.MimeType) {
		return ErrShortsSourceRequired
	}
	if err := w.repo.UpdateJobProgress(ctx, job.ID, w.owner, "download_source", 10); err != nil {
		return fmt.Errorf("stage download_source: %w", err)
	}

	sourcePath, err := w.downloadObject(ctx, file.S3Key, filepath.Ext(file.Name))
	if err != nil {
		return fmt.Errorf("stage download_source: %w", err)
	}
	defer os.Remove(sourcePath)
	videoDuration, err := probeShortsDuration(ctx, sourcePath)
	if err != nil {
		return fmt.Errorf("stage probe_duration: %w", err)
	}
	processingStart, processingEnd := shortsProcessingRangeFromSettings(project.Settings, videoDuration)
	processingDuration := processingEnd - processingStart
	if err := w.repo.UpdateJobProgress(ctx, job.ID, w.owner, "extract_audio", 35); err != nil {
		return fmt.Errorf("stage extract_audio: %w", err)
	}
	audioPath, err := ExtractShortsAudioRange(ctx, sourcePath, processingStart, processingDuration)
	if err != nil {
		return fmt.Errorf("stage extract_audio: %w", err)
	}
	defer os.Remove(audioPath)
	if err := w.repo.UpdateJobProgress(ctx, job.ID, w.owner, "transcribe", 55); err != nil {
		return fmt.Errorf("stage transcribe: %w", err)
	}
	transcript, err := w.transcriber.Transcribe(ctx, audioPath)
	if err != nil {
		return fmt.Errorf("stage transcribe: %w", err)
	}
	if w.aiBilling != nil && w.kieConfig != nil {
		if err := w.repo.UpdateJobProgress(ctx, job.ID, w.owner, "billing_transcription", 65); err != nil {
			return fmt.Errorf("stage billing_transcription: %w", err)
		}
		kieSettings, settingsErr := w.kieConfig.GetSettings(ctx)
		if settingsErr != nil {
			return fmt.Errorf("stage billing_transcription: %w", settingsErr)
		}
		if kieSettings.TranscriptionEnabled {
			if _, debitErr := w.aiBilling.DebitTranscriptionAfterSuccessWithPrice(ctx, job.WorkspaceID, project.CreatedByUserID, job.ID, kieSettings.TranscriptionCreditsPerSecond, processingDuration, kieSettings.TranscriptionKopecksPerCredit); debitErr != nil {
				return fmt.Errorf("stage billing_transcription: %w", debitErr)
			}
		}
	}
	audioInfo, err := os.Stat(audioPath)
	if err != nil {
		return fmt.Errorf("stage save_audio: %w", err)
	}
	key := fmt.Sprintf("workspaces/%s/shorts/%s/audio.mp3", job.WorkspaceID, project.ID)
	if err := w.storage.PutObjectFromFile(ctx, key, "audio/mpeg", audioPath); err != nil {
		return fmt.Errorf("stage save_audio: %w", err)
	}
	meta, _ := json.Marshal(map[string]any{"source": "shorts_audio", "project_id": project.ID, "duration_seconds": processingDuration, "processing_start_seconds": processingStart, "processing_end_seconds": processingEnd, "transcript": transcript})
	uid := project.CreatedByUserID
	audioFile, err := w.fileStore.RegisterWorkspaceFile(ctx, &model.WorkspaceFile{WorkspaceID: job.WorkspaceID, UploadedByUserID: &uid, Name: "shorts-audio.mp3", MimeType: "audio/mpeg", Size: audioInfo.Size(), S3Key: key, MediaMetadata: meta})
	if err != nil {
		_ = w.storage.DeleteObject(ctx, key)
		return fmt.Errorf("stage register_audio: %w", err)
	}
	if err := w.repo.SetAudio(ctx, job.WorkspaceID, project.ID, audioFile.ID, time.Now().UTC().Add(48*time.Hour)); err != nil {
		return fmt.Errorf("stage register_audio: %w", err)
	}
	if err := w.repo.SetTranscript(ctx, job.WorkspaceID, legacyProject.ID, transcript); err != nil {
		return fmt.Errorf("stage save_transcript: %w", err)
	}
	if len(transcript.RawResult) > 0 {
		if err := w.repo.SetTranscriptResult(ctx, job.WorkspaceID, legacyProject.ID, json.RawMessage(transcript.RawResult)); err != nil {
			return fmt.Errorf("stage save_transcript: %w", err)
		}
	}
	if err := w.repo.UpdateJobProgress(ctx, job.ID, w.owner, "segment_candidates", 80); err != nil {
		return fmt.Errorf("stage segment_candidates: %w", err)
	}
	shortsCandidates := BuildShortsCandidates(transcript.Segments, 0, processingDuration, 12)
	for i := range shortsCandidates {
		shortsCandidates[i].StartSeconds += processingStart
		shortsCandidates[i].EndSeconds += processingStart
	}
	clipRows := make([]model.ShortsClip, 0, len(shortsCandidates))
	for _, candidate := range shortsCandidates {
		details, _ := json.Marshal(map[string]any{"source": "transcript_heuristic", "score": candidate.Score})
		clipRows = append(clipRows, model.ShortsClip{StartSeconds: candidate.StartSeconds, EndSeconds: candidate.EndSeconds, TranscriptText: candidate.Text, Score: candidate.Score, ScoreDetails: details})
	}
	if err := w.repo.ReplaceCandidates(ctx, job.WorkspaceID, project.ID, clipRows); err != nil {
		return fmt.Errorf("stage segment_candidates: %w", err)
	}
	if err := w.repo.UpdateJobProgress(ctx, job.ID, w.owner, "render_drafts", 90); err != nil {
		return fmt.Errorf("stage render_drafts: %w", err)
	}
	if err := w.renderDrafts(ctx, job, project, sourcePath, shortsCandidates, transcript.Segments, ShortsSubtitleConfigFromSettings(project.Settings)); err != nil {
		return fmt.Errorf("stage render_drafts: %w", err)
	}
	if err := w.repo.CompleteJob(ctx, job.ID, w.owner, job.ProjectID, job.WorkspaceID, model.ShortsProjectCompleted, "completed"); err != nil {
		return err
	}
	w.notifyCompleted(ctx, job)
	return nil
}

func (w *ShortsWorker) processEditExport(ctx context.Context, job repository.ClaimedShortsJob) error {
	if job.EditProjectID == "" {
		return fmt.Errorf("edit project is required for export")
	}
	project, err := w.repo.GetEditProject(ctx, job.WorkspaceID, job.EditProjectID)
	if err != nil {
		return err
	}
	if project.SourceFileID == nil {
		return ErrShortsSourceRequired
	}
	file, err := w.files.GetByID(ctx, job.WorkspaceID, *project.SourceFileID, false)
	if err != nil {
		return err
	}
	clips, err := w.repo.ListEditProjectClips(ctx, job.WorkspaceID, project.ID)
	if err != nil {
		return err
	}
	selected := make([]model.ShortsClip, 0, len(clips))
	for _, clip := range clips {
		if clip.Included {
			selected = append(selected, clip)
		}
	}
	if len(selected) == 0 {
		return fmt.Errorf("no clips in edit project")
	}
	source, err := w.repo.GetSource(ctx, job.WorkspaceID, project.SourceID)
	if err != nil {
		return err
	}
	transcript, err := transcriptFromSettings(source.Settings)
	if err != nil {
		return err
	}
	config := ShortsSubtitleConfigFromSettings(project.Settings)
	path, err := w.downloadObject(ctx, file.S3Key, filepath.Ext(file.Name))
	if err != nil {
		return err
	}
	defer os.Remove(path)
	parts := make([]string, 0, len(selected))
	for _, clip := range selected {
		rendered, err := RenderShortsDraft(ctx, path, clip.StartSeconds, clip.EndSeconds, transcript.Segments, config)
		if err != nil {
			return err
		}
		parts = append(parts, rendered)
		defer os.Remove(rendered)
	}
	merged, err := MergeShortsClips(ctx, parts)
	if err != nil {
		return err
	}
	defer os.Remove(merged)
	info, err := os.Stat(merged)
	if err != nil {
		return err
	}
	key := fmt.Sprintf("workspaces/%s/shorts/%s/final-%d.mp4", job.WorkspaceID, project.ID, time.Now().UnixNano())
	if err := w.storage.PutObjectFromFile(ctx, key, "video/mp4", merged); err != nil {
		return err
	}
	uid := project.CreatedByUserID
	finalFile, err := w.fileStore.RegisterWorkspaceFile(ctx, &model.WorkspaceFile{WorkspaceID: job.WorkspaceID, UploadedByUserID: &uid, Name: "shorts-final.mp4", MimeType: "video/mp4", Size: info.Size(), S3Key: key})
	if err != nil {
		_ = w.storage.DeleteObject(ctx, key)
		return err
	}
	if err := w.repo.SetProjectFinalFile(ctx, job.WorkspaceID, project.ID, finalFile.ID); err != nil {
		return err
	}
	if err := w.repo.CompleteJob(ctx, job.ID, w.owner, project.ID, job.WorkspaceID, model.ShortsProjectCompleted, "completed"); err != nil {
		return err
	}
	return nil
}

func (w *ShortsWorker) processEditRerender(ctx context.Context, job repository.ClaimedShortsJob) error {
	return w.repo.CompleteJob(ctx, job.ID, w.owner, job.EditProjectID, job.WorkspaceID, model.ShortsProjectCompleted, "completed")
}

func (w *ShortsWorker) processLegacyExport(ctx context.Context, job repository.ClaimedShortsJob) error {
	project, err := w.repo.GetProject(ctx, job.WorkspaceID, job.ProjectID)
	if err != nil {
		return err
	}
	if project.SourceFileID == nil {
		return ErrShortsSourceRequired
	}
	file, err := w.files.GetByID(ctx, job.WorkspaceID, *project.SourceFileID, false)
	if err != nil {
		return err
	}
	clips, err := w.repo.ListClips(ctx, job.WorkspaceID, project.ID)
	if err != nil {
		return err
	}
	selected := make([]model.ShortsClip, 0, len(clips))
	for _, clip := range clips {
		if clip.Status == "selected" || clip.Status == "draft" {
			selected = append(selected, clip)
		}
	}
	if len(selected) == 0 {
		return fmt.Errorf("no selected shorts clips")
	}
	if err := w.repo.UpdateJobProgress(ctx, job.ID, w.owner, "download_source", 10); err != nil {
		return err
	}
	sourcePath, err := w.downloadObject(ctx, file.S3Key, filepath.Ext(file.Name))
	if err != nil {
		return err
	}
	defer os.Remove(sourcePath)
	source, err := w.repo.GetSource(ctx, job.WorkspaceID, project.SourceID)
	if err != nil {
		return err
	}
	transcript, err := transcriptFromSettings(source.Settings)
	if err != nil {
		return err
	}
	config := ShortsSubtitleConfigFromSettings(project.Settings)
	paths := make([]string, 0, len(selected))
	for index, clip := range selected {
		if err := w.repo.UpdateJobProgress(ctx, job.ID, w.owner, "render_clip", 15+(index*65/maxInt(1, len(selected)))); err != nil {
			return err
		}
		path, err := RenderShortsDraft(ctx, sourcePath, clip.StartSeconds, clip.EndSeconds, transcript.Segments, config)
		if err != nil {
			return err
		}
		paths = append(paths, path)
		defer os.Remove(path)
	}
	if err := w.repo.UpdateJobProgress(ctx, job.ID, w.owner, "merge_clips", 85); err != nil {
		return err
	}
	merged, err := MergeShortsClips(ctx, paths)
	if err != nil {
		return err
	}
	defer os.Remove(merged)
	info, err := os.Stat(merged)
	if err != nil {
		return err
	}
	key := fmt.Sprintf("workspaces/%s/shorts/%s/final-%d.mp4", job.WorkspaceID, project.ID, time.Now().UnixNano())
	if err := w.storage.PutObjectFromFile(ctx, key, "video/mp4", merged); err != nil {
		return err
	}
	uid := project.CreatedByUserID
	finalFile, err := w.fileStore.RegisterWorkspaceFile(ctx, &model.WorkspaceFile{WorkspaceID: job.WorkspaceID, UploadedByUserID: &uid, Name: "shorts-final.mp4", MimeType: "video/mp4", Size: info.Size(), S3Key: key})
	if err != nil {
		_ = w.storage.DeleteObject(ctx, key)
		return err
	}
	if err := w.repo.SetProjectFinalFile(ctx, job.WorkspaceID, project.ID, finalFile.ID); err != nil {
		return err
	}
	return w.repo.CompleteJob(ctx, job.ID, w.owner, job.ProjectID, job.WorkspaceID, model.ShortsProjectCompleted, "completed")
}

func (w *ShortsWorker) processLegacyRerender(ctx context.Context, job repository.ClaimedShortsJob) error {
	project, err := w.repo.GetProject(ctx, job.WorkspaceID, job.ProjectID)
	if err != nil {
		return err
	}
	if project.SourceFileID == nil {
		return ErrShortsSourceRequired
	}
	file, err := w.files.GetByID(ctx, job.WorkspaceID, *project.SourceFileID, false)
	if err != nil {
		return err
	}
	if err := w.repo.UpdateJobProgress(ctx, job.ID, w.owner, "download_source", 10); err != nil {
		return err
	}
	sourcePath, err := w.downloadObject(ctx, file.S3Key, filepath.Ext(file.Name))
	if err != nil {
		return err
	}
	defer os.Remove(sourcePath)
	transcript, err := transcriptFromSettings(project.Settings)
	if err != nil {
		return err
	}
	clips, err := w.repo.ListClips(ctx, job.WorkspaceID, project.ID)
	if err != nil {
		return err
	}
	config := ShortsSubtitleConfigFromSettings(project.Settings)
	for index, clip := range clips {
		if clip.Status != "draft" && clip.Status != "candidate" {
			continue
		}
		if err := w.repo.UpdateJobProgress(ctx, job.ID, w.owner, "render_draft", 20+(index*70/maxInt(1, len(clips)))); err != nil {
			return err
		}
		path, err := RenderShortsDraft(ctx, sourcePath, clip.StartSeconds, clip.EndSeconds, transcript.Segments, config)
		if err != nil {
			return err
		}
		info, err := os.Stat(path)
		if err != nil {
			os.Remove(path)
			return err
		}
		key := fmt.Sprintf("workspaces/%s/shorts/%s/drafts/%02d-rerender.mp4", job.WorkspaceID, project.ID, index)
		if err := w.storage.PutObjectFromFile(ctx, key, "video/mp4", path); err != nil {
			os.Remove(path)
			return err
		}
		uid := project.CreatedByUserID
		newFile, err := w.fileStore.RegisterWorkspaceFile(ctx, &model.WorkspaceFile{WorkspaceID: job.WorkspaceID, UploadedByUserID: &uid, Name: fmt.Sprintf("shorts-draft-%02d.mp4", index+1), MimeType: "video/mp4", Size: info.Size(), S3Key: key})
		os.Remove(path)
		if err != nil {
			_ = w.storage.DeleteObject(ctx, key)
			return err
		}
		oldFileID := clip.DraftFileID
		if err := w.repo.SetClipDraft(ctx, job.WorkspaceID, clip.ID, newFile.ID); err != nil {
			return err
		}
		if oldFileID != nil && *oldFileID != newFile.ID {
			if err := w.fileStore.PermanentDeleteWorkspaceFile(ctx, job.WorkspaceID, *oldFileID); err != nil {
				return err
			}
		}
	}
	return w.repo.CompleteJob(ctx, job.ID, w.owner, job.ProjectID, job.WorkspaceID, model.ShortsProjectCompleted, "completed")
}

func transcriptFromSettings(settings json.RawMessage) (ShortsTranscript, error) {
	var envelope struct {
		Transcript ShortsTranscript `json:"transcript"`
	}
	if err := json.Unmarshal(settings, &envelope); err != nil {
		return ShortsTranscript{}, fmt.Errorf("parse saved transcript: %w", err)
	}
	if len(envelope.Transcript.Segments) == 0 {
		return ShortsTranscript{}, fmt.Errorf("saved transcript is empty")
	}
	return envelope.Transcript, nil
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func (w *ShortsWorker) renderDrafts(ctx context.Context, job repository.ClaimedShortsJob, project *model.ShortsProject, sourcePath string, candidates []ShortsCandidate, transcript []ShortsTranscriptSegment, subtitleConfig ShortsSubtitleConfig) error {
	clips, err := w.repo.ListCandidateClips(ctx, job.WorkspaceID, project.ID)
	if err != nil {
		return err
	}
	if len(clips) != len(candidates) {
		return fmt.Errorf("candidate clip count mismatch")
	}
	for index, candidate := range candidates {
		path, err := RenderShortsDraft(ctx, sourcePath, candidate.StartSeconds, candidate.EndSeconds, transcript, subtitleConfig)
		if err != nil {
			return err
		}
		info, statErr := os.Stat(path)
		if statErr != nil {
			os.Remove(path)
			return statErr
		}
		key := fmt.Sprintf("workspaces/%s/shorts/%s/drafts/%02d.mp4", job.WorkspaceID, project.ID, index)
		if err := w.storage.PutObjectFromFile(ctx, key, "video/mp4", path); err != nil {
			os.Remove(path)
			return err
		}
		uid := project.CreatedByUserID
		file, err := w.fileStore.RegisterWorkspaceFile(ctx, &model.WorkspaceFile{WorkspaceID: job.WorkspaceID, UploadedByUserID: &uid, Name: fmt.Sprintf("shorts-draft-%02d.mp4", index+1), MimeType: "video/mp4", Size: info.Size(), S3Key: key})
		os.Remove(path)
		if err != nil {
			_ = w.storage.DeleteObject(ctx, key)
			return err
		}
		if err := w.repo.SetClipDraft(ctx, job.WorkspaceID, clips[index].ID, file.ID); err != nil {
			return err
		}
	}
	return nil
}

func (w *ShortsWorker) downloadObject(ctx context.Context, key, ext string) (string, error) {
	if strings.TrimSpace(ext) == "" {
		ext = ".bin"
	}
	body, _, err := w.storage.GetObject(ctx, key)
	if err != nil {
		return "", err
	}
	defer body.Close()
	path := filepath.Join(os.TempDir(), fmt.Sprintf("postilka-shorts-source-%d%s", time.Now().UnixNano(), ext))
	out, err := os.Create(path)
	if err != nil {
		return "", err
	}
	written, copyErr := io.Copy(out, io.LimitReader(body, 2<<30+1))
	closeErr := out.Close()
	if copyErr != nil {
		os.Remove(path)
		return "", copyErr
	}
	if closeErr != nil {
		os.Remove(path)
		return "", closeErr
	}
	if written > 2<<30 {
		os.Remove(path)
		return "", fmt.Errorf("source video exceeds 2 GiB limit")
	}
	return path, nil
}

func shortsProcessingRangeFromSettings(settings json.RawMessage, videoDuration float64) (float64, float64) {
	start, end := 0.0, videoDuration
	var values struct {
		Start float64 `json:"processing_start_seconds"`
		End   float64 `json:"processing_end_seconds"`
	}
	if json.Unmarshal(settings, &values) == nil {
		if values.Start >= 0 && values.End > values.Start && values.End <= videoDuration+0.001 {
			start, end = values.Start, values.End
		}
	}
	return start, end
}

func probeShortsDuration(ctx context.Context, path string) (float64, error) {
	out, err := exec.CommandContext(ctx, "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path).Output()
	if err != nil {
		return 0, fmt.Errorf("probe video: %w", err)
	}
	var duration float64
	if _, err := fmt.Sscanf(strings.TrimSpace(string(out)), "%f", &duration); err != nil || duration <= 0 {
		return 0, fmt.Errorf("invalid video duration")
	}
	return duration, nil
}
