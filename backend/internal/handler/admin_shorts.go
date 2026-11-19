package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/postilka/postilka/internal/repository"
)

type AdminShortsHandler struct{ repo *repository.ShortsRepository }

func NewAdminShortsHandler(repo *repository.ShortsRepository) *AdminShortsHandler {
	return &AdminShortsHandler{repo: repo}
}

func (h *AdminShortsHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))
	items, total, stats, err := h.repo.ListForAdmin(r.Context(), repository.ListShortsAdminFilter{Status: strings.TrimSpace(q.Get("status")), Limit: limit, Offset: offset})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить проекты Shorts")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"projects": items, "total": total, "stats": stats})
}
