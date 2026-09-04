package service

import (
	"context"
	"fmt"
	"log/slog"
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

	go func() {
		ticker := time.NewTicker(500 * time.Millisecond)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.pollDueJobs(ctx, pollGate, s.createGate, finalSem)
			}
		}
	}()
	slog.Info("generation worker started",
		"kie_poll_rps", ai.KieMaxPollRequestsPerSec,
		"kie_create_per_window", ai.KieMaxCreateTasksPerWindow,
		"kie_create_window_sec", ai.KieCreateTaskWindow.Seconds(),
	)
}

func (s *GenerationService) pollDueJobs(ctx context.Context, pollGate *kiePollGate, createGate *kieCreateGate, finalSem chan struct{}) {
	ids, err := s.jobRepo.ListDueForPoll(ctx, 40)
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
			}
			continue
		}
		if err := pollGate.Wait(ctx); err != nil {
			return
		}
		job, err = s.jobRepo.GetByIDInternal(ctx, id)
		if err != nil {
			continue
		}
		if job.Status == model.GenJobStatusPreparing {
			p := ai.NextJobProgress(job.Progress, job.Status, job.KieState, 0, job.CreatedAt)
			if p != job.Progress {
				_ = s.jobRepo.UpdateProgress(ctx, id, job.Status, job.KieState, p, "",
					time.Now().Add(2*time.Second))
			}
			continue
		}
		if job.KieTaskID == "" {
			continue
		}
		if job.Status == model.GenJobStatusSucceeded || job.Status == model.GenJobStatusFailed {
			continue
		}

		got429, terminal, err := s.pollGenerationJob(ctx, job)
		if err != nil {
			slog.Warn("poll kie job", "job_id", id, "err", err)
			if got429 {
				_ = s.jobRepo.UpdateProgress(ctx, id, job.Status, job.KieState, job.Progress, "",
					ai.NextPollAfter(job.CreatedAt, true))
			}
			continue
		}
		if !terminal {
			continue
		}

		select {
		case finalSem <- struct{}{}:
			go func(jobID string) {
				defer func() { <-finalSem }()
				if err := s.finalizeGenerationJob(context.Background(), jobID); err != nil {
					slog.Error("finalize generation job", "job_id", jobID, "err", err)
				}
			}(id)
		default:
			_ = s.jobRepo.UpdateProgress(ctx, id, job.Status, job.KieState, job.Progress, "",
				time.Now().Add(2*time.Second))
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

	contentType, data, err := downloadGenerationImage(ctx, detail.ResultURL)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrGenerationFailed, err)
	}

	ext := ".jpg"
	switch contentType {
	case "image/png":
		ext = ".png"
	case "image/webp":
		ext = ".webp"
	}

	key := generationResultS3Key(job.WorkspaceID, job.Mode, ext)
	if err := s.objectStore.PutObject(ctx, key, contentType, data); err != nil {
		return fmt.Errorf("%w: %v", ErrGenerationFailed, err)
	}

	record, err := s.genRepo.Create(ctx, model.AIGeneration{
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

	var registeredFile *model.WorkspaceFile
	if s.fileStorage != nil {
		wf, regErr := s.fileStorage.RegisterAIGenerationFile(ctx, job.WorkspaceID, job.UserID, record, int64(len(data)))
		if regErr != nil {
			slog.Warn("register ai generation file", "generation_id", record.ID, "err", regErr)
		} else if wf != nil {
			registeredFile = wf
			_ = s.genRepo.SetWorkspaceFileID(ctx, record.ID, wf.ID)
		}
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
