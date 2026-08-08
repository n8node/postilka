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
	ErrFileNotFound       = errors.New("file not found")
	ErrFolderNotFound     = errors.New("folder not found")
	ErrStorageQuota       = errors.New("storage quota exceeded")
	ErrFileTooLarge       = errors.New("file too large")
	ErrEmptyFile          = errors.New("empty file not allowed")
	ErrInvalidTransfer    = errors.New("invalid transfer")
	ErrTrashNotEnabled    = errors.New("trash not enabled")
)

type FileStorageService struct {
	files      *repository.WorkspaceFileRepository
	folders    *repository.WorkspaceFolderRepository
	workspaces *repository.WorkspaceRepository
	plans      *repository.PlanRepository
	wsSvc      *WorkspaceService
	storage    *ObjectStorage
	sessions   *UploadSessionService
}

func NewFileStorageService(
	files *repository.WorkspaceFileRepository,
	folders *repository.WorkspaceFolderRepository,
	workspaces *repository.WorkspaceRepository,
	plans *repository.PlanRepository,
	wsSvc *WorkspaceService,
	storage *ObjectStorage,
	sessions *UploadSessionService,
) *FileStorageService {
	return &FileStorageService{
		files: files, folders: folders, workspaces: workspaces, plans: plans,
		wsSvc: wsSvc, storage: storage, sessions: sessions,
	}
}

func (s *FileStorageService) resolveWorkspace(ctx context.Context, userID string, r *http.Request, minRole model.WorkspaceRole) (*model.Workspace, error) {
	ws, _, err := s.wsSvc.ResolveActive(ctx, userID, r)
	if err != nil {
		return nil, err
	}
	if ws == nil {
		return nil, ErrWorkspaceNotFound
	}
	return s.wsSvc.RequireMembership(ctx, userID, ws.ID, minRole)
}

func (s *FileStorageService) planQuota(ctx context.Context, workspaceID string) (*int64, int, error) {
	planID, _, err := s.workspaces.GetPlanMeta(ctx, workspaceID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			free, freeErr := s.plans.GetDefaultFree(ctx)
			if freeErr != nil {
				return nil, 0, freeErr
			}
			return free.StorageBytes, free.TrashRetentionDays, nil
		}
		return nil, 0, err
	}
	plan, err := s.plans.GetByID(ctx, planID)
	if err != nil {
		return nil, 0, err
	}
	return plan.StorageBytes, plan.TrashRetentionDays, nil
}

func (s *FileStorageService) reserveStorage(ctx context.Context, workspaceID string, size int64) error {
	if size <= 0 {
		return ErrEmptyFile
	}
	quota, _, err := s.planQuota(ctx, workspaceID)
	if err != nil {
		return err
	}
	ok, err := s.workspaces.TryIncrementStorage(ctx, workspaceID, size, quota)
	if err != nil {
		return err
	}
	if !ok {
		return ErrStorageQuota
	}
	return nil
}

func (s *FileStorageService) releaseStorage(ctx context.Context, workspaceID string, size int64) error {
	return s.workspaces.DecrementStorage(ctx, workspaceID, size)
}

func (s *FileStorageService) GetStorageStats(ctx context.Context, userID string, r *http.Request) (*model.WorkspaceStorageStats, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleViewer)
	if err != nil {
		return nil, err
	}
	used, err := s.workspaces.GetStorageUsed(ctx, ws.ID)
	if err != nil {
		return nil, err
	}
	trashBytes, err := s.files.SumTrashSize(ctx, ws.ID)
	if err != nil {
		return nil, err
	}
	count, err := s.files.CountActive(ctx, ws.ID)
	if err != nil {
		return nil, err
	}
	quota, retention, err := s.planQuota(ctx, ws.ID)
	if err != nil {
		return nil, err
	}
	return &model.WorkspaceStorageStats{
		UsedBytes:          used,
		QuotaBytes:         quota,
		TrashBytes:         trashBytes,
		TrashRetentionDays: retention,
		FileCount:          count,
	}, nil
}

func (s *FileStorageService) UploadInit(ctx context.Context, userID string, r *http.Request, req model.FileUploadInitRequest) (*model.FileUploadInitResponse, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, fmt.Errorf("name required")
	}
	if req.Size <= 0 {
		return nil, ErrEmptyFile
	}
	cat := fileCategoryFromMime(req.MimeType, name)
	maxSize := maxFileSizeBytes(cat)
	if req.Size > maxSize {
		return nil, ErrFileTooLarge
	}
	if err := s.folders.FolderExistsActive(ctx, ws.ID, req.FolderID); err != nil {
		return nil, ErrFolderNotFound
	}
	used, err := s.workspaces.GetStorageUsed(ctx, ws.ID)
	if err != nil {
		return nil, err
	}
	quota, _, err := s.planQuota(ctx, ws.ID)
	if err != nil {
		return nil, err
	}
	if quota != nil && used+req.Size > *quota {
		return nil, ErrStorageQuota
	}
	s3Key := BuildWorkspaceS3Key(ws.ID, name, req.FolderID)
	presigned, err := s.storage.PresignPut(ctx, s3Key, req.MimeType, 15*time.Minute)
	if err != nil {
		return nil, err
	}
	token, err := s.sessions.Create(UploadSessionClaims{
		WorkspaceID:          ws.ID,
		UserID:               userID,
		S3Key:                s3Key,
		Name:                 name,
		MimeType:             req.MimeType,
		Size:                 req.Size,
		FolderID:             req.FolderID,
		MediaDurationSeconds: req.MediaDurationSeconds,
	})
	if err != nil {
		return nil, err
	}
	return &model.FileUploadInitResponse{
		UploadURL:          presigned.URL,
		UploadHeaders:      presigned.Headers,
		UploadSessionToken: token,
	}, nil
}

func (s *FileStorageService) UploadComplete(ctx context.Context, userID string, r *http.Request, token string) (*model.WorkspaceFile, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	claims, err := s.sessions.Verify(token)
	if err != nil {
		return nil, err
	}
	if claims.WorkspaceID != ws.ID || claims.UserID != userID {
		return nil, ErrForbidden
	}
	if existing, err := s.files.GetByS3Key(ctx, ws.ID, claims.S3Key); err == nil {
		return existing, nil
	} else if !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}
	head, err := s.storage.HeadObject(ctx, claims.S3Key)
	if err != nil {
		return nil, fmt.Errorf("upload not found in storage")
	}
	if head.Size != claims.Size {
		return nil, fmt.Errorf("upload size mismatch")
	}
	if err := s.reserveStorage(ctx, ws.ID, claims.Size); err != nil {
		return nil, err
	}
	mime := claims.MimeType
	if head.ContentType != "" {
		mime = head.ContentType
	}
	var mediaMeta json.RawMessage
	if claims.MediaDurationSeconds != nil && *claims.MediaDurationSeconds > 0 {
		b, _ := json.Marshal(map[string]int{"duration_seconds": *claims.MediaDurationSeconds})
		mediaMeta = b
	}
	uid := userID
	created, err := s.files.Create(ctx, &model.WorkspaceFile{
		WorkspaceID:      ws.ID,
		FolderID:         claims.FolderID,
		UploadedByUserID: &uid,
		Name:             claims.Name,
		MimeType:         mime,
		Size:             claims.Size,
		S3Key:            claims.S3Key,
		MediaMetadata:    mediaMeta,
	})
	if err != nil {
		_ = s.releaseStorage(ctx, ws.ID, claims.Size)
		return nil, err
	}
	return created, nil
}

func (s *FileStorageService) ListFiles(ctx context.Context, userID string, r *http.Request, section string, folderID *string) ([]model.WorkspaceFile, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleViewer)
	if err != nil {
		return nil, err
	}
	filter := repository.ListFilesFilter{WorkspaceID: ws.ID, FolderID: folderID}
	switch section {
	case "recent":
		filter.ScopeAll = true
		filter.RecentOnly = true
		filter.Limit = 200
	case "photos":
		filter.ScopeAll = true
		filter.TypeFilter = "image"
	case "videos":
		filter.ScopeAll = true
		filter.TypeFilter = "video"
	default:
		if folderID != nil && *folderID != "" {
			if err := s.folders.FolderExistsActive(ctx, ws.ID, folderID); err != nil {
				return nil, ErrFolderNotFound
			}
		}
	}
	return s.files.List(ctx, filter)
}

func (s *FileStorageService) ListFolders(ctx context.Context, userID string, r *http.Request, parentID *string) ([]model.WorkspaceFolder, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleViewer)
	if err != nil {
		return nil, err
	}
	items, err := s.folders.List(ctx, ws.ID, parentID, false)
	if err != nil {
		return nil, err
	}
	for i := range items {
		n, _ := s.folders.CountFilesInFolder(ctx, items[i].ID)
		items[i].FilesCount = n
	}
	return items, nil
}

func (s *FileStorageService) CreateFolder(ctx context.Context, userID string, r *http.Request, name string, parentID *string) (*model.WorkspaceFolder, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("name required")
	}
	if err := s.folders.FolderExistsActive(ctx, ws.ID, parentID); err != nil {
		return nil, ErrFolderNotFound
	}
	return s.folders.Create(ctx, &model.WorkspaceFolder{
		WorkspaceID: ws.ID,
		ParentID:    parentID,
		Name:        name,
	})
}

func (s *FileStorageService) RenameFile(ctx context.Context, userID string, r *http.Request, fileID, name string) (*model.WorkspaceFile, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("name required")
	}
	f, err := s.files.UpdateName(ctx, ws.ID, fileID, name)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrFileNotFound
	}
	return f, err
}

func (s *FileStorageService) MoveFile(ctx context.Context, userID string, r *http.Request, fileID string, folderID *string) (*model.WorkspaceFile, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	if err := s.folders.FolderExistsActive(ctx, ws.ID, folderID); err != nil {
		return nil, ErrFolderNotFound
	}
	f, err := s.files.UpdateFolder(ctx, ws.ID, fileID, folderID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrFileNotFound
	}
	return f, err
}

func (s *FileStorageService) CopyFile(ctx context.Context, userID string, r *http.Request, fileID string, folderID *string) (*model.WorkspaceFile, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	if err := s.folders.FolderExistsActive(ctx, ws.ID, folderID); err != nil {
		return nil, ErrFolderNotFound
	}
	src, err := s.files.GetByID(ctx, ws.ID, fileID, false)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrFileNotFound
	}
	if err != nil {
		return nil, err
	}
	dupName := BuildDuplicateName(src.Name)
	newKey := BuildWorkspaceS3Key(ws.ID, dupName, folderID)
	if err := s.reserveStorage(ctx, ws.ID, src.Size); err != nil {
		return nil, err
	}
	if err := s.storage.CopyObject(ctx, src.S3Key, newKey); err != nil {
		_ = s.releaseStorage(ctx, ws.ID, src.Size)
		return nil, err
	}
	uid := userID
	created, err := s.files.Create(ctx, &model.WorkspaceFile{
		WorkspaceID:      ws.ID,
		FolderID:         folderID,
		UploadedByUserID: &uid,
		Name:             dupName,
		MimeType:         src.MimeType,
		Size:             src.Size,
		S3Key:            newKey,
		MediaMetadata:    src.MediaMetadata,
	})
	if err != nil {
		_ = s.storage.DeleteObject(ctx, newKey)
		_ = s.releaseStorage(ctx, ws.ID, src.Size)
		return nil, err
	}
	return created, nil
}

func (s *FileStorageService) RenameFolder(ctx context.Context, userID string, r *http.Request, folderID, name string) (*model.WorkspaceFolder, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("name required")
	}
	f, err := s.folders.UpdateName(ctx, ws.ID, folderID, name)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrFolderNotFound
	}
	return f, err
}

func (s *FileStorageService) MoveFolder(ctx context.Context, userID string, r *http.Request, folderID string, parentID *string) (*model.WorkspaceFolder, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	if folderID == "" {
		return nil, ErrFolderNotFound
	}
	if parentID != nil && *parentID == folderID {
		return nil, fmt.Errorf("cannot move folder into itself")
	}
	if parentID != nil && *parentID != "" {
		desc, err := s.folders.IsDescendantOf(ctx, *parentID, folderID)
		if err != nil {
			return nil, err
		}
		if desc {
			return nil, fmt.Errorf("cannot move folder into descendant")
		}
	}
	if err := s.folders.FolderExistsActive(ctx, ws.ID, parentID); err != nil {
		return nil, ErrFolderNotFound
	}
	f, err := s.folders.UpdateParent(ctx, ws.ID, folderID, parentID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrFolderNotFound
	}
	return f, err
}

func (s *FileStorageService) DownloadURL(ctx context.Context, userID string, r *http.Request, fileID string) (string, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleViewer)
	if err != nil {
		return "", err
	}
	f, err := s.files.GetByID(ctx, ws.ID, fileID, false)
	if errors.Is(err, repository.ErrNotFound) {
		return "", ErrFileNotFound
	}
	if err != nil {
		return "", err
	}
	return s.storage.PresignGet(ctx, f.S3Key, 15*time.Minute, f.Name)
}

func (s *FileStorageService) Breadcrumbs(ctx context.Context, userID string, r *http.Request, folderID string) ([]model.FolderBreadcrumb, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleViewer)
	if err != nil {
		return nil, err
	}
	crumbs, err := s.folders.Breadcrumbs(ctx, ws.ID, folderID)
	if err != nil {
		return nil, err
	}
	out := []model.FolderBreadcrumb{{ID: nil, Name: "Мои файлы"}}
	out = append(out, crumbs...)
	return out, nil
}

func trashBatchID() string {
	return fmt.Sprintf("trash_%d", time.Now().UnixMilli())
}

func (s *FileStorageService) DeleteFile(ctx context.Context, userID string, r *http.Request, fileID string) (trashed bool, err error) {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return false, err
	}
	_, retention, err := s.planQuota(ctx, ws.ID)
	if err != nil {
		return false, err
	}
	if retention > 0 {
		if err := s.files.SoftDelete(ctx, ws.ID, fileID, trashBatchID(), time.Now().UTC()); err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				return false, ErrFileNotFound
			}
			return false, err
		}
		return true, nil
	}
	f, err := s.files.GetByID(ctx, ws.ID, fileID, false)
	if errors.Is(err, repository.ErrNotFound) {
		return false, ErrFileNotFound
	}
	if err != nil {
		return false, err
	}
	if err := s.storage.DeleteObject(ctx, f.S3Key); err != nil {
		return false, err
	}
	if _, err := s.files.DeletePermanentByID(ctx, ws.ID, fileID); err != nil {
		return false, err
	}
	_ = s.releaseStorage(ctx, ws.ID, f.Size)
	return false, nil
}

func (s *FileStorageService) DeleteFolder(ctx context.Context, userID string, r *http.Request, folderID string) (trashed bool, err error) {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return false, err
	}
	if _, err := s.folders.GetByID(ctx, ws.ID, folderID, false); errors.Is(err, repository.ErrNotFound) {
		return false, ErrFolderNotFound
	} else if err != nil {
		return false, err
	}
	_, retention, err := s.planQuota(ctx, ws.ID)
	if err != nil {
		return false, err
	}
	batch := trashBatchID()
	now := time.Now().UTC()
	folderIDs, err := s.folders.CollectSubtreeIDs(ctx, folderID, true)
	if err != nil {
		return false, err
	}
	var fileIDs []string
	for _, fid := range folderIDs {
		ids, err := s.files.CollectIDsInFolder(ctx, fid, true)
		if err != nil {
			return false, err
		}
		fileIDs = append(fileIDs, ids...)
	}
	if retention > 0 {
		if err := s.files.SoftDeleteMany(ctx, ws.ID, fileIDs, batch, now); err != nil {
			return false, err
		}
		if err := s.folders.SoftDeleteMany(ctx, ws.ID, folderIDs, batch, now); err != nil {
			return false, err
		}
		return true, nil
	}
	files, err := s.files.ListByFolderRecursive(ctx, folderID, true)
	if err != nil {
		return false, err
	}
	for _, f := range files {
		_ = s.storage.DeleteObject(ctx, f.S3Key)
		_, _ = s.files.DeletePermanentByID(ctx, ws.ID, f.ID)
		_ = s.releaseStorage(ctx, ws.ID, f.Size)
	}
	_ = s.folders.DeleteByIDs(ctx, ws.ID, folderIDs)
	return false, nil
}

func (s *FileStorageService) ListTrash(ctx context.Context, userID string, r *http.Request) (files []model.WorkspaceFile, folders []model.WorkspaceFolder, err error) {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleViewer)
	if err != nil {
		return nil, nil, err
	}
	files, err = s.files.ListTrashedTopLevel(ctx, ws.ID)
	if err != nil {
		return nil, nil, err
	}
	folders, err = s.folders.ListTrashedTopLevel(ctx, ws.ID)
	return files, folders, err
}

func (s *FileStorageService) RestoreTrash(ctx context.Context, userID string, r *http.Request, req model.TrashRestoreRequest) error {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return err
	}
	for _, fileID := range req.FileIDs {
		f, err := s.files.GetByID(ctx, ws.ID, fileID, true)
		if errors.Is(err, repository.ErrNotFound) {
			continue
		}
		if err != nil {
			return err
		}
		targetFolder := f.FolderID
		if targetFolder != nil {
			if err := s.folders.FolderExistsActive(ctx, ws.ID, targetFolder); err != nil {
				targetFolder = nil
			}
		}
		if err := s.files.Restore(ctx, ws.ID, fileID, targetFolder); err != nil && !errors.Is(err, repository.ErrNotFound) {
			return err
		}
	}
	for _, folderID := range req.FolderIDs {
		fo, err := s.folders.GetByID(ctx, ws.ID, folderID, true)
		if errors.Is(err, repository.ErrNotFound) {
			continue
		}
		if err != nil {
			return err
		}
		targetParent := fo.ParentID
		if targetParent != nil {
			if err := s.folders.FolderExistsActive(ctx, ws.ID, targetParent); err != nil {
				targetParent = nil
			}
		}
		if fo.TrashBatchID != nil {
			_ = s.files.RestoreByBatch(ctx, ws.ID, *fo.TrashBatchID)
			_ = s.folders.RestoreByBatch(ctx, ws.ID, *fo.TrashBatchID)
		}
		if targetParent != fo.ParentID {
			_, _ = s.folders.UpdateParent(ctx, ws.ID, folderID, targetParent)
		}
	}
	return nil
}

func (s *FileStorageService) EmptyTrash(ctx context.Context, userID string, r *http.Request) (int, int64, error) {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return 0, 0, err
	}
	deleted, err := s.files.DeleteAllTrashed(ctx, ws.ID)
	if err != nil {
		return 0, 0, err
	}
	var freed int64
	for _, f := range deleted {
		_ = s.storage.DeleteObject(ctx, f.S3Key)
		freed += f.Size
	}
	_ = s.folders.DeleteAllTrashed(ctx, ws.ID)
	if freed > 0 {
		_ = s.releaseStorage(ctx, ws.ID, freed)
	}
	return len(deleted), freed, nil
}

func (s *FileStorageService) PermanentDeleteFile(ctx context.Context, userID string, r *http.Request, fileID string) error {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return err
	}
	f, err := s.files.DeletePermanent(ctx, ws.ID, fileID)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrFileNotFound
	}
	if err != nil {
		return err
	}
	_ = s.storage.DeleteObject(ctx, f.S3Key)
	_ = s.releaseStorage(ctx, ws.ID, f.Size)
	return nil
}

func (s *FileStorageService) PermanentDeleteFolder(ctx context.Context, userID string, r *http.Request, folderID string) error {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return err
	}
	files, err := s.files.ListByFolderRecursive(ctx, folderID, false)
	if err != nil {
		return err
	}
	var freed int64
	for _, f := range files {
		if f.DeletedAt == nil {
			continue
		}
		_ = s.storage.DeleteObject(ctx, f.S3Key)
		if df, err := s.files.DeletePermanent(ctx, ws.ID, f.ID); err == nil {
			freed += df.Size
		}
	}
	folderIDs, _ := s.folders.CollectSubtreeIDs(ctx, folderID, false)
	_ = s.folders.DeleteByIDs(ctx, ws.ID, folderIDs)
	if freed > 0 {
		_ = s.releaseStorage(ctx, ws.ID, freed)
	}
	return nil
}

func (s *FileStorageService) BulkFiles(ctx context.Context, userID string, r *http.Request, req model.FileBulkRequest) (int, []map[string]string, error) {
	var errorsOut []map[string]string
	ok := 0
	for _, id := range req.IDs {
		var err error
		switch req.Action {
		case "delete":
			_, err = s.DeleteFile(ctx, userID, r, id)
		case "move":
			_, err = s.MoveFile(ctx, userID, r, id, req.FolderID)
		case "copy":
			_, err = s.CopyFile(ctx, userID, r, id, req.FolderID)
		default:
			return ok, errorsOut, fmt.Errorf("unknown action")
		}
		if err != nil {
			errorsOut = append(errorsOut, map[string]string{"id": id, "message": err.Error()})
		} else {
			ok++
		}
	}
	return ok, errorsOut, nil
}

func (s *FileStorageService) BulkFolders(ctx context.Context, userID string, r *http.Request, req model.FolderBulkRequest) (int, []map[string]string, error) {
	var errorsOut []map[string]string
	ok := 0
	for _, id := range req.IDs {
		var err error
		switch req.Action {
		case "delete":
			_, err = s.DeleteFolder(ctx, userID, r, id)
		case "move":
			_, err = s.MoveFolder(ctx, userID, r, id, req.ParentID)
		case "copy":
			err = s.copyFolderRecursive(ctx, userID, r, id, req.ParentID)
		default:
			return ok, errorsOut, fmt.Errorf("unknown action")
		}
		if err != nil {
			errorsOut = append(errorsOut, map[string]string{"id": id, "message": err.Error()})
		} else {
			ok++
		}
	}
	return ok, errorsOut, nil
}

func (s *FileStorageService) copyFolderRecursive(ctx context.Context, userID string, r *http.Request, sourceID string, targetParentID *string) error {
	ws, err := s.resolveWorkspace(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return err
	}
	src, err := s.folders.GetByID(ctx, ws.ID, sourceID, false)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrFolderNotFound
	}
	if err != nil {
		return err
	}
	if err := s.folders.FolderExistsActive(ctx, ws.ID, targetParentID); err != nil {
		return ErrFolderNotFound
	}
	dupName := BuildDuplicateName(src.Name)
	if strings.Contains(dupName, ".") == false {
		dupName = BuildDuplicateName(src.Name)
	}
	// folder duplicate without extension trick
	dupName = src.Name + " (дубликат)"
	created, err := s.folders.Create(ctx, &model.WorkspaceFolder{
		WorkspaceID: ws.ID,
		ParentID:    targetParentID,
		Name:        dupName,
	})
	if err != nil {
		return err
	}
	files, err := s.files.List(ctx, repository.ListFilesFilter{
		WorkspaceID: ws.ID,
		FolderID:    &sourceID,
	})
	if err != nil {
		return err
	}
	for _, f := range files {
		fid := created.ID
		if _, err := s.CopyFile(ctx, userID, r, f.ID, &fid); err != nil {
			return err
		}
	}
	children, err := s.folders.List(ctx, ws.ID, &sourceID, false)
	if err != nil {
		return err
	}
	for _, ch := range children {
		pid := created.ID
		if err := s.copyFolderRecursive(ctx, userID, r, ch.ID, &pid); err != nil {
			return err
		}
	}
	return nil
}

func (s *FileStorageService) TransferFile(ctx context.Context, userID string, r *http.Request, fileID string, req model.FileTransferRequest) (*model.WorkspaceFile, error) {
	srcWS, err := s.resolveWorkspace(ctx, userID, r, model.RoleEditor)
	if err != nil {
		return nil, err
	}
	if req.Mode != "copy" && req.Mode != "move" {
		return nil, ErrInvalidTransfer
	}
	if req.Mode == "move" {
		return nil, fmt.Errorf("перенос между пространствами пока доступен только как копирование")
	}
	if _, err := s.wsSvc.RequireMembership(ctx, userID, req.TargetWorkspaceID, model.RoleEditor); err != nil {
		return nil, err
	}
	if err := s.folders.FolderExistsActive(ctx, req.TargetWorkspaceID, req.TargetFolderID); err != nil {
		return nil, ErrFolderNotFound
	}
	src, err := s.files.GetByID(ctx, srcWS.ID, fileID, false)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrFileNotFound
	}
	if err != nil {
		return nil, err
	}
	dupName := BuildDuplicateName(src.Name)
	newKey := BuildWorkspaceS3Key(req.TargetWorkspaceID, dupName, req.TargetFolderID)
	if err := s.reserveStorage(ctx, req.TargetWorkspaceID, src.Size); err != nil {
		return nil, err
	}
	if err := s.storage.CopyObject(ctx, src.S3Key, newKey); err != nil {
		_ = s.releaseStorage(ctx, req.TargetWorkspaceID, src.Size)
		return nil, err
	}
	uid := userID
	created, err := s.files.Create(ctx, &model.WorkspaceFile{
		WorkspaceID:      req.TargetWorkspaceID,
		FolderID:         req.TargetFolderID,
		UploadedByUserID: &uid,
		Name:             dupName,
		MimeType:         src.MimeType,
		Size:             src.Size,
		S3Key:            newKey,
		MediaMetadata:    src.MediaMetadata,
	})
	if err != nil {
		_ = s.storage.DeleteObject(ctx, newKey)
		_ = s.releaseStorage(ctx, req.TargetWorkspaceID, src.Size)
		return nil, err
	}
	return created, nil
}

func (s *FileStorageService) PurgeExpiredTrash(ctx context.Context) (int, error) {
	workspaceIDs, err := s.folders.WorkspaceIDsWithTrash(ctx)
	if err != nil {
		return 0, err
	}
	total := 0
	for _, wsID := range workspaceIDs {
		_, retention, err := s.planQuota(ctx, wsID)
		if err != nil {
			continue
		}
		if retention <= 0 {
			n, _, _ := s.emptyTrashForWorkspace(ctx, wsID)
			total += n
			continue
		}
		cutoff := time.Now().UTC().Add(-time.Duration(retention) * 24 * time.Hour)
		expired, err := s.files.ListExpiredTrashed(ctx, wsID, cutoff)
		if err != nil {
			continue
		}
		var freed int64
		for _, f := range expired {
			_ = s.storage.DeleteObject(ctx, f.S3Key)
			if df, err := s.files.DeletePermanent(ctx, wsID, f.ID); err == nil {
				freed += df.Size
				total++
			}
		}
		if freed > 0 {
			_ = s.releaseStorage(ctx, wsID, freed)
		}
		folderIDs, _ := s.folders.ListExpiredTrashed(ctx, wsID, cutoff)
		_ = s.folders.DeleteByIDs(ctx, wsID, folderIDs)
	}
	return total, nil
}

func (s *FileStorageService) emptyTrashForWorkspace(ctx context.Context, workspaceID string) (int, int64, error) {
	deleted, err := s.files.DeleteAllTrashed(ctx, workspaceID)
	if err != nil {
		return 0, 0, err
	}
	var freed int64
	for _, f := range deleted {
		_ = s.storage.DeleteObject(ctx, f.S3Key)
		freed += f.Size
	}
	_ = s.folders.DeleteAllTrashed(ctx, workspaceID)
	if freed > 0 {
		_ = s.releaseStorage(ctx, workspaceID, freed)
	}
	return len(deleted), freed, nil
}
