package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"path"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/postilka/postilka/internal/ai"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrGenerationNotConfigured  = errors.New("generation provider not configured")
	ErrGenerationFailed         = errors.New("generation failed")
	ErrGenerationSourceRequired = errors.New("generation source photo required")
	ErrGenerationCombineMin     = errors.New("combine mode requires at least 2 photos")
	ErrGenerationUploadNotFound = errors.New("generation upload not found")
	ErrGenerationUploadInvalid  = errors.New("generation upload invalid")
)

const generationModeFilter = "filter"

type GenerationService struct {
	kieConfig      *KieConfigService
	kieVideoConfig *KieVideoConfigService
	genRepo        *repository.AIGenerationRepository
	jobRepo        *repository.AIGenerationJobRepository
	uploadRepo     *repository.GenerationSourceUploadRepository
	aiBilling      *AIBillingService
	objectStore    *ObjectStorage
	fileStorage    *FileStorageService
	wsSvc          *WorkspaceService
	yandexGPT      *YandexGptConfigService
	quota          *QuotaService
	createGate     *kieCreateGate
}

func NewGenerationService(
	kieConfig *KieConfigService,
	kieVideoConfig *KieVideoConfigService,
	genRepo *repository.AIGenerationRepository,
	jobRepo *repository.AIGenerationJobRepository,
	uploadRepo *repository.GenerationSourceUploadRepository,
	aiBilling *AIBillingService,
	objectStore *ObjectStorage,
	fileStorage *FileStorageService,
	wsSvc *WorkspaceService,
	yandexGPT *YandexGptConfigService,
	quota *QuotaService,
) *GenerationService {
	return &GenerationService{
		kieConfig:      kieConfig,
		kieVideoConfig: kieVideoConfig,
		genRepo:        genRepo,
		jobRepo:     jobRepo,
		uploadRepo:  uploadRepo,
		aiBilling:   aiBilling,
		objectStore: objectStore,
		fileStorage: fileStorage,
		wsSvc:       wsSvc,
		yandexGPT:   yandexGPT,
		quota:       quota,
		createGate:  newKieCreateGate(),
	}
}

type GenerateImageInput struct {
	Mode             string
	Prompt           string
	AspectRatio      string
	SourceUploadID   string
	CombineUploadIDs []string
}

type StartGenerateResult struct {
	Job model.AIGenerationJobView
}

type GetGenerationJobResult struct {
	Job      model.AIGenerationJobView
	Credits  *model.MediaCreditsRemainingView
}

func (s *GenerationService) resolveWorkspace(ctx context.Context, userID string, r *http.Request) (*model.Workspace, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if ws == nil {
		return nil, ErrNoPrimaryWS
	}
	return ws, nil
}

func (s *GenerationService) StartGenerate(ctx context.Context, userID string, r *http.Request, in GenerateImageInput) (StartGenerateResult, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r)
	if err != nil {
		return StartGenerateResult{}, err
	}

	mode := normalizeGenerationMode(in.Mode)
	prompt := strings.TrimSpace(in.Prompt)
	if prompt == "" {
		return StartGenerateResult{}, errors.New("prompt is required")
	}
	if len(prompt) > 4000 {
		return StartGenerateResult{}, errors.New("prompt too long")
	}

	switch mode {
	case generationModeFilter, "image-to-image":
		if strings.TrimSpace(in.SourceUploadID) == "" {
			return StartGenerateResult{}, ErrGenerationSourceRequired
		}
	case "combine":
		valid := 0
		for _, id := range in.CombineUploadIDs {
			if strings.TrimSpace(id) != "" {
				valid++
			}
		}
		if valid < 2 {
			return StartGenerateResult{}, ErrGenerationCombineMin
		}
	}

	settings, err := s.kieConfig.GetSettings(ctx)
	if err != nil {
		return StartGenerateResult{}, err
	}

	cost := settings.TokenCostForGenerationMode(mode)
	if err := s.aiBilling.PrefailCheck(ctx, ws.ID, userID, cost); err != nil {
		return StartGenerateResult{}, err
	}

	modelID := ai.NormalizeKieModelID(modelForGenerationMode(settings, mode))
	if modelID == "" {
		modelID = ai.DefaultModelForMode(mode)
	}

	job, err := s.jobRepo.Create(ctx, model.AIGenerationJob{
		UserID:           userID,
		WorkspaceID:      ws.ID,
		Status:           model.GenJobStatusPreparing,
		Progress:         5,
		Mode:             mode,
		Prompt:           prompt,
		Model:            modelID,
		AspectRatio:      strings.TrimSpace(in.AspectRatio),
		SourceUploadID:   strings.TrimSpace(in.SourceUploadID),
		CombineUploadIDs: append([]string(nil), in.CombineUploadIDs...),
		CreditCost:       cost,
		PollAfter:        time.Now(),
	})
	if err != nil {
		return StartGenerateResult{}, err
	}

	return StartGenerateResult{Job: jobToView(job, nil)}, nil
}

func (s *GenerationService) GetJob(ctx context.Context, userID, jobID string) (GetGenerationJobResult, error) {
	job, err := s.jobRepo.GetByID(ctx, jobID, userID)
	if err != nil {
		return GetGenerationJobResult{}, err
	}

	var genView *model.AIGenerationView
	if job.GenerationID != nil {
		record, err := s.genRepo.GetByID(ctx, *job.GenerationID, userID)
		if err == nil {
			view := record.ToViewWithUsage(false)
			genView = &view
		}
	}

	out := GetGenerationJobResult{Job: jobToView(job, genView)}
	if job.Status == model.GenJobStatusSucceeded {
		credits, err := s.aiBilling.GetMediaCreditsRemaining(ctx, job.WorkspaceID, userID)
		if err == nil {
			out.Credits = &credits
		}
	}
	return out, nil
}

func jobToView(job model.AIGenerationJob, gen *model.AIGenerationView) model.AIGenerationJobView {
	failMsg := job.FailMessage
	if job.Status == model.GenJobStatusFailed && failMsg != "" {
		if model.IsVideoGenerationMode(job.Mode) {
			failMsg = UserVideoGenerationFailMessage(failMsg)
		} else {
			failMsg = UserGenerationFailMessage(failMsg)
		}
	}
	view := model.AIGenerationJobView{
		ID:                   job.ID,
		Status:               job.Status,
		KieState:             job.KieState,
		Progress:             job.Progress,
		Mode:                 job.Mode,
		CreditCost:           job.CreditCost,
		TokenCost:            job.CreditCost,
		FailMessage:          failMsg,
		Generation:           gen,
		VideoDurationSeconds: job.VideoDurationSeconds,
	}
	switch job.Status {
	case model.GenJobStatusSucceeded, model.GenJobStatusFailed:
		elapsed := int(job.UpdatedAt.Sub(job.CreatedAt).Milliseconds())
		if elapsed > 0 {
			view.DurationMs = elapsed
		}
	default:
		elapsed := int(time.Since(job.CreatedAt).Milliseconds())
		if elapsed > 0 {
			view.ElapsedMs = elapsed
		}
	}
	return view
}

func (s *GenerationService) GetPricing(ctx context.Context, userID string, r *http.Request) (model.GenerationPricingView, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r)
	if err != nil {
		return model.GenerationPricingView{}, err
	}
	settings, err := s.kieConfig.GetSettings(ctx)
	if err != nil {
		return model.GenerationPricingView{}, err
	}
	out := model.GenerationPricingView{
		TextToImage:  settings.TokenCostForGenerationMode("text-to-image"),
		ImageToImage: settings.TokenCostForGenerationMode("image-to-image"),
		Combine:      settings.TokenCostForGenerationMode("combine"),
	}
	priceRub := settings.MediaCreditPriceRub()
	out.MediaCreditPriceRub = priceRub
	out.TextToImageWalletRub = priceRub * float64(out.TextToImage)
	out.ImageToImageWalletRub = priceRub * float64(out.ImageToImage)
	out.CombineWalletRub = priceRub * float64(out.Combine)
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

func (s *GenerationService) ListHistory(ctx context.Context, userID string, r *http.Request, limit int) ([]model.AIGenerationView, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	items, err := s.genRepo.ListByWorkspaceWithUsage(ctx, ws.ID, limit)
	if err != nil {
		return nil, err
	}
	out := make([]model.AIGenerationView, 0, len(items))
	for _, item := range items {
		out = append(out, item.ToViewWithUsage(false))
	}
	return out, nil
}

func (s *GenerationService) ListUsageHistory(ctx context.Context, userID string, r *http.Request, limit int) ([]model.AIUsageHistoryItem, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	return s.jobRepo.ListUsageHistory(ctx, ws.ID, limit)
}

type DeleteGenerationsResult struct {
	DeletedIDs []string `json:"deleted_ids"`
}

func (s *GenerationService) DeleteGenerations(ctx context.Context, userID string, r *http.Request, rawIDs []string) (DeleteGenerationsResult, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r)
	if err != nil {
		return DeleteGenerationsResult{}, err
	}

	ids := make([]string, 0, len(rawIDs))
	seen := make(map[string]struct{}, len(rawIDs))
	for _, raw := range rawIDs {
		id := strings.TrimSpace(raw)
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		ids = append(ids, id)
	}
	if len(ids) == 0 {
		return DeleteGenerationsResult{}, errors.New("no valid ids")
	}

	owned, err := s.genRepo.ListOwnedByIDs(ctx, ws.ID, ids)
	if err != nil {
		return DeleteGenerationsResult{}, err
	}
	if len(owned) != len(ids) {
		return DeleteGenerationsResult{}, repository.ErrNotFound
	}

	for _, record := range owned {
		if strings.TrimSpace(record.ResultS3Key) != "" {
			_ = s.objectStore.DeleteObject(ctx, record.ResultS3Key)
		}
	}
	if err := s.genRepo.DeleteByIDs(ctx, ws.ID, ids); err != nil {
		return DeleteGenerationsResult{}, err
	}
	return DeleteGenerationsResult{DeletedIDs: ids}, nil
}

func (s *GenerationService) UploadSource(ctx context.Context, userID string, r *http.Request, file multipart.File, header *multipart.FileHeader) (model.GenerationSourceUploadView, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r)
	if err != nil {
		return model.GenerationSourceUploadView{}, err
	}
	if file == nil || header == nil {
		return model.GenerationSourceUploadView{}, ErrGenerationUploadInvalid
	}
	defer file.Close()

	const maxSize = 15 << 20
	data, err := io.ReadAll(io.LimitReader(file, maxSize+1))
	if err != nil {
		return model.GenerationSourceUploadView{}, err
	}
	if len(data) == 0 || len(data) > maxSize {
		return model.GenerationSourceUploadView{}, ErrGenerationUploadInvalid
	}

	contentType := strings.TrimSpace(header.Header.Get("Content-Type"))
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}
	contentType = strings.Split(contentType, ";")[0]
	if !strings.HasPrefix(contentType, "image/") {
		return model.GenerationSourceUploadView{}, ErrGenerationUploadInvalid
	}

	ext := path.Ext(header.Filename)
	if ext == "" {
		switch contentType {
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		default:
			ext = ".jpg"
		}
	}
	key := fmt.Sprintf("postilka/generation-sources/%s/%s%s", ws.ID, uuid.NewString(), ext)
	if err := s.objectStore.PutObject(ctx, key, contentType, data); err != nil {
		return model.GenerationSourceUploadView{}, err
	}

	upload, err := s.uploadRepo.Create(ctx, model.GenerationSourceUpload{
		UserID:      userID,
		WorkspaceID: ws.ID,
		S3Key:       key,
		ContentType: contentType,
	})
	if err != nil {
		_ = s.objectStore.DeleteObject(ctx, key)
		return model.GenerationSourceUploadView{}, err
	}
	return upload.ToView(), nil
}

func (s *GenerationService) ResultMediaURL(ctx context.Context, id, userID string) (string, error) {
	key, err := s.resultS3Key(ctx, id, userID)
	if err != nil {
		return "", err
	}
	return s.objectStore.PresignGet(ctx, key, 15*time.Minute, "")
}

func (s *GenerationService) ResultMediaObject(ctx context.Context, id, userID string) (io.ReadCloser, string, error) {
	key, err := s.resultS3Key(ctx, id, userID)
	if err != nil {
		return nil, "", err
	}
	return s.objectStore.GetObject(ctx, key)
}

func (s *GenerationService) resultS3Key(ctx context.Context, id, userID string) (string, error) {
	gen, err := s.genRepo.GetByID(ctx, id, userID)
	if err != nil {
		return "", err
	}
	key := strings.TrimSpace(gen.ResultS3Key)
	if key == "" {
		return "", repository.ErrNotFound
	}
	return key, nil
}

func (s *GenerationService) submitPendingJob(ctx context.Context, jobID string, createGate *kieCreateGate) error {
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

	userID := jobRow.UserID
	workspaceID := jobRow.WorkspaceID
	modelID := jobRow.Model
	mode := normalizeGenerationMode(jobRow.Mode)
	prompt := strings.TrimSpace(jobRow.Prompt)
	in := GenerateImageInput{
		Mode:             mode,
		Prompt:           prompt,
		AspectRatio:      jobRow.AspectRatio,
		SourceUploadID:   jobRow.SourceUploadID,
		CombineUploadIDs: append([]string(nil), jobRow.CombineUploadIDs...),
	}
	startedAt := jobRow.CreatedAt

	deferSubmit := func(rateLimited bool) {
		jobRow, _ = s.jobRepo.GetByIDInternal(ctx, jobID)
		p := ai.NextJobProgress(jobRow.Progress, model.GenJobStatusPreparing, "", 0, startedAt)
		retryAt := time.Now().Add(2 * time.Second)
		if rateLimited {
			retryAt = ai.NextCreateRetryAfter()
		}
		_ = s.jobRepo.UpdateProgress(ctx, jobID, model.GenJobStatusPreparing, "", p, "", retryAt)
	}

	p := ai.NextJobProgress(jobRow.Progress, model.GenJobStatusPreparing, "", 0, startedAt)
	_ = s.jobRepo.UpdateProgress(ctx, jobID, model.GenJobStatusPreparing, "", p, "", time.Now())

	baseURL, apiKey, err := s.kieConfig.ResolveCredentials(ctx)
	if err != nil {
		_ = s.jobRepo.MarkFailed(ctx, jobID, err.Error())
		return err
	}
	client := ai.NewKieClient(baseURL, apiKey)

	var imageURLs []string
	switch mode {
	case generationModeFilter, "image-to-image":
		sourceID := strings.TrimSpace(in.SourceUploadID)
		if sourceID == "" {
			_ = s.jobRepo.MarkFailed(ctx, jobID, ErrGenerationSourceRequired.Error())
			return ErrGenerationSourceRequired
		}
		urls, err := s.kieImageURLs(ctx, client, userID, workspaceID, []string{sourceID})
		if err != nil {
			if isKieRateLimited(err) {
				deferSubmit(true)
				return nil
			}
			_ = s.jobRepo.MarkFailed(ctx, jobID, generationFailMessage(err))
			return err
		}
		imageURLs = urls
	case "combine":
		if len(in.CombineUploadIDs) < 2 {
			_ = s.jobRepo.MarkFailed(ctx, jobID, ErrGenerationCombineMin.Error())
			return ErrGenerationCombineMin
		}
		urls, err := s.kieImageURLs(ctx, client, userID, workspaceID, in.CombineUploadIDs)
		if err != nil {
			if isKieRateLimited(err) {
				deferSubmit(true)
				return nil
			}
			_ = s.jobRepo.MarkFailed(ctx, jobID, generationFailMessage(err))
			return err
		}
		imageURLs = urls
	}

	jobRow, err = s.jobRepo.GetByIDInternal(ctx, jobID)
	if err != nil {
		return err
	}
	if strings.TrimSpace(jobRow.KieTaskID) != "" {
		return nil
	}
	p = ai.NextJobProgress(jobRow.Progress, model.GenJobStatusPreparing, "", 0, startedAt)
	_ = s.jobRepo.UpdateProgress(ctx, jobID, model.GenJobStatusPreparing, "", p, "", time.Now())

	if err := createGate.Wait(ctx); err != nil {
		deferSubmit(false)
		return err
	}

	jobRow, err = s.jobRepo.GetByIDInternal(ctx, jobID)
	if err != nil {
		return err
	}
	if strings.TrimSpace(jobRow.KieTaskID) != "" {
		return nil
	}

	kieMode := mode
	if mode == generationModeFilter {
		kieMode = "image-to-image"
	}
	aspectRatio := in.AspectRatio
	if mode == generationModeFilter {
		aspectRatio = "auto"
	}
	taskInput := ai.BuildGenerationTaskInput(modelID, kieMode, prompt, aspectRatio, imageURLs)
	taskID, err := client.CreateTask(ctx, ai.KieCreateTaskRequest{
		Model: modelID,
		Input: taskInput,
	})
	if err != nil {
		if isKieRateLimited(err) {
			deferSubmit(true)
			return nil
		}
		_ = s.jobRepo.MarkFailed(ctx, jobID, generationFailMessage(err))
		return err
	}

	jobRow, _ = s.jobRepo.GetByIDInternal(ctx, jobID)
	p = ai.NextJobProgress(jobRow.Progress, model.GenJobStatusWaiting, "waiting", 0, startedAt)
	_ = s.jobRepo.SetKieTask(ctx, jobID, taskID, model.GenJobStatusWaiting, p)
	_ = s.jobRepo.UpdateProgress(ctx, jobID, model.GenJobStatusWaiting, "waiting", p, "", time.Now())
	return nil
}

func generationFailMessage(err error) string {
	return normalizeProviderError(err.Error())
}

func (s *GenerationService) kieImageURLs(
	ctx context.Context,
	client *ai.KieClient,
	userID, workspaceID string,
	uploadIDs []string,
) ([]string, error) {
	out := make([]string, 0, len(uploadIDs))
	for _, rawID := range uploadIDs {
		id := strings.TrimSpace(rawID)
		if id == "" {
			return nil, ErrGenerationUploadNotFound
		}
		upload, err := s.uploadRepo.GetByID(ctx, id, userID, workspaceID)
		if err != nil {
			return nil, ErrGenerationUploadNotFound
		}
		body, contentType, err := s.objectStore.GetObject(ctx, upload.S3Key)
		if err != nil {
			return nil, fmt.Errorf("source photo read: %w", err)
		}
		data, err := io.ReadAll(io.LimitReader(body, 15<<20+1))
		_ = body.Close()
		if err != nil {
			return nil, err
		}
		if len(data) == 0 || len(data) > 15<<20 {
			return nil, ErrGenerationUploadInvalid
		}
		if ct := strings.TrimSpace(upload.ContentType); ct != "" {
			contentType = ct
		}
		kieURL, err := client.UploadFileStream(ctx, data, contentType, path.Base(upload.S3Key))
		if err != nil {
			return nil, fmt.Errorf("kie image upload: %w", err)
		}
		out = append(out, kieURL)
	}
	return out, nil
}

func normalizeGenerationMode(mode string) string {
	switch strings.TrimSpace(mode) {
	case generationModeFilter:
		return generationModeFilter
	case "image-to-image", "combine":
		return strings.TrimSpace(mode)
	default:
		return "text-to-image"
	}
}

func modelForGenerationMode(settings model.KieSettings, mode string) string {
	switch mode {
	case generationModeFilter:
		return strings.TrimSpace(settings.ModelFilter)
	case "image-to-image":
		return strings.TrimSpace(settings.ModelImageToImage)
	case "combine":
		return strings.TrimSpace(settings.ModelCombine)
	default:
		return strings.TrimSpace(settings.ModelTextToImage)
	}
}

func downloadGenerationImage(ctx context.Context, rawURL string) (contentType string, data []byte, err error) {
	u, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || u.Scheme != "http" && u.Scheme != "https" {
		return "", nil, fmt.Errorf("invalid download url")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return "", nil, err
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer res.Body.Close()
	if res.StatusCode >= 400 {
		return "", nil, fmt.Errorf("download failed with status %d", res.StatusCode)
	}
	raw, err := io.ReadAll(io.LimitReader(res.Body, 25<<20))
	if err != nil {
		return "", nil, err
	}
	ct := strings.TrimSpace(res.Header.Get("Content-Type"))
	if ct == "" {
		ct = http.DetectContentType(raw)
	}
	ct = strings.Split(ct, ";")[0]
	return ct, raw, nil
}

func generationResultS3Key(workspaceID, mode, ext string) string {
	folder := "generations"
	if mode == generationModeFilter {
		folder = "filters"
	}
	return fmt.Sprintf("postilka/%s/%s/%s%s", folder, workspaceID, uuid.NewString(), ext)
}
