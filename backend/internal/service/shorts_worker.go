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
	owner       string
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
			lastErr = err
			_ = w.repo.FailJob(ctx, job.ID, w.owner, err.Error(), time.Now().UTC().Add(time.Minute))
		}
	}
	return len(jobs), lastErr
}

func (w *ShortsWorker) process(ctx context.Context, job repository.ClaimedShortsJob) error {
	if job.JobType != "analyze" {
		return fmt.Errorf("unsupported shorts job type %q", job.JobType)
	}
	project, err := w.repo.GetProject(ctx, job.WorkspaceID, job.ProjectID)
	if err != nil {
		return err
	}
	if project.AudioFileID != nil && project.AudioExpiresAt != nil && project.AudioExpiresAt.After(time.Now().UTC()) {
		return w.repo.SucceedJob(ctx, job.ID, w.owner)
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
		return err
	}

	sourcePath, err := w.downloadObject(ctx, file.S3Key, filepath.Ext(file.Name))
	if err != nil {
		return err
	}
	defer os.Remove(sourcePath)
	duration, err := probeShortsDuration(ctx, sourcePath)
	if err != nil {
		return err
	}
	if err := w.repo.UpdateJobProgress(ctx, job.ID, w.owner, "extract_audio", 35); err != nil {
		return err
	}
	audioPath, err := ExtractShortsAudio(ctx, sourcePath)
	if err != nil {
		return err
	}
	defer os.Remove(audioPath)
	if err := w.repo.UpdateJobProgress(ctx, job.ID, w.owner, "transcribe", 55); err != nil {
		return err
	}
	transcript, err := w.transcriber.Transcribe(ctx, audioPath)
	if err != nil {
		return err
	}
	audioInfo, err := os.Stat(audioPath)
	if err != nil {
		return err
	}
	key := fmt.Sprintf("workspaces/%s/shorts/%s/audio.mp3", job.WorkspaceID, project.ID)
	if err := w.storage.PutObjectFromFile(ctx, key, "audio/mpeg", audioPath); err != nil {
		return err
	}
	meta, _ := json.Marshal(map[string]any{"source": "shorts_audio", "project_id": project.ID, "duration_seconds": duration, "transcript": transcript})
	uid := project.CreatedByUserID
	audioFile, err := w.fileStore.RegisterWorkspaceFile(ctx, &model.WorkspaceFile{WorkspaceID: job.WorkspaceID, UploadedByUserID: &uid, Name: "shorts-audio.mp3", MimeType: "audio/mpeg", Size: audioInfo.Size(), S3Key: key, MediaMetadata: meta})
	if err != nil {
		_ = w.storage.DeleteObject(ctx, key)
		return err
	}
	if err := w.repo.SetAudio(ctx, job.WorkspaceID, project.ID, audioFile.ID, time.Now().UTC().Add(48*time.Hour)); err != nil {
		return err
	}
	if err := w.repo.SetTranscript(ctx, job.WorkspaceID, project.ID, transcript); err != nil {
		return err
	}
	if err := w.repo.UpdateJobProgress(ctx, job.ID, w.owner, "segment_candidates", 80); err != nil {
		return err
	}
	shortsCandidates := BuildShortsCandidates(transcript.Segments, 0, duration, 12)
	clipRows := make([]model.ShortsClip, 0, len(shortsCandidates))
	for _, candidate := range shortsCandidates {
		details, _ := json.Marshal(map[string]any{"source": "transcript_heuristic", "score": candidate.Score})
		clipRows = append(clipRows, model.ShortsClip{StartSeconds: candidate.StartSeconds, EndSeconds: candidate.EndSeconds, TranscriptText: candidate.Text, Score: candidate.Score, ScoreDetails: details})
	}
	if err := w.repo.ReplaceCandidates(ctx, job.WorkspaceID, project.ID, clipRows); err != nil {
		return err
	}
	if err := w.repo.UpdateJobProgress(ctx, job.ID, w.owner, "render_drafts", 90); err != nil {
		return err
	}
	if err := w.renderDrafts(ctx, job, project, sourcePath, shortsCandidates); err != nil {
		return err
	}
	if err := w.repo.UpdateProjectStatus(ctx, job.WorkspaceID, job.ProjectID, model.ShortsProjectAnalyzing, "transcript_ready"); err != nil {
		return err
	}
	return w.repo.SucceedJob(ctx, job.ID, w.owner)
}

func (w *ShortsWorker) renderDrafts(ctx context.Context, job repository.ClaimedShortsJob, project *model.ShortsProject, sourcePath string, candidates []ShortsCandidate) error {
	clips, err := w.repo.ListCandidateClips(ctx, job.WorkspaceID, project.ID)
	if err != nil {
		return err
	}
	if len(clips) != len(candidates) {
		return fmt.Errorf("candidate clip count mismatch")
	}
	for index, candidate := range candidates {
		path, err := RenderShortsDraft(ctx, sourcePath, candidate.StartSeconds, candidate.EndSeconds)
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
