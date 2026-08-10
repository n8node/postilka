package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

const (
	AIContentFolderName = "AI контент"
	FolderKindAIContent = "ai_content"
)

func (s *FileStorageService) EnsureAIContentFolder(ctx context.Context, workspaceID string) (*model.WorkspaceFolder, error) {
	f, err := s.folders.GetByKind(ctx, workspaceID, FolderKindAIContent)
	if err == nil {
		return f, nil
	}
	if !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}
	kind := FolderKindAIContent
	return s.folders.Create(ctx, &model.WorkspaceFolder{
		WorkspaceID: workspaceID,
		Name:        AIContentFolderName,
		Kind:        &kind,
	})
}

func (s *FileStorageService) RegisterAIGenerationFile(
	ctx context.Context,
	workspaceID, userID string,
	gen model.AIGeneration,
	size int64,
) (*model.WorkspaceFile, error) {
	if size <= 0 {
		return nil, ErrEmptyFile
	}
	folder, err := s.EnsureAIContentFolder(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	if err := s.reserveStorage(ctx, workspaceID, size); err != nil {
		return nil, err
	}
	uid := userID
	folderID := folder.ID
	name := buildAIGenerationFileName(gen)
	meta, _ := json.Marshal(map[string]string{
		"source":        "ai_generation",
		"generation_id": gen.ID,
		"mode":          gen.Mode,
	})
	created, err := s.files.Create(ctx, &model.WorkspaceFile{
		WorkspaceID:      workspaceID,
		FolderID:         &folderID,
		UploadedByUserID: &uid,
		Name:             name,
		MimeType:         gen.ResultContentType,
		Size:             size,
		S3Key:            gen.ResultS3Key,
		MediaMetadata:    meta,
	})
	if err != nil {
		_ = s.releaseStorage(ctx, workspaceID, size)
		return nil, err
	}
	return created, nil
}

func buildAIGenerationFileName(gen model.AIGeneration) string {
	modeLabel := aiGenerationModeLabel(gen.Mode)
	ts := gen.CreatedAt
	if ts.IsZero() {
		ts = time.Now().UTC()
	}
	stamp := ts.In(time.FixedZone("MSK", 3*3600)).Format("2006-01-02 15-04")
	ext := ".jpg"
	switch gen.ResultContentType {
	case "image/png":
		ext = ".png"
	case "image/webp":
		ext = ".webp"
	case "video/mp4":
		ext = ".mp4"
	}
	name := fmt.Sprintf("AI — %s — %s%s", modeLabel, stamp, ext)
	if len(name) > 200 {
		name = name[:200-len(ext)] + ext
	}
	return name
}

func aiGenerationModeLabel(mode string) string {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case "image-to-image", "filter":
		return "Фото → фото"
	case "combine":
		return "Комбинация"
	case model.KieVideoModeTextToVideo:
		return "Текст → видео"
	case model.KieVideoModeImageToVideo:
		return "Фото → видео"
	case model.KieVideoModeReferenceToVideo:
		return "Референс → видео"
	default:
		return "Текст → фото"
	}
}
