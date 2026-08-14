package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/postilka/postilka/internal/ai"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrVideoGenerationNotConfigured = errors.New("video generation provider not configured")
	ErrVideoGenerationSourceRequired = errors.New("video generation source image required")
)

type GenerateVideoInput struct {
	Mode                    string
	Prompt                  string
	AspectRatio             string
	Duration                int
	SourceUploadID          string
	LastFrameUploadID       string
	ReferenceUploadIDs      []string
	ReferenceVideoUploadIDs []string
	ReferenceAudioUploadIDs []string
}

func inputImageCountForVideoMode(mode string, in GenerateVideoInput) int {
	switch normalizeVideoGenerationMode(mode) {
	case model.KieVideoModeReferenceToVideo:
		return countNonEmptyIDs(in.ReferenceUploadIDs)
	case model.KieVideoModeImageToVideo:
		n := 0
		if strings.TrimSpace(in.SourceUploadID) != "" {
			n++
		}
		if strings.TrimSpace(in.LastFrameUploadID) != "" {
			n++
		}
		return n
	default:
		return 0
	}
}

func normalizeVideoGenerationMode(mode string) string {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case model.KieVideoModeImageToVideo:
		return model.KieVideoModeImageToVideo
	case model.KieVideoModeReferenceToVideo:
		return model.KieVideoModeReferenceToVideo
	default:
		return model.KieVideoModeTextToVideo
	}
}

func (s *GenerationService) StartGenerateVideo(ctx context.Context, userID string, r *http.Request, in GenerateVideoInput) (StartGenerateResult, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r)
	if err != nil {
		return StartGenerateResult{}, err
	}
	if s.kieVideoConfig == nil {
		return StartGenerateResult{}, ErrVideoGenerationNotConfigured
	}

	mode := normalizeVideoGenerationMode(in.Mode)
	prompt := strings.TrimSpace(in.Prompt)
	if prompt == "" {
		return StartGenerateResult{}, errors.New("prompt is required")
	}
	if len(prompt) > 4000 {
		return StartGenerateResult{}, errors.New("prompt too long")
	}

	settings, err := s.kieVideoConfig.GetSettings(ctx)
	if err != nil {
		return StartGenerateResult{}, err
	}

	duration := in.Duration
	if duration <= 0 {
		duration = settings.DefaultDurationForMode(mode)
	}
	duration = modelClampVideoDuration(duration)
	aspectRatio := model.NormalizeVideoAspectRatio(in.AspectRatio)

	switch mode {
	case model.KieVideoModeImageToVideo:
		if strings.TrimSpace(in.SourceUploadID) == "" && strings.TrimSpace(in.LastFrameUploadID) == "" {
			return StartGenerateResult{}, ErrVideoGenerationSourceRequired
		}
	case model.KieVideoModeReferenceToVideo:
		imageCount := countNonEmptyIDs(in.ReferenceUploadIDs)
		videoCount := countNonEmptyIDs(in.ReferenceVideoUploadIDs)
		audioCount := countNonEmptyIDs(in.ReferenceAudioUploadIDs)
		if imageCount == 0 && videoCount == 0 {
			return StartGenerateResult{}, errors.New("reference image or video required")
		}
		if audioCount > 0 && imageCount == 0 && videoCount == 0 {
			return StartGenerateResult{}, errors.New("reference audio requires image or video")
		}
		if imageCount > 9 || videoCount > 3 || audioCount > 3 {
			return StartGenerateResult{}, errors.New("too many reference files")
		}
		if err := s.validateReferenceVideoUploadIDs(ctx, userID, ws.ID, in.ReferenceVideoUploadIDs); err != nil {
			return StartGenerateResult{}, err
		}
	}

	inputVideoDurations, err := s.referenceVideoDurationsForUploadIDs(ctx, userID, ws.ID, in.ReferenceVideoUploadIDs)
	if err != nil {
		return StartGenerateResult{}, err
	}
	costBreakdown := settings.CreditCostForVideoRequest(model.VideoGenerationCostInput{
		Mode:                   mode,
		OutputDurationSeconds:  duration,
		InputImageCount:        inputImageCountForVideoMode(mode, in),
		InputVideoDurationSecs: inputVideoDurations,
	})
	cost := costBreakdown.TotalCredits
	kopecks := settings.KopecksPerMediaCredit
	if kopecks <= 0 {
		kopecks = 5000
	}
	if err := s.aiBilling.PrefailCheckWithKopecks(ctx, ws.ID, userID, cost, kopecks); err != nil {
		return StartGenerateResult{}, err
	}

	if _, _, err := s.kieVideoConfig.ResolveCredentials(ctx); err != nil {
		slog.Warn("video generation credentials unavailable", "user_id", userID, "err", err)
		return StartGenerateResult{}, fmt.Errorf("%w: %v", ErrVideoGenerationNotConfigured, err)
	}

	modelID := ai.NormalizeKieVideoModelID(settings.ModelForMode(mode))
	if modelID == "" {
		modelID = ai.DefaultVideoModelForMode(mode)
	}

	refIDs := append([]string(nil), in.ReferenceUploadIDs...)
	refVideoIDs := append([]string(nil), in.ReferenceVideoUploadIDs...)
	refAudioIDs := append([]string(nil), in.ReferenceAudioUploadIDs...)
	job, err := s.jobRepo.Create(ctx, model.AIGenerationJob{
		UserID:                  userID,
		WorkspaceID:             ws.ID,
		Status:                  model.GenJobStatusPreparing,
		Progress:                5,
		Mode:                    mode,
		Prompt:                  prompt,
		Model:                   modelID,
		AspectRatio:             aspectRatio,
		SourceUploadID:          strings.TrimSpace(in.SourceUploadID),
		LastFrameUploadID:       strings.TrimSpace(in.LastFrameUploadID),
		ReferenceUploadIDs:      refIDs,
		ReferenceVideoUploadIDs: refVideoIDs,
		ReferenceAudioUploadIDs: refAudioIDs,
		VideoDurationSeconds:    duration,
		CreditCost:              cost,
		PollAfter:               time.Now(),
	})
	if err != nil {
		return StartGenerateResult{}, err
	}

	submitCtx := context.Background()
	if err := s.submitPendingVideoJob(submitCtx, job.ID, s.createGate); err != nil {
		slog.Warn("inline video submit failed", "job_id", job.ID, "err", err)
	}
	if refreshed, err := s.jobRepo.GetByIDInternal(submitCtx, job.ID); err == nil {
		job = refreshed
	}
	if job.Status == model.GenJobStatusFailed {
		return StartGenerateResult{}, fmt.Errorf("%s", job.FailMessage)
	}

	return StartGenerateResult{Job: videoJobToView(job, nil)}, nil
}

func (s *GenerationService) GetVideoJob(ctx context.Context, userID, jobID string) (GetGenerationJobResult, error) {
	result, err := s.GetJob(ctx, userID, jobID)
	if err != nil {
		return GetGenerationJobResult{}, err
	}
	if !model.IsVideoGenerationMode(result.Job.Mode) {
		return GetGenerationJobResult{}, repository.ErrNotFound
	}
	return result, nil
}

func (s *GenerationService) GetVideoPricing(ctx context.Context, userID string, r *http.Request) (model.VideoGenerationPricingView, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r)
	if err != nil {
		return model.VideoGenerationPricingView{}, err
	}
	if s.kieVideoConfig == nil {
		return model.VideoGenerationPricingView{}, ErrVideoGenerationNotConfigured
	}
	settings, err := s.kieVideoConfig.GetSettings(ctx)
	if err != nil {
		return model.VideoGenerationPricingView{}, err
	}
	priceRub := float64(settings.MediaCreditPriceRub())
	out := model.VideoGenerationPricingView{
		CreditsPerSecondText:          settings.CreditsPerSecondForMode(model.KieVideoModeTextToVideo),
		CreditsPerSecondImage:         settings.CreditsPerSecondForMode(model.KieVideoModeImageToVideo),
		CreditsPerSecondReference:     settings.CreditsPerSecondForMode(model.KieVideoModeReferenceToVideo),
		CreditsPerExtraReferenceImage: settings.CreditsPerExtraReferenceImage,
		FreeReferenceImages:           model.KieVideoFreeReferenceImages,
		DefaultDurationText:           settings.DefaultDurationForMode(model.KieVideoModeTextToVideo),
		DefaultDurationImage:      settings.DefaultDurationForMode(model.KieVideoModeImageToVideo),
		DefaultDurationReference:  settings.DefaultDurationForMode(model.KieVideoModeReferenceToVideo),
		MediaCreditPriceRub:       priceRub,
		TextToVideo:               settings.CreditCostForVideo(model.KieVideoModeTextToVideo, settings.DefaultDurationForMode(model.KieVideoModeTextToVideo)),
		ImageToVideo:              settings.CreditCostForVideo(model.KieVideoModeImageToVideo, settings.DefaultDurationForMode(model.KieVideoModeImageToVideo)),
		ReferenceToVideo:          settings.CreditCostForVideo(model.KieVideoModeReferenceToVideo, settings.DefaultDurationForMode(model.KieVideoModeReferenceToVideo)),
	}
	credits, err := s.aiBilling.GetMediaCreditsRemaining(ctx, ws.ID, userID)
	if err == nil {
		out.Unlimited = credits.Unlimited
		if credits.Unlimited {
			out.CreditsRemaining = nil
		} else {
			total := credits.TotalAvailable
			out.CreditsRemaining = &total
		}
	}
	return out, nil
}

func (s *GenerationService) ListVideoHistory(ctx context.Context, userID string, r *http.Request, limit int) ([]model.AIGenerationView, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	items, err := s.genRepo.ListVideoByWorkspace(ctx, ws.ID, limit)
	if err != nil {
		return nil, err
	}
	out := make([]model.AIGenerationView, 0, len(items))
	for _, item := range items {
		out = append(out, item.ToViewWithUsage(false))
	}
	return out, nil
}

func videoJobToView(job model.AIGenerationJob, gen *model.AIGenerationView) model.AIGenerationJobView {
	view := jobToView(job, gen)
	view.VideoDurationSeconds = job.VideoDurationSeconds
	return view
}

func modelClampVideoDuration(n int) int {
	if n < 4 {
		return 4
	}
	if n > 15 {
		return 15
	}
	return n
}

func (s *GenerationService) submitPendingVideoJob(ctx context.Context, jobID string, createGate *kieCreateGate) error {
	jobRow, err := s.jobRepo.GetByIDInternal(ctx, jobID)
	if err != nil {
		return err
	}
	if strings.TrimSpace(jobRow.KieTaskID) != "" {
		return nil
	}
	if jobRow.Status != model.GenJobStatusPreparing {
		return nil
	}
	claimed, err := s.jobRepo.TryClaimKieSubmit(ctx, jobID)
	if err != nil {
		return err
	}
	if !claimed {
		return nil
	}
	if s.kieVideoConfig == nil {
		_ = s.jobRepo.ReleaseKieSubmitClaim(ctx, jobID)
		s.markJobFailed(ctx, jobID, ErrVideoGenerationNotConfigured.Error())
		return ErrVideoGenerationNotConfigured
	}

	userID := jobRow.UserID
	workspaceID := jobRow.WorkspaceID
	mode := normalizeVideoGenerationMode(jobRow.Mode)
	startedAt := jobRow.CreatedAt

	deferSubmit := func(rateLimited bool) {
		_ = s.jobRepo.ReleaseKieSubmitClaim(ctx, jobID)
		jobRow, _ = s.jobRepo.GetByIDInternal(ctx, jobID)
		p := ai.NextJobProgress(jobRow.Progress, model.GenJobStatusPreparing, "", 0, startedAt)
		retryAt := time.Now().Add(2 * time.Second)
		if rateLimited {
			retryAt = ai.NextCreateRetryAfter()
		}
		_ = s.jobRepo.UpdateProgress(ctx, jobID, model.GenJobStatusPreparing, "", p, "", retryAt)
	}

	baseURL, apiKey, err := s.kieVideoConfig.ResolveCredentials(ctx)
	if err != nil {
		slog.Warn("kie video credentials unavailable", "job_id", jobID, "err", err)
		_ = s.jobRepo.ReleaseKieSubmitClaim(ctx, jobID)
		s.markJobFailed(ctx, jobID, err.Error())
		return err
	}
	client := ai.NewKieClient(baseURL, apiKey)

	var taskSources ai.VideoTaskSources
	switch mode {
	case model.KieVideoModeImageToVideo:
		firstID := strings.TrimSpace(jobRow.SourceUploadID)
		lastID := strings.TrimSpace(jobRow.LastFrameUploadID)
		if firstID == "" && lastID == "" {
			_ = s.jobRepo.ReleaseKieSubmitClaim(ctx, jobID)
			s.markJobFailed(ctx, jobID, ErrVideoGenerationSourceRequired.Error())
			return ErrVideoGenerationSourceRequired
		}
		if firstID != "" {
			urls, err := s.kieSourceURLs(ctx, client, userID, workspaceID, []string{firstID})
			if err != nil {
				if isKieRateLimited(err) {
					deferSubmit(true)
					return nil
				}
				_ = s.jobRepo.ReleaseKieSubmitClaim(ctx, jobID)
				s.markJobFailed(ctx, jobID, generationFailMessage(err))
				return err
			}
			if len(urls) > 0 {
				taskSources.FirstFrameURL = urls[0]
			}
		}
		if lastID != "" {
			urls, err := s.kieSourceURLs(ctx, client, userID, workspaceID, []string{lastID})
			if err != nil {
				if isKieRateLimited(err) {
					deferSubmit(true)
					return nil
				}
				_ = s.jobRepo.ReleaseKieSubmitClaim(ctx, jobID)
				s.markJobFailed(ctx, jobID, generationFailMessage(err))
				return err
			}
			if len(urls) > 0 {
				taskSources.LastFrameURL = urls[0]
			}
		}
	case model.KieVideoModeReferenceToVideo:
		imageIDs := nonEmptyUploadIDs(jobRow.ReferenceUploadIDs)
		videoIDs := nonEmptyUploadIDs(jobRow.ReferenceVideoUploadIDs)
		audioIDs := nonEmptyUploadIDs(jobRow.ReferenceAudioUploadIDs)
		if len(imageIDs) == 0 && len(videoIDs) == 0 {
			_ = s.jobRepo.ReleaseKieSubmitClaim(ctx, jobID)
			s.markJobFailed(ctx, jobID, ErrVideoGenerationSourceRequired.Error())
			return ErrVideoGenerationSourceRequired
		}
		if len(imageIDs) > 0 {
			urls, err := s.kieSourceURLs(ctx, client, userID, workspaceID, imageIDs)
			if err != nil {
				if isKieRateLimited(err) {
					deferSubmit(true)
					return nil
				}
				_ = s.jobRepo.ReleaseKieSubmitClaim(ctx, jobID)
				s.markJobFailed(ctx, jobID, generationFailMessage(err))
				return err
			}
			taskSources.ReferenceImageURLs = urls
		}
		if len(videoIDs) > 0 {
			urls, err := s.kieSourceURLs(ctx, client, userID, workspaceID, videoIDs)
			if err != nil {
				if isKieRateLimited(err) {
					deferSubmit(true)
					return nil
				}
				_ = s.jobRepo.ReleaseKieSubmitClaim(ctx, jobID)
				s.markJobFailed(ctx, jobID, generationFailMessage(err))
				return err
			}
			taskSources.ReferenceVideoURLs = urls
		}
		if len(audioIDs) > 0 {
			urls, err := s.kieSourceURLs(ctx, client, userID, workspaceID, audioIDs)
			if err != nil {
				if isKieRateLimited(err) {
					deferSubmit(true)
					return nil
				}
				_ = s.jobRepo.ReleaseKieSubmitClaim(ctx, jobID)
				s.markJobFailed(ctx, jobID, generationFailMessage(err))
				return err
			}
			taskSources.ReferenceAudioURLs = urls
		}
	}

	if err := createGate.Wait(ctx); err != nil {
		deferSubmit(false)
		return err
	}

	jobRow, err = s.jobRepo.GetByIDInternal(ctx, jobID)
	if err != nil {
		_ = s.jobRepo.ReleaseKieSubmitClaim(ctx, jobID)
		return err
	}
	if strings.TrimSpace(jobRow.KieTaskID) != "" {
		_ = s.jobRepo.ReleaseKieSubmitClaim(ctx, jobID)
		return nil
	}

	duration := modelClampVideoDuration(jobRow.VideoDurationSeconds)
	taskInput := ai.BuildVideoTaskInput(
		jobRow.Model, mode, jobRow.Prompt, jobRow.AspectRatio, duration, taskSources,
	)
	taskID, err := client.CreateVideoTask(ctx, ai.KieCreateTaskRequest{
		Model: jobRow.Model,
		Input: taskInput,
	})
	if err != nil {
		if isKieRateLimited(err) {
			deferSubmit(true)
			return nil
		}
		msg := generationFailMessage(err)
		slog.Warn("kie video create task failed", "job_id", jobID, "mode", mode, "model", jobRow.Model, "err", err)
		_ = s.jobRepo.ReleaseKieSubmitClaim(ctx, jobID)
		s.markJobFailed(ctx, jobID, msg)
		return err
	}

	jobRow, _ = s.jobRepo.GetByIDInternal(ctx, jobID)
	p := ai.NextJobProgress(jobRow.Progress, model.GenJobStatusWaiting, "waiting", 0, startedAt)
	set, err := s.jobRepo.SetKieTask(ctx, jobID, taskID, model.GenJobStatusWaiting, p)
	if err != nil {
		return err
	}
	if !set {
		slog.Warn("kie video task already assigned", "job_id", jobID, "orphan_task_id", taskID)
		return nil
	}
	_ = s.jobRepo.UpdateProgress(ctx, jobID, model.GenJobStatusWaiting, "waiting", p, "", time.Now())
	return nil
}

func (s *GenerationService) pollKieVideoJob(ctx context.Context, job model.AIGenerationJob) (got429 bool, terminal bool, err error) {
	if s.kieVideoConfig == nil {
		return false, false, ErrVideoGenerationNotConfigured
	}
	baseURL, apiKey, err := s.kieVideoConfig.ResolveCredentials(ctx)
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

func (s *GenerationService) finalizeVideoJob(ctx context.Context, jobID string) error {
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
	if s.kieVideoConfig == nil {
		return ErrVideoGenerationNotConfigured
	}

	baseURL, apiKey, err := s.kieVideoConfig.ResolveCredentials(ctx)
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

	contentType, data, err := downloadRemoteFile(ctx, detail.ResultURL, 200<<20)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrGenerationFailed, err)
	}

	ext := ".mp4"
	if strings.Contains(contentType, "webm") {
		ext = ".webm"
	}

	key := videoGenerationResultS3Key(job.WorkspaceID, ext)
	if err := s.objectStore.PutObject(ctx, key, contentType, data); err != nil {
		return fmt.Errorf("%w: %v", ErrGenerationFailed, err)
	}

	previewKey := ""
	if previewData, err := extractVideoPreviewJPEG(data); err != nil {
		slog.Warn("video preview extract failed", "job_id", job.ID, "err", err)
	} else if len(previewData) > 0 {
		previewKey = videoGenerationPreviewS3Key(job.WorkspaceID)
		if err := s.objectStore.PutObject(ctx, previewKey, "image/jpeg", previewData); err != nil {
			slog.Warn("video preview upload failed", "job_id", job.ID, "err", err)
			previewKey = ""
		}
	}

	settings, _ := s.kieVideoConfig.GetSettings(ctx)
	kopecks := 5000
	if settings.KopecksPerMediaCredit > 0 {
		kopecks = settings.KopecksPerMediaCredit
	}

	record, err := s.genRepo.Create(ctx, model.AIGeneration{
		UserID:               job.UserID,
		WorkspaceID:          job.WorkspaceID,
		Mode:                 job.Mode,
		Prompt:               job.Prompt,
		Model:                job.Model,
		AspectRatio:          job.AspectRatio,
		ResultS3Key:          key,
		ResultContentType:    contentType,
		PreviewS3Key:         previewKey,
		VideoDurationSeconds: job.VideoDurationSeconds,
	})
	if err != nil {
		return err
	}

	if s.fileStorage != nil {
		wf, regErr := s.fileStorage.RegisterAIGenerationFile(ctx, job.WorkspaceID, job.UserID, record, int64(len(data)))
		if regErr != nil {
			slog.Warn("register ai video generation file", "generation_id", record.ID, "err", regErr)
		} else if wf != nil {
			_ = s.genRepo.SetWorkspaceFileID(ctx, record.ID, wf.ID)
		}
	}

	debit, err := s.aiBilling.DebitAfterSuccessWithKopecks(ctx, job.WorkspaceID, job.UserID, record.ID, job.CreditCost, kopecks)
	if err != nil {
		return err
	}

	if err := s.jobRepo.MarkSucceeded(ctx, job.ID, record.ID, debit.WalletCentsCharged, debit.QuotaCreditsUsed); err != nil {
		return err
	}
	if s.notify != nil {
		gid := record.ID
		job.GenerationID = &gid
		s.notify.NotifyAIDone(ctx, job)
		s.notify.MaybeUsageWarnings(ctx, job.WorkspaceID)
		s.notify.MaybeWalletLow(ctx, job.UserID)
	}
	return nil
}

func videoGenerationResultS3Key(workspaceID, ext string) string {
	return fmt.Sprintf("postilka/video-generations/%s/%s%s", workspaceID, uuid.NewString(), ext)
}

func videoGenerationPreviewS3Key(workspaceID string) string {
	return fmt.Sprintf("postilka/video-generations/%s/%s-preview.jpg", workspaceID, uuid.NewString())
}

func countNonEmptyIDs(ids []string) int {
	n := 0
	for _, id := range ids {
		if strings.TrimSpace(id) != "" {
			n++
		}
	}
	return n
}

func nonEmptyUploadIDs(ids []string) []string {
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		if id = strings.TrimSpace(id); id != "" {
			out = append(out, id)
		}
	}
	return out
}
