package handler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

func (h *AdminHandler) ListFiles(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := repository.ListFilesAdminFilter{
		Query:            strings.TrimSpace(q.Get("q")),
		WorkspaceID:      strings.TrimSpace(q.Get("workspace_id")),
		UploadedByUserID: strings.TrimSpace(q.Get("uploaded_by")),
		TypeFilter:       strings.TrimSpace(q.Get("type")),
		Limit:            parseIntDefault(q.Get("limit"), 50),
		Offset:           parseIntDefault(q.Get("offset"), 0),
	}

	if folder := strings.TrimSpace(q.Get("folder_id")); folder == "root" {
		filter.FolderRoot = true
	} else if folder != "" {
		filter.FolderID = &folder
	}

	if v, ok := parseOptionalBool(q.Get("deleted_only")); ok {
		filter.DeletedOnly = &v
	}
	if from, ok := parseOptionalDate(q.Get("created_from")); ok {
		filter.CreatedFrom = from
	}
	if to, ok := parseOptionalDateEnd(q.Get("created_to")); ok {
		filter.CreatedTo = to
	}
	if v, ok := parseOptionalInt64(q.Get("size_min")); ok {
		filter.SizeMin = &v
	}
	if v, ok := parseOptionalInt64(q.Get("size_max")); ok {
		filter.SizeMax = &v
	}

	items, total, err := h.files.ListForAdmin(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить файлы")
		return
	}
	if items == nil {
		items = []model.AdminFileListItem{}
	}

	stats, err := h.files.AdminStats(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить статистику")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"total": total,
		"files": items,
		"stats": stats,
	})
}

func (h *AdminHandler) ListFileFolders(w http.ResponseWriter, r *http.Request) {
	workspaceID := strings.TrimSpace(r.URL.Query().Get("workspace_id"))
	if workspaceID == "" {
		writeError(w, http.StatusBadRequest, "Укажите workspace_id")
		return
	}

	folders, err := h.folders.List(r.Context(), workspaceID, nil, true)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить папки")
		return
	}

	items := make([]model.AdminFolderListItem, 0, len(folders))
	for _, fo := range folders {
		items = append(items, model.AdminFolderListItem{ID: fo.ID, Name: fo.Name})
	}

	writeJSON(w, http.StatusOK, map[string]any{"folders": items})
}

func parseOptionalDate(raw string) (*time.Time, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, false
	}
	t, err := time.Parse("2006-01-02", raw)
	if err != nil {
		return nil, false
	}
	return &t, true
}

func parseOptionalDateEnd(raw string) (*time.Time, bool) {
	t, ok := parseOptionalDate(raw)
	if !ok {
		return nil, false
	}
	end := t.Add(24*time.Hour - time.Nanosecond)
	return &end, true
}

func parseOptionalInt64(raw string) (int64, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0, false
	}
	n, err := parseInt64(raw)
	if err != nil {
		return 0, false
	}
	return n, true
}

func parseInt64(raw string) (int64, error) {
	return strconv.ParseInt(raw, 10, 64)
}
