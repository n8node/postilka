package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/url"
	"path"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/ai"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

var (
	ErrKieVideoExampleLimit      = errors.New("maximum number of video examples reached")
	ErrKieVideoExampleSourceReq  = errors.New("source image required for this video mode")
	ErrKieVideoExampleNotReady   = errors.New("video example is not ready")
)

type KieVideoExampleService struct {
	config      *KieVideoConfigService
	exampleRepo *repository.KieVideoExampleRepository
	objectStore *ObjectStorage
}

func NewKieVideoExampleService(
	config *KieVideoConfigService,
	exampleRepo *repository.KieVideoExampleRepository,
	objectStore *ObjectStorage,
) *KieVideoExampleService {
	return &KieVideoExampleService{config: config, exampleRepo: exampleRepo, objectStore: objectStore}
}

func (s *KieVideoExampleService) ListAdmin(ctx context.Context) ([]model.KieVideoExampleView, error) {
	items, err := s.exampleRepo.ListAll(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]model.KieVideoExampleView, 0, len(items))
	for _, item := range items {
		videoURL, _ := s.presignExampleVideo(ctx, item)
		out = append(out, item.ToAdminView(videoURL))
	}
	return out, nil
}

func (s *KieVideoExampleService) ListPublic(ctx context.Context) ([]model.KieVideoPublicExampleView, error) {
	items, err := s.exampleRepo.ListReady(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]model.KieVideoPublicExampleView, 0, len(items))
	for _, item := range items {
		videoURL, err := s.presignExampleVideo(ctx, item)
		if err != nil || videoURL == "" {
			continue
		}
		out = append(out, item.ToPublicView(videoURL))
	}
	return out, nil
}

func (s *KieVideoExampleService) Create(ctx context.Context, in model.KieVideoExampleCreateRequest, files []*multipart.FileHeader) (model.KieVideoExampleView, error) {
	readyCount, err := s.exampleRepo.CountReady(ctx)
	if err != nil {
		return model.KieVideoExampleView{}, err
	}
	if readyCount >= model.KieVideoExampleMaxCount {
		return model.KieVideoExampleView{}, ErrKieVideoExampleLimit
	}

	mode := strings.ToLower(strings.TrimSpace(in.Mode))
	switch mode {
	case model.KieVideoModeTextToVideo, model.KieVideoModeImageToVideo, model.KieVideoModeReferenceToVideo:
	default:
		return model.KieVideoExampleView{}, errors.New("invalid video mode")
	}

	prompt := strings.TrimSpace(in.Prompt)
	if prompt == "" {
		return model.KieVideoExampleView{}, errors.New("prompt is required")
	}
	if len(prompt) > 4000 {
		return model.KieVideoExampleView{}, errors.New("prompt too long")
	}

	settings, err := s.config.GetSettings(ctx)
	if err != nil {
		return model.KieVideoExampleView{}, err
	}

	duration := in.Duration
	if duration <= 0 {
		duration = settings.DefaultDurationForMode(mode)
	}
	duration = modelClampDuration(duration)
	aspectRatio := model.NormalizeVideoAspectRatio(in.AspectRatio)

	imageURLs := make([]string, 0, len(in.ImageURLs)+len(files))
	for _, raw := range in.ImageURLs {
		if u := strings.TrimSpace(raw); u != "" {
			imageURLs = append(imageURLs, u)
		}
	}

	if len(files) > 0 {
		uploaded, err := s.uploadSourceImages(ctx, files)
		if err != nil {
			return model.KieVideoExampleView{}, err
		}
		imageURLs = append(imageURLs, uploaded...)
	}

	switch mode {
	case model.KieVideoModeImageToVideo:
		if len(imageURLs) == 0 {
			return model.KieVideoExampleView{}, ErrKieVideoExampleSourceReq
		}
		imageURLs = imageURLs[:1]
	case model.KieVideoModeReferenceToVideo:
		if len(imageURLs) == 0 {
			return model.KieVideoExampleView{}, ErrKieVideoExampleSourceReq
		}
	}

	modelID := ai.NormalizeKieVideoModelID(settings.ModelForMode(mode))
	if modelID == "" {
		modelID = ai.DefaultVideoModelForMode(mode)
	}

	example, err := s.exampleRepo.Create(ctx, model.KieVideoExample{
		Mode:            mode,
		Prompt:          prompt,
		AspectRatio:     aspectRatio,
		Duration:        duration,
		ModelID:         modelID,
		Status:          model.KieVideoExamplePending,
		SourceImageURLs: imageURLs,
		SortOrder:       readyCount,
	})
	if err != nil {
		return model.KieVideoExampleView{}, err
	}

	if err := s.submitExampleTask(ctx, example); err != nil {
		_ = s.exampleRepo.MarkFailed(ctx, example.ID, err.Error())
		example.Status = model.KieVideoExampleFailed
		example.FailMessage = err.Error()
	}

	return example.ToAdminView(""), nil
}

func (s *KieVideoExampleService) Delete(ctx context.Context, id string) error {
	example, err := s.exampleRepo.Delete(ctx, id)
	if err != nil {
		return err
	}
	if key := strings.TrimSpace(example.ResultS3Key); key != "" && s.objectStore != nil {
		if delErr := s.objectStore.DeleteObject(ctx, key); delErr != nil {
			slog.Warn("delete kie video example object", "key", key, "err", delErr)
		}
	}
	return nil
}

func (s *KieVideoExampleService) StartWorker(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.pollExamples(ctx)
			}
		}
	}()
	slog.Info("kie video example worker started")
}

func (s *KieVideoExampleService) pollExamples(ctx context.Context) {
	ids, err := s.exampleRepo.ListDueForPoll(ctx, 20)
	if err != nil {
		slog.Error("list kie video examples", "err", err)
		return
	}
	for _, id := range ids {
		if ctx.Err() != nil {
			return
		}
		if err := s.processExample(ctx, id); err != nil {
			slog.Warn("process kie video example", "id", id, "err", err)
		}
	}
}

func (s *KieVideoExampleService) processExample(ctx context.Context, id string) error {
	example, err := s.exampleRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if example.Status == model.KieVideoExampleReady || example.Status == model.KieVideoExampleFailed {
		return nil
	}

	if strings.TrimSpace(example.KieTaskID) == "" {
		return s.submitExampleTask(ctx, example)
	}

	baseURL, apiKey, err := s.config.ResolveCredentials(ctx)
	if err != nil {
		return err
	}
	client := ai.NewKieClient(baseURL, apiKey)
	detail, err := client.GetTask(ctx, example.KieTaskID)
	if err != nil {
		return err
	}

	switch detail.State {
	case "success":
		if detail.ResultURL == "" {
			return s.exampleRepo.MarkFailed(ctx, id, "generation succeeded without result url")
		}
		contentType, data, err := downloadRemoteFile(ctx, detail.ResultURL, 200<<20)
		if err != nil {
			return s.exampleRepo.MarkFailed(ctx, id, err.Error())
		}
		ext := ".mp4"
		if strings.Contains(contentType, "webm") {
			ext = ".webm"
		}
		key := kieVideoExampleS3Key(example.ID, ext)
		if s.objectStore == nil {
			return s.exampleRepo.MarkFailed(ctx, id, "object storage not configured")
		}
		if err := s.objectStore.PutObject(ctx, key, contentType, data); err != nil {
			return s.exampleRepo.MarkFailed(ctx, id, err.Error())
		}
		return s.exampleRepo.MarkReady(ctx, id, key, contentType)
	case "fail":
		msg := strings.TrimSpace(detail.FailMsg)
		if msg == "" {
			msg = "generation failed"
		}
		return s.exampleRepo.MarkFailed(ctx, id, msg)
	default:
		return nil
	}
}

func (s *KieVideoExampleService) submitExampleTask(ctx context.Context, example model.KieVideoExample) error {
	baseURL, apiKey, err := s.config.ResolveCredentials(ctx)
	if err != nil {
		return err
	}
	client := ai.NewKieClient(baseURL, apiKey)

	kieURLs := append([]string(nil), example.SourceImageURLs...)
	for i, src := range kieURLs {
		if strings.HasPrefix(src, "http://") || strings.HasPrefix(src, "https://") {
			if uploaded, upErr := client.UploadFileFromURL(ctx, src, path.Base(src)); upErr == nil && uploaded != "" {
				kieURLs[i] = uploaded
			}
		}
	}

	taskInput := ai.BuildVideoTaskInput(
		example.ModelID, example.Mode, example.Prompt, example.AspectRatio, example.Duration, kieURLs,
	)
	taskID, err := client.CreateVideoTask(ctx, ai.KieCreateTaskRequest{
		Model: example.ModelID,
		Input: taskInput,
	})
	if err != nil {
		return err
	}
	return s.exampleRepo.MarkGenerating(ctx, example.ID, taskID)
}

func (s *KieVideoExampleService) uploadSourceImages(ctx context.Context, files []*multipart.FileHeader) ([]string, error) {
	if s.objectStore == nil {
		return nil, errors.New("object storage not configured")
	}
	out := make([]string, 0, len(files))
	for _, fh := range files {
		if fh == nil {
			continue
		}
		f, err := fh.Open()
		if err != nil {
			return nil, err
		}
		data, err := io.ReadAll(io.LimitReader(f, 20<<20))
		_ = f.Close()
		if err != nil {
			return nil, err
		}
		if len(data) == 0 {
			continue
		}
		contentType := fh.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "image/jpeg"
		}
		ext := path.Ext(fh.Filename)
		if ext == "" {
			ext = ".jpg"
		}
		key := fmt.Sprintf("platform/kie-video-examples/sources/%d%s", time.Now().UnixNano(), ext)
		if err := s.objectStore.PutObject(ctx, key, contentType, data); err != nil {
			return nil, err
		}
		signed, err := s.objectStore.PresignGet(ctx, key, 7*24*time.Hour, "")
		if err != nil {
			return nil, err
		}
		out = append(out, signed)
	}
	return out, nil
}

func (s *KieVideoExampleService) presignExampleVideo(ctx context.Context, example model.KieVideoExample) (string, error) {
	key := strings.TrimSpace(example.ResultS3Key)
	if key == "" || s.objectStore == nil {
		return "", nil
	}
	return s.objectStore.PresignGet(ctx, key, time.Hour, "")
}

func kieVideoExampleS3Key(exampleID, ext string) string {
	return fmt.Sprintf("platform/kie-video-examples/results/%s%s", exampleID, ext)
}

func downloadRemoteFile(ctx context.Context, rawURL string, maxBytes int64) (contentType string, data []byte, err error) {
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
	raw, err := io.ReadAll(io.LimitReader(res.Body, maxBytes))
	if err != nil {
		return "", nil, err
	}
	contentType = strings.TrimSpace(res.Header.Get("Content-Type"))
	if contentType == "" {
		contentType = "video/mp4"
	}
	return contentType, raw, nil
}
