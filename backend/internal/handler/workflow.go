package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

type WorkflowHandler struct {
	svc   *service.WorkflowService
	wsSvc *service.WorkspaceService
}

func NewWorkflowHandler(svc *service.WorkflowService, wsSvc *service.WorkspaceService) *WorkflowHandler {
	return &WorkflowHandler{svc: svc, wsSvc: wsSvc}
}

func (h *WorkflowHandler) resolveWorkspaceID(r *http.Request, userID string) (string, error) {
	ws, _, err := h.wsSvc.ResolveActive(r.Context(), userID, r)
	if err != nil {
		return "", err
	}
	if ws == nil {
		return "", service.ErrWorkspaceNotFound
	}
	return ws.ID, nil
}

func (h *WorkflowHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	wsID, err := h.resolveWorkspaceID(r, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Workspace не найден")
		return
	}

	items, err := h.svc.ListWorkflows(r.Context(), wsID)
	if err != nil {
		writeWorkflowError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": items})
}

func (h *WorkflowHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	wsID, err := h.resolveWorkspaceID(r, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Workspace не найден")
		return
	}

	id := chi.URLParam(r, "id")
	item, err := h.svc.GetWorkflow(r.Context(), id, wsID)
	if err != nil {
		writeWorkflowError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *WorkflowHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	wsID, err := h.resolveWorkspaceID(r, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Workspace не найден")
		return
	}

	var req model.CreateWorkflowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректный запрос")
		return
	}

	item, err := h.svc.CreateWorkflow(r.Context(), wsID, userID, req)
	if err != nil {
		writeWorkflowError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (h *WorkflowHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	wsID, err := h.resolveWorkspaceID(r, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Workspace не найден")
		return
	}

	var req model.UpdateWorkflowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректный запрос")
		return
	}

	id := chi.URLParam(r, "id")
	item, err := h.svc.UpdateWorkflow(r.Context(), id, wsID, req)
	if err != nil {
		writeWorkflowError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *WorkflowHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	wsID, err := h.resolveWorkspaceID(r, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Workspace не найден")
		return
	}

	id := chi.URLParam(r, "id")
	if err := h.svc.DeleteWorkflow(r.Context(), id, wsID); err != nil {
		writeWorkflowError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *WorkflowHandler) Run(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	wsID, err := h.resolveWorkspaceID(r, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Workspace не найден")
		return
	}

	var req model.RunWorkflowRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	id := chi.URLParam(r, "id")
	run, err := h.svc.TriggerRun(r.Context(), id, wsID, userID, "manual", req.Inputs)
	if err != nil {
		writeWorkflowError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, run)
}

func (h *WorkflowHandler) TestNode(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	wsID, err := h.resolveWorkspaceID(r, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Workspace не найден")
		return
	}

	var req model.TestNodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректный запрос")
		return
	}

	outputs, err := h.svc.TestNode(r.Context(), wsID, userID, req)
	if err != nil {
		writeWorkflowError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"outputs": outputs})
}

func (h *WorkflowHandler) ListRuns(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	wsID, err := h.resolveWorkspaceID(r, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Workspace не найден")
		return
	}

	limit := 30
	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 {
			limit = val
		}
	}

	id := chi.URLParam(r, "id")
	runs, err := h.svc.ListRuns(r.Context(), id, wsID, limit)
	if err != nil {
		writeWorkflowError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": runs})
}

func (h *WorkflowHandler) GetRun(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	wsID, err := h.resolveWorkspaceID(r, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Workspace не найден")
		return
	}

	runID := chi.URLParam(r, "runId")
	run, err := h.svc.GetRun(r.Context(), runID, wsID)
	if err != nil {
		writeWorkflowError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, run)
}

func (h *WorkflowHandler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListTemplates(r.Context(), true)
	if err != nil {
		writeWorkflowError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": items})
}

func (h *WorkflowHandler) CloneTemplate(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	wsID, err := h.resolveWorkspaceID(r, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Workspace не найден")
		return
	}

	templateID := chi.URLParam(r, "id")
	item, err := h.svc.CloneTemplate(r.Context(), templateID, wsID, userID)
	if err != nil {
		writeWorkflowError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

// Admin handlers

func (h *WorkflowHandler) AdminListTemplates(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListTemplates(r.Context(), false)
	if err != nil {
		writeWorkflowError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": items})
}

func (h *WorkflowHandler) AdminCreateTemplate(w http.ResponseWriter, r *http.Request) {
	var req model.SaveTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректный запрос")
		return
	}
	item, err := h.svc.CreateTemplate(r.Context(), req)
	if err != nil {
		writeWorkflowError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (h *WorkflowHandler) AdminUpdateTemplate(w http.ResponseWriter, r *http.Request) {
	var req model.SaveTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректный запрос")
		return
	}
	id := chi.URLParam(r, "id")
	item, err := h.svc.UpdateTemplate(r.Context(), id, req)
	if err != nil {
		writeWorkflowError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *WorkflowHandler) AdminDeleteTemplate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.DeleteTemplate(r.Context(), id); err != nil {
		writeWorkflowError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *WorkflowHandler) AdminStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.GetStats(r.Context())
	if err != nil {
		writeWorkflowError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func writeWorkflowError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrWorkflowNotFound), errors.Is(err, repository.ErrNotFound):
		writeError(w, http.StatusNotFound, "Процесс или шаблон не найден")
	case errors.Is(err, service.ErrWorkflowCyclicGraph):
		writeError(w, http.StatusBadRequest, "Граф содержит циклические зависимости")
	case errors.Is(err, service.ErrWorkflowInvalidGraph):
		writeError(w, http.StatusBadRequest, "Некорректная структура графа")
	default:
		writeError(w, http.StatusInternalServerError, err.Error())
	}
}
