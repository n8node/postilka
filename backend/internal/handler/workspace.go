package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type WorkspaceHandler struct {
	workspaces *service.WorkspaceService
	cfg        *config.Config
}

func NewWorkspaceHandler(workspaces *service.WorkspaceService, cfg *config.Config) *WorkspaceHandler {
	return &WorkspaceHandler{workspaces: workspaces, cfg: cfg}
}

// Me returns the active workspace (cookie / header / primary).
func (h *WorkspaceHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	active, _, err := h.workspaces.ResolveActive(r.Context(), userID, r)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}
	if active == nil {
		writeError(w, http.StatusNotFound, "Workspace не найден")
		return
	}

	writeJSON(w, http.StatusOK, active)
}

// List returns all workspaces the user belongs to.
func (h *WorkspaceHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	list, err := h.workspaces.ListForUser(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}
	if list == nil {
		list = []model.Workspace{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"workspaces": list})
}

type setActiveRequest struct {
	WorkspaceID string `json:"workspace_id"`
}

// SetActive stores the active workspace cookie after membership check.
func (h *WorkspaceHandler) SetActive(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	var req setActiveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.WorkspaceID == "" {
		writeError(w, http.StatusBadRequest, "Укажите workspace_id")
		return
	}

	ws, err := h.workspaces.SetActive(r.Context(), userID, req.WorkspaceID)
	if errors.Is(err, service.ErrNotWorkspaceMember) {
		writeError(w, http.StatusForbidden, "Нет доступа к workspace")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}

	service.SetActiveWorkspaceCookie(w, ws.ID, h.cfg.IsProduction())
	writeJSON(w, http.StatusOK, map[string]any{
		"active_workspace": ws,
		"workspace":        ws,
	})
}
