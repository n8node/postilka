package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type FileStorageHandler struct {
	files *service.FileStorageService
}

func NewFileStorageHandler(files *service.FileStorageService) *FileStorageHandler {
	return &FileStorageHandler{files: files}
}

func (h *FileStorageHandler) GetStorage(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	stats, err := h.files.GetStorageStats(r.Context(), userID, r)
	if err != nil {
		writeFileStorageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func (h *FileStorageHandler) GetUploadLimits(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	limits, err := h.files.GetUploadLimits(r.Context(), userID, r)
	if err != nil {
		writeFileStorageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, limits)
}

func (h *FileStorageHandler) UploadInit(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req model.FileUploadInitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	out, err := h.files.UploadInit(r.Context(), userID, r, req)
	if err != nil {
		writeFileStorageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *FileStorageHandler) UploadComplete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req model.FileUploadCompleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	file, err := h.files.UploadComplete(r.Context(), userID, r, req.UploadSessionToken)
	if err != nil {
		writeFileStorageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, file)
}

func (h *FileStorageHandler) ListFiles(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	q := r.URL.Query()
	var folderID *string
	if v := q.Get("folder_id"); v != "" {
		folderID = &v
	}
	section := q.Get("section")
	if section == "" {
		section = "my-files"
	}
	items, err := h.files.ListFiles(r.Context(), userID, r, section, folderID)
	if err != nil {
		writeFileStorageError(w, err)
		return
	}
	if items == nil {
		items = []model.WorkspaceFile{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"files": items})
}

func (h *FileStorageHandler) GetFile(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotFound, "Не найдено")
}

func (h *FileStorageHandler) PatchFile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	id := chi.URLParam(r, "id")
	var raw map[string]json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	if nameRaw, ok := raw["name"]; ok {
		var name string
		if err := json.Unmarshal(nameRaw, &name); err != nil || name == "" {
			writeError(w, http.StatusBadRequest, "Укажите имя файла")
			return
		}
		f, err := h.files.RenameFile(r.Context(), userID, r, id, name)
		if err != nil {
			writeFileStorageError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, f)
		return
	}
	if folderRaw, ok := raw["folder_id"]; ok {
		var folderID *string
		if string(folderRaw) != "null" {
			var fid string
			if err := json.Unmarshal(folderRaw, &fid); err != nil {
				writeError(w, http.StatusBadRequest, "Некорректный folder_id")
				return
			}
			if fid != "" {
				folderID = &fid
			}
		}
		f, err := h.files.MoveFile(r.Context(), userID, r, id, folderID)
		if err != nil {
			writeFileStorageError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, f)
		return
	}
	writeError(w, http.StatusBadRequest, "Укажите name или folder_id")
}

func (h *FileStorageHandler) DeleteFile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	trashed, err := h.files.DeleteFile(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		writeFileStorageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "trashed": trashed})
}

func (h *FileStorageHandler) DownloadFile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	inline := r.URL.Query().Get("disposition") == "inline" || r.URL.Query().Get("inline") == "1"
	url, expiresIn, err := h.files.DownloadURL(r.Context(), userID, r, chi.URLParam(r, "id"), inline)
	if err != nil {
		writeFileStorageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"url": url, "expires_in": expiresIn})
}

func (h *FileStorageHandler) CopyFile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var body struct {
		FolderID *string `json:"folder_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	f, err := h.files.CopyFile(r.Context(), userID, r, chi.URLParam(r, "id"), body.FolderID)
	if err != nil {
		writeFileStorageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, f)
}

func (h *FileStorageHandler) TransferFile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req model.FileTransferRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	f, err := h.files.TransferFile(r.Context(), userID, r, chi.URLParam(r, "id"), req)
	if err != nil {
		writeFileStorageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, f)
}

func (h *FileStorageHandler) BulkFiles(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req model.FileBulkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	okCount, errs, err := h.files.BulkFiles(r.Context(), userID, r, req)
	if err != nil {
		writeFileStorageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": okCount, "errors": errs})
}

func (h *FileStorageHandler) ListFolders(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var parentID *string
	if v := r.URL.Query().Get("parent_id"); v != "" {
		parentID = &v
	}
	scopeAll := r.URL.Query().Get("scope") == "all"
	items, err := h.files.ListFolders(r.Context(), userID, r, parentID, scopeAll)
	if err != nil {
		writeFileStorageError(w, err)
		return
	}
	if items == nil {
		items = []model.WorkspaceFolder{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"folders": items})
}

func (h *FileStorageHandler) CreateFolder(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var body struct {
		Name     string  `json:"name"`
		ParentID *string `json:"parent_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	f, err := h.files.CreateFolder(r.Context(), userID, r, body.Name, body.ParentID)
	if err != nil {
		writeFileStorageError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, f)
}

func (h *FileStorageHandler) PatchFolder(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	id := chi.URLParam(r, "id")
	var body struct {
		Name     *string `json:"name"`
		ParentID *string `json:"parent_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	if body.Name != nil {
		f, err := h.files.RenameFolder(r.Context(), userID, r, id, *body.Name)
		if err != nil {
			writeFileStorageError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, f)
		return
	}
	var parentID *string
	if body.ParentID != nil && *body.ParentID != "" {
		parentID = body.ParentID
	}
	f, err := h.files.MoveFolder(r.Context(), userID, r, id, parentID)
	if err != nil {
		writeFileStorageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, f)
}

func (h *FileStorageHandler) DeleteFolder(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	trashed, err := h.files.DeleteFolder(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		writeFileStorageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "trashed": trashed})
}

func (h *FileStorageHandler) BulkFolders(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req model.FolderBulkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	okCount, errs, err := h.files.BulkFolders(r.Context(), userID, r, req)
	if err != nil {
		writeFileStorageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": okCount, "errors": errs})
}

func (h *FileStorageHandler) Breadcrumbs(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	crumbs, err := h.files.Breadcrumbs(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		writeFileStorageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"breadcrumbs": crumbs})
}

func (h *FileStorageHandler) ListTrash(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	files, folders, err := h.files.ListTrash(r.Context(), userID, r)
	if err != nil {
		writeFileStorageError(w, err)
		return
	}
	if files == nil {
		files = []model.WorkspaceFile{}
	}
	if folders == nil {
		folders = []model.WorkspaceFolder{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"files": files, "folders": folders})
}

func (h *FileStorageHandler) RestoreTrash(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req model.TrashRestoreRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	if err := h.files.RestoreTrash(r.Context(), userID, r, req); err != nil {
		writeFileStorageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *FileStorageHandler) EmptyTrash(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	n, freed, err := h.files.EmptyTrash(r.Context(), userID, r)
	if err != nil {
		writeFileStorageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "deleted_files": n, "freed_bytes": freed})
}

func (h *FileStorageHandler) PermanentDeleteTrashItem(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	itemType := r.URL.Query().Get("type")
	id := chi.URLParam(r, "id")
	var err error
	if itemType == "folder" {
		err = h.files.PermanentDeleteFolder(r.Context(), userID, r, id)
	} else {
		err = h.files.PermanentDeleteFile(r.Context(), userID, r, id)
	}
	if err != nil {
		writeFileStorageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func writeFileStorageError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrForbidden), errors.Is(err, service.ErrNotWorkspaceMember):
		writeError(w, http.StatusForbidden, "Недостаточно прав")
	case errors.Is(err, service.ErrWorkspaceNotFound):
		writeError(w, http.StatusNotFound, "Пространство не найдено")
	case errors.Is(err, service.ErrFileNotFound), errors.Is(err, service.ErrFolderNotFound):
		writeError(w, http.StatusNotFound, err.Error())
	case errors.Is(err, service.ErrStorageQuota):
		writeError(w, http.StatusForbidden, "Превышен лимит хранилища")
	case errors.Is(err, service.ErrFileTooLarge):
		writeError(w, http.StatusRequestEntityTooLarge, "Файл слишком большой")
	case errors.Is(err, service.ErrFileTypeNotAllowed):
		writeError(w, http.StatusUnsupportedMediaType, "Формат файла не разрешён")
	case errors.Is(err, service.ErrEmptyFile):
		writeError(w, http.StatusBadRequest, "Пустые файлы загружать нельзя")
	case errors.Is(err, service.ErrStorageNotConfigured):
		writeError(w, http.StatusServiceUnavailable, "Хранилище не настроено: укажите S3 в админке и сохраните настройки")
	case errors.Is(err, service.ErrStorageDisabled):
		writeError(w, http.StatusServiceUnavailable, "Хранилище отключено: включите «Включить хранилище» в настройках S3")
	default:
		writeError(w, http.StatusBadRequest, err.Error())
	}
}
