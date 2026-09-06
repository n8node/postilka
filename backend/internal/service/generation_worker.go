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

	"github.com/postilka/postilka/internal/ai"
	"github.com/postilka/postilka/internal/model"
)

type kiePollGate struct {
	mu       sync.Mutex
	interval time.Duration
	last     time.Time
}

func newKiePollGate() *kiePollGate {
	interval := time.Second / ai.KieMaxPollRequestsPerSec
	if interval < 100*time.Millisecond {
		interval = 100 * time.Millisecond
	}
	return &kiePollGate{interval: interval}
}

func (g *kiePollGate) Wait(ctx context.Context) error {
	for {
		g.mu.Lock()
		wait := time.Duration(0)
		if !g.last.IsZero() {
			wait = g.interval - time.Since(g.last)
		}
		if wait <= 0 {
			g.last = time.Now()
			g.mu.Unlock()
			return nil
		}
		g.mu.Unlock()
		timer := time.NewTimer(wait)
		select {
		case <-ctx.Done():
			timer.Stop()
			return ctx.Err()
		case <-timer.C:
		}
	}
}

func (s *GenerationService) StartGenerationWorker(ctx context.Context) {
	pollGate := newKiePollGate()
	finalSem := make(chan struct{}, 4)
	workerOwner := generationWorkerOwner()

	go func() {
		ticker := time.NewTicker(500 * time.Millisecond)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.pollDueJobs(ctx, workerOwner, pollGate, s.createGate, finalSem)
			}
		}
	}()
	slog.Info("generation worker started",
		"kie_poll_rps", ai.KieMaxPollRequestsPerSec,
		"kie_create_per_window", ai.KieMaxCreateTasksPerWindow,
		"kie_create_window_sec", ai.KieCreateTaskWindow.Seconds(),
	)
}

func generationWorkerOwner() string {
	host, err := os.Hostname()
	if err != nil || strings.TrimSpace(host) == "" {
		host = "unknown"
	}
	return fmt.Sprintf("%s-%d", host, os.Getpid())
}

func (s *GenerationService) pollDueJobs(ctx context.Context, owner string, pollGate *kiePollGate, createGate *kieCreateGate, finalSem chan struct{}) {
	ids, err := s.jobRepo.ClaimDueJobs(ctx, owner, 40, 2*time.Minute)
	if err != nil {
		slog.Error("list generation jobs", "err", err)
		return
	}
	for _, id := range ids {
		if ctx.Err() != nil {
			return
		}
		job, err := s.jobRepo.GetByIDInternal(ctx, id)
		if err != nil {
			_ = s.jobRepo.ReleaseLease(ctx, id, owner)
			continue
		}
		if job.Status == model.GenJobStatusPreparing && strings.TrimSpace(job.KieTaskID) == "" {
			var err error
			if model.IsVideoGenerationMode(job.Mode) {
				err = s.submitPendingVideoJob(ctx, id, createGate)
			} else {
				err = s.submitPendingJob(ctx, id, createGate)
			}
			if err != nil {
				slog.Warn("submit generation job", "job_id", id, "err", err)
				_ = s.jobRepo.SetLeaseError(ctx, id, owner, err.Error())
			}
			_ = s.jobRepo.ReleaseLease(ctx, id, owner)
			continue
		}
		if err := pollGate.Wait(ctx); err != nil {
			return
		}
		job, err = s.jobRepo.GetByIDInternal(ctx, id)
		if err != nil {
			_ = s.jobRepo.ReleaseLease(ctx, id, owner)
			continue
		}
		if job.Status == model.GenJobStatusPreparing {
			p := ai.NextJobProgress(job.Progress, job.Status, job.KieState, 0, job.CreatedAt)
			if p != job.Progress {
				_ = s.jobRepo.UpdateProgress(ctx, id, job.Status, job.KieState, p, "",
					time.Now().Add(2*time.Second))
			}
			_ = s.jobRepo.ReleaseLease(ctx, id, owner)
			continue
		}
		if job.KieTaskID == "" {
			_ = s.jobRepo.ReleaseLease(ctx, id, owner)
			continue
		}
		if job.Status == model.GenJobStatusSucceeded || job.Status == model.GenJobStatusFailed {
			_ = s.jobRepo.ReleaseLease(ctx, id, owner)
			continue
		}

		got429, terminal, err := s.pollGenerationJob(ctx, job)
		if err != nil {
			slog.Warn("poll kie job", "job_id", id, "err", err)
			_ = s.jobRepo.SetLeaseError(ctx, id, owner, err.Error())
			if got429 {
				_ = s.jobRepo.UpdateProgress(ctx, id, job.Status, job.KieState, job.Progress, "",
					ai.NextPollAfter(job.CreatedAt, true))
			}
			_ = s.jobRepo.ReleaseLease(ctx, id, owner)
			continue
		}
		if !terminal {
			_ = s.jobRepo.ReleaseLease(ctx, id, owner)
			continue
		}

		select {
		case finalSem <- struct{}{}:
			go func(jobID string) {
				defer func() { <-finalSem }()
				if err := s.finalizeGenerationJob(context.Background(), jobID); err != nil {
					slog.Error("finalize generation job", "job_id", jobID, "err", err)
					if leaseErr := s.jobRepo.SetFinalizationError(context.Background(), jobID, err.Error()); leaseErr != nil {
						slog.Error("record generation finalization error", "job_id", jobID, "err", leaseErr)
					}
				}
				_ = s.jobRepo.ReleaseLease(context.Background(), jobID, owner)
			}(id)
		default:
			_ = s.jobRepo.UpdateProgress(ctx, id, job.Status, job.KieState, job.Progress, "",
				time.Now().Add(2*time.Second))
			_ = s.jobRepo.ReleaseLease(ctx, id, owner)
		}
	}
}

func (s *GenerationService) pollGenerationJob(ctx context.Context, job model.AIGenerationJob) (got429 bool, terminal bool, err error) {
	if model.IsVideoGenerationMode(job.Mode) {
		return s.pollKieVideoJob(ctx, job)
	}
	return s.pollKieJob(ctx, job)
}

func (s *GenerationService) finalizeGenerationJob(ctx context.Context, jobID string) error {
	job, err := s.jobRepo.GetByIDInternal(ctx, jobID)
	if err != nil {
		return err
	}
	if model.IsVideoGenerationMode(job.Mode) {
		return s.finalizeVideoJob(ctx, jobID)
	}
	return s.finalizeJob(ctx, jobID)
}

func (s *GenerationService) pollKieJob(ctx context.Context, job model.AIGenerationJob) (got429 bool, terminal bool, err error) {
	baseURL, apiKey, err := s.kieConfig.ResolveCredentials(ctx)
	if err != nil {
		return false, false, err
	}
	client := ai.NewKieClient(baseURL, apiKey)

	detail, err := client.GetTask(ctx, job.KieTaskID)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "429") {
			return true, false, err
		}
		return false, false, err
	}

	status := ai.MapKieStateToJobStatus(detail.State)
	pollAfter := ai.NextPollAfter(job.CreatedAt, false)
	progress := ai.NextJobProgress(
		job.Progress,
		status,
		detail.State,
		detail.Progress,
		job.CreatedAt,
	)

	switch detail.State {
	case "success":
		if progress < ai.KieProgressNearDone {
			progress = ai.KieProgressNearDone
		}
		status = model.GenJobStatusGenerating
		_ = s.jobRepo.UpdateProgress(ctx, job.ID, status, detail.State, progress, "", pollAfter)
		return false, true, nil
	case "fail":
		msg := strings.TrimSpace(detail.FailMsg)
		if msg == "" {
			msg = "generation failed"
		}
		s.markJobFailed(ctx, job.ID, msg)
		return false, true, nil
	default:
		_ = s.jobRepo.UpdateProgress(ctx, job.ID, status, detail.State, progress, "", pollAfter)
		return false, false, nil
	}
}

func (s *GenerationService) finalizeJob(ctx context.Context, jobID string) error {
	job, err := s.jobRepo.GetByIDInternal(ctx, jobID)
	if err != nil {
		return err
	}
	if job.GenerationID != nil {
		return nil
	}
	if job.Status == model.GenJobStatusFailed {
		return nil
	}
	// The result record can be created before a worker restart or a billing
	// failure. Reuse it instead of downloading and creating a second record.
	var existing *model.AIGeneration
	if job.GenerationID == nil {
		if record, lookupErr := s.genRepo.GetBySourceJobID(ctx, job.ID); lookupErr == nil {
			existing = &record
		}
	}

	var record model.AIGeneration
	var resultSize int64
	if existing != nil {
		record = *existing
	} else {
		baseURL, apiKey, err := s.kieConfig.ResolveCredentials(ctx)
		if err != nil {
			return err
		}
		client := ai.NewKieClient(baseURL, apiKey)
		detail, err := client.GetTask(ctx, job.KieTaskID)
		if err != nil {
			return err
		}
		if detail.State != "success" || detail.ResultURL == "" {
			return fmt.Errorf("%w: no result", ErrGenerationFailed)
		}

		_ = s.jobRepo.SetDuration(ctx, job.ID, int(time.Since(job.CreatedAt).Milliseconds()))
		streaming := s.StreamingSettings(ctx)
		reservationMB := streaming.MultipartPartMB * 2
		if err := s.streamingLimiter.acquire(ctx, streaming.ImageUploadConcurrency, streaming.MemoryBudgetMB, reservationMB); err != nil {
			return err
		}
		defer s.streamingLimiter.release(reservationMB)
		resultPath, contentType, size, err := downloadToTempFile(ctx, detail.ResultURL, int64(streaming.ImageMaxMB)<<20)
		if err != nil {
			return fmt.Errorf("%w: %v", ErrGenerationFailed, err)
		}
		defer os.Remove(resultPath)
		resultSize = size

		ext := ".jpg"
		switch contentType {
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		}
		key := generationResultS3Key(job.WorkspaceID, job.Mode, ext)
		if err := s.objectStore.PutObjectFromFile(ctx, key, contentType, resultPath); err != nil {
			return fmt.Errorf("%w: %v", ErrGenerationFailed, err)
		}
		record, err = s.genRepo.Create(ctx, model.AIGeneration{
			SourceJobID:       &job.ID,
			UserID:            job.UserID,
			WorkspaceID:       job.WorkspaceID,
			Mode:              job.Mode,
			Prompt:            job.Prompt,
			Model:             job.Model,
			AspectRatio:       job.AspectRatio,
			ResultS3Key:       key,
			ResultContentType: contentType,
		})
		if err != nil {
			return err
		}
	}

	var registeredFile *model.WorkspaceFile
	if s.fileStorage != nil {
		wf, regErr := s.fileStorage.RegisterAIGenerationFile(ctx, job.WorkspaceID, job.UserID, record, resultSize)
		if regErr != nil {
			slog.Warn("register ai generation file", "generation_id", record.ID, "err", regErr)
		} else if wf != nil {
			registeredFile = wf
			_ = s.genRepo.SetWorkspaceFileID(ctx, record.ID, wf.ID)
		}
	}

	if s.aiBilling == nil {
		return errors.New("ai billing service is not configured")
	}
	debit, err := s.aiBilling.DebitAfterSuccess(ctx, job.WorkspaceID, job.UserID, record.ID, job.CreditCost)
	if err != nil {
		return err
	}

	if err := s.jobRepo.MarkSucceeded(ctx, job.ID, record.ID, debit.WalletCentsCharged, debit.QuotaCreditsUsed); err != nil {
		return err
	}
	if s.notify != nil {
		gid := record.ID
		job.GenerationID = &gid
		s.notify.NotifyAIDone(ctx, job, registeredFile)
		s.notify.MaybeUsageWarnings(ctx, job.WorkspaceID)
		s.notify.MaybeWalletLow(ctx, job.UserID)
	}
	return nil
}
