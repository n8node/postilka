package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

func (h *AdminHandler) ListPosts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := repository.ListPostsAdminFilter{
		Query:         strings.TrimSpace(q.Get("q")),
		WorkspaceID:   strings.TrimSpace(q.Get("workspace_id")),
		Status:        strings.TrimSpace(q.Get("status")),
		Origin:        strings.TrimSpace(q.Get("origin")),
		CreatedByUser: strings.TrimSpace(q.Get("created_by")),
		MissionID:     strings.TrimSpace(q.Get("mission_id")),
		ChannelID:     strings.TrimSpace(q.Get("channel_id")),
		Provider:      strings.TrimSpace(q.Get("provider")),
		Limit:         parseIntDefault(q.Get("limit"), 50),
		Offset:        parseIntDefault(q.Get("offset"), 0),
	}

	if from, ok := parseOptionalDate(q.Get("created_from")); ok {
		filter.CreatedFrom = from
	}
	if to, ok := parseOptionalDateEnd(q.Get("created_to")); ok {
		filter.CreatedTo = to
	}
	if from, ok := parseOptionalDate(q.Get("published_from")); ok {
		filter.PublishedFrom = from
	}
	if to, ok := parseOptionalDateEnd(q.Get("published_to")); ok {
		filter.PublishedTo = to
	}
	if v, ok := parseOptionalBool(q.Get("has_metrics")); ok {
		filter.HasMetrics = &v
	}

	items, total, err := h.posts.ListForAdmin(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить посты")
		return
	}
	if items == nil {
		items = []model.AdminPostListItem{}
	}

	stats, err := h.posts.AdminStats(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить статистику")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"total": total,
		"posts": items,
		"stats": stats,
	})
}

func (h *AdminHandler) GetPost(w http.ResponseWriter, r *http.Request) {
	postID := strings.TrimSpace(chi.URLParam(r, "postID"))
	if postID == "" {
		writeError(w, http.StatusBadRequest, "Укажите id поста")
		return
	}
	detail, err := h.posts.GetForAdmin(r.Context(), postID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "Пост не найден")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить пост")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"post": detail})
}

func (h *AdminHandler) PreviewFile(w http.ResponseWriter, r *http.Request) {
	fileID := strings.TrimSpace(chi.URLParam(r, "fileID"))
	if fileID == "" {
		writeError(w, http.StatusBadRequest, "Укажите id файла")
		return
	}
	if h.objectStorage == nil {
		writeError(w, http.StatusServiceUnavailable, "Хранилище недоступно")
		return
	}

	detail, err := h.files.GetForAdmin(r.Context(), fileID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "Файл не найден")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить файл")
		return
	}

	inline := r.URL.Query().Get("download") != "1"
	url, err := h.adminFilePreviewURL(r.Context(), detail, inline)
	if err != nil || url == "" {
		writeError(w, http.StatusNotFound, "Превью недоступно")
		return
	}
	redirectPresignedObject(w, r, url)
}
