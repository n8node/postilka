package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

func (h *AdminHandler) ListWorkspaces(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := repository.ListWorkspacesAdminFilter{
		Query:  strings.TrimSpace(q.Get("q")),
		OwnerID: strings.TrimSpace(q.Get("owner_id")),
		Limit:  parseIntDefault(q.Get("limit"), 50),
		Offset: parseIntDefault(q.Get("offset"), 0),
	}

	items, total, err := h.workspaces.List(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить workspace")
		return
	}
	if items == nil {
		items = []model.AdminWorkspaceListItem{}
	}

	stats, err := h.workspaces.Stats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить статистику")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"total":      total,
		"workspaces": items,
		"stats":      stats,
	})
}

func (h *AdminHandler) GetWorkspace(w http.ResponseWriter, r *http.Request) {
	ws, err := h.workspaces.Get(r.Context(), chi.URLParam(r, "workspaceID"))
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Workspace не найден")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}
	writeJSON(w, http.StatusOK, ws)
}

func (h *AdminHandler) ListUserWorkspaces(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userID")
	list, err := h.workspaces.ListForUser(r.Context(), userID)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Пользователь не найден")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить workspace пользователя")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"workspaces": list})
}

func (h *AdminHandler) DeleteWorkspace(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "workspaceID")
	if err := h.workspaces.Delete(r.Context(), workspaceID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "Workspace не найден")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось удалить workspace")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

type deleteAllWorkspacesBody struct {
	Confirm string `json:"confirm"`
}

func (h *AdminHandler) DeleteAllWorkspaces(w http.ResponseWriter, r *http.Request) {
	var body deleteAllWorkspacesBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	deleted, err := h.workspaces.DeleteAll(r.Context(), strings.TrimSpace(body.Confirm))
	if errors.Is(err, service.ErrDeleteAllConfirmRequired) {
		writeError(w, http.StatusBadRequest, "Укажите confirm: DELETE_ALL_WORKSPACES")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось удалить workspace")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":  "ok",
		"deleted": deleted,
	})
}
