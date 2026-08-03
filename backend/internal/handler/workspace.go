package handler

import (
	"net/http"

	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/repository"
)

type WorkspaceHandler struct {
	workspaces *repository.WorkspaceRepository
}

func NewWorkspaceHandler(workspaces *repository.WorkspaceRepository) *WorkspaceHandler {
	return &WorkspaceHandler{workspaces: workspaces}
}

func (h *WorkspaceHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	ws, err := h.workspaces.GetPrimaryForUser(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Workspace не найден")
		return
	}

	writeJSON(w, http.StatusOK, ws)
}
