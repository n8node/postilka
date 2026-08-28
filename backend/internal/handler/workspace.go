package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
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

type createWorkspaceRequest struct {
	Name string `json:"name"`
}

// Create adds a workspace owned by the caller and sets it as active.
func (h *WorkspaceHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	var req createWorkspaceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	ws, err := h.workspaces.Create(r.Context(), userID, req.Name)
	if errors.Is(err, service.ErrInvalidWorkspaceName) {
		writeError(w, http.StatusBadRequest, "Укажите название workspace (до 255 символов)")
		return
	}
	if errors.Is(err, service.ErrWorkspaceLimitReached) {
		writeError(w, http.StatusForbidden, fmt.Sprintf("Достигнут лимит: не более %d workspace на аккаунт", service.MaxOwnedWorkspacesPerUser))
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}

	service.SetActiveWorkspaceCookie(w, ws.ID, h.cfg.IsProduction())

	list, err := h.workspaces.ListForUser(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}
	if list == nil {
		list = []model.Workspace{}
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"workspace":        ws,
		"active_workspace": ws,
		"workspaces":       list,
	})
}

type updateWorkspaceRequest struct {
	Name string `json:"name"`
}

// Update renames a workspace (admin+).
func (h *WorkspaceHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	workspaceID := chi.URLParam(r, "workspaceID")
	if workspaceID == "" {
		writeError(w, http.StatusBadRequest, "Укажите workspace")
		return
	}

	var req updateWorkspaceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	ws, err := h.workspaces.Update(r.Context(), userID, workspaceID, req.Name)
	if errors.Is(err, service.ErrInvalidWorkspaceName) {
		writeError(w, http.StatusBadRequest, "Укажите название workspace (до 255 символов)")
		return
	}
	if errors.Is(err, service.ErrNotWorkspaceMember) {
		writeError(w, http.StatusForbidden, "Нет доступа к workspace")
		return
	}
	if errors.Is(err, service.ErrForbidden) {
		writeError(w, http.StatusForbidden, "Недостаточно прав")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"workspace": ws})
}

// Delete removes a workspace (owner only).
func (h *WorkspaceHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	workspaceID := chi.URLParam(r, "workspaceID")
	if workspaceID == "" {
		writeError(w, http.StatusBadRequest, "Укажите workspace")
		return
	}

	list, err := h.workspaces.Delete(r.Context(), userID, workspaceID)
	if errors.Is(err, service.ErrNotWorkspaceMember) {
		writeError(w, http.StatusForbidden, "Нет доступа к workspace")
		return
	}
	if errors.Is(err, service.ErrForbidden) {
		writeError(w, http.StatusForbidden, "Удалить workspace может только владелец")
		return
	}
	if errors.Is(err, service.ErrCannotDeleteLastWorkspace) {
		writeError(w, http.StatusBadRequest, "Нельзя удалить последний workspace")
		return
	}
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Workspace не найден")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}
	if list == nil {
		list = []model.Workspace{}
	}

	preferred := strings.TrimSpace(r.Header.Get(service.ActiveWorkspaceHeader))
	if preferred == "" {
		if c, err := r.Cookie(service.ActiveWorkspaceCookie); err == nil {
			preferred = strings.TrimSpace(c.Value)
		}
	}
	if preferred == workspaceID {
		preferred = ""
	}

	var active *model.Workspace
	if len(list) > 0 {
		if preferred != "" {
			for i := range list {
				if list[i].ID == preferred {
					active = &list[i]
					break
				}
			}
		}
		if active == nil {
			active = &list[0]
			service.SetActiveWorkspaceCookie(w, list[0].ID, h.cfg.IsProduction())
		}
	} else {
		service.ClearActiveWorkspaceCookie(w)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"workspaces":       list,
		"active_workspace": active,
	})
}

// Members returns workspace members for the active or requested workspace.
func (h *WorkspaceHandler) Members(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	workspaceID := strings.TrimSpace(r.URL.Query().Get("workspace_id"))
	if workspaceID == "" {
		active, _, err := h.workspaces.ResolveActive(r.Context(), userID, r)
		if err != nil || active == nil {
			writeError(w, http.StatusBadRequest, "Workspace не найден")
			return
		}
		workspaceID = active.ID
	}

	members, err := h.workspaces.ListMembers(r.Context(), userID, workspaceID)
	if errors.Is(err, service.ErrNotWorkspaceMember) {
		writeError(w, http.StatusForbidden, "Нет доступа к workspace")
		return
	}
	if errors.Is(err, service.ErrForbidden) {
		writeError(w, http.StatusForbidden, "Недостаточно прав")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}
	if members == nil {
		members = []model.WorkspaceMember{}
	}
	seats, err := h.workspaces.SeatSnapshot(r.Context(), userID, workspaceID)
	if err != nil {
		h.writeMemberError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"members": members, "seats": seats})
}

func (h *WorkspaceHandler) resolveWorkspaceID(w http.ResponseWriter, r *http.Request, userID string) (string, bool) {
	workspaceID := strings.TrimSpace(r.URL.Query().Get("workspace_id"))
	if workspaceID != "" {
		return workspaceID, true
	}
	active, _, err := h.workspaces.ResolveActive(r.Context(), userID, r)
	if err != nil || active == nil {
		writeError(w, http.StatusBadRequest, "Workspace не найден")
		return "", false
	}
	return active.ID, true
}

type updateMemberRequest struct {
	Role   *string `json:"role"`
	Status *string `json:"status"`
}

func (h *WorkspaceHandler) UpdateMember(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}
	workspaceID, ok := h.resolveWorkspaceID(w, r, userID)
	if !ok {
		return
	}
	targetID := strings.TrimSpace(chi.URLParam(r, "userID"))
	if targetID == "" {
		writeError(w, http.StatusBadRequest, "Укажите участника")
		return
	}

	var req updateMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	if req.Role == nil && req.Status == nil {
		writeError(w, http.StatusBadRequest, "Укажите роль или статус")
		return
	}

	var role *model.WorkspaceRole
	if req.Role != nil {
		parsed := model.WorkspaceRole(strings.TrimSpace(*req.Role))
		role = &parsed
	}
	var status *model.MemberStatus
	if req.Status != nil {
		parsed := model.MemberStatus(strings.TrimSpace(*req.Status))
		status = &parsed
	}

	member, err := h.workspaces.UpdateMember(r.Context(), userID, workspaceID, targetID, role, status)
	if err != nil {
		h.writeMemberError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"member": member})
}

func (h *WorkspaceHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}
	workspaceID, ok := h.resolveWorkspaceID(w, r, userID)
	if !ok {
		return
	}
	targetID := strings.TrimSpace(chi.URLParam(r, "userID"))
	if targetID == "" {
		writeError(w, http.StatusBadRequest, "Укажите участника")
		return
	}
	if err := h.workspaces.RemoveMember(r.Context(), userID, workspaceID, targetID); err != nil {
		h.writeMemberError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *WorkspaceHandler) TransferOwnership(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}
	workspaceID, ok := h.resolveWorkspaceID(w, r, userID)
	if !ok {
		return
	}
	targetID := strings.TrimSpace(chi.URLParam(r, "userID"))
	if targetID == "" {
		writeError(w, http.StatusBadRequest, "Укажите участника")
		return
	}
	member, err := h.workspaces.TransferOwnership(r.Context(), userID, workspaceID, targetID)
	if err != nil {
		h.writeMemberError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"member": member})
}

func (h *WorkspaceHandler) Leave(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}
	workspaceID, ok := h.resolveWorkspaceID(w, r, userID)
	if !ok {
		return
	}

	list, err := h.workspaces.Leave(r.Context(), userID, workspaceID)
	if err != nil {
		h.writeMemberError(w, err)
		return
	}
	if list == nil {
		list = []model.Workspace{}
	}

	preferred := strings.TrimSpace(r.Header.Get(service.ActiveWorkspaceHeader))
	if preferred == "" {
		if c, err := r.Cookie(service.ActiveWorkspaceCookie); err == nil {
			preferred = strings.TrimSpace(c.Value)
		}
	}
	if preferred == workspaceID {
		preferred = ""
	}

	var active *model.Workspace
	if len(list) > 0 {
		if preferred != "" {
			for i := range list {
				if list[i].ID == preferred {
					active = &list[i]
					break
				}
			}
		}
		if active == nil {
			active = &list[0]
			service.SetActiveWorkspaceCookie(w, list[0].ID, h.cfg.IsProduction())
		}
	} else {
		service.ClearActiveWorkspaceCookie(w)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"workspaces":       list,
		"active_workspace": active,
	})
}

func (h *WorkspaceHandler) writeMemberError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrNotWorkspaceMember):
		writeError(w, http.StatusForbidden, "Нет доступа к workspace")
	case errors.Is(err, service.ErrForbidden):
		writeError(w, http.StatusForbidden, "Недостаточно прав")
	case errors.Is(err, service.ErrCannotManageOwner):
		writeError(w, http.StatusForbidden, "Владельца нельзя изменить этим действием")
	case errors.Is(err, service.ErrCannotManageSelf):
		writeError(w, http.StatusBadRequest, "Нельзя изменить своё участие этим действием")
	case errors.Is(err, service.ErrCannotLeaveAsOwner):
		writeError(w, http.StatusBadRequest, "Сначала передайте владение другому участнику")
	case errors.Is(err, service.ErrMemberNotFound), errors.Is(err, repository.ErrNotFound):
		writeError(w, http.StatusNotFound, "Участник не найден")
	case errors.Is(err, service.ErrInvalidInput), errors.Is(err, service.ErrInvalidMemberStatus):
		writeError(w, http.StatusBadRequest, "Проверьте роль и статус")
	case errors.Is(err, service.ErrSeatQuotaExceeded), errors.Is(err, service.ErrQuotaExceeded):
		writeError(w, http.StatusForbidden, "Достигнут лимит мест тарифа. Отстраните участника или смените тариф.")
	default:
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
	}
}
