package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

type NotificationHandler struct {
	svc        *service.NotificationService
	workspaces *service.WorkspaceService
}

func NewNotificationHandler(svc *service.NotificationService, workspaces *service.WorkspaceService) *NotificationHandler {
	return &NotificationHandler{svc: svc, workspaces: workspaces}
}

func (h *NotificationHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))
	filter := repository.NotificationListFilter{
		WorkspaceID: strings.TrimSpace(q.Get("workspace_id")),
		UnreadOnly:  q.Get("unreadOnly") == "true" || q.Get("unread_only") == "1",
		Limit:       limit,
		Offset:      offset,
	}
	if t := strings.TrimSpace(q.Get("type")); t != "" {
		filter.Type = model.NotificationType(t)
	}
	if filter.WorkspaceID == "" {
		if ws, _, err := h.workspaces.ResolveActive(r.Context(), userID, r); err == nil && ws != nil {
			filter.WorkspaceID = ws.ID
		}
	}
	out, err := h.svc.List(r.Context(), userID, filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить уведомления")
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *NotificationHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	id := chi.URLParam(r, "id")
	if err := h.svc.MarkRead(r.Context(), userID, id); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "Уведомление не найдено")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось обновить уведомление")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *NotificationHandler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	workspaceID := strings.TrimSpace(r.URL.Query().Get("workspace_id"))
	if workspaceID == "" {
		if ws, _, err := h.workspaces.ResolveActive(r.Context(), userID, r); err == nil && ws != nil {
			workspaceID = ws.ID
		}
	}
	n, err := h.svc.MarkAllRead(r.Context(), userID, workspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось отметить уведомления")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"count": n})
}

func (h *NotificationHandler) DeleteAll(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	workspaceID := strings.TrimSpace(r.URL.Query().Get("workspace_id"))
	if workspaceID == "" {
		if ws, _, err := h.workspaces.ResolveActive(r.Context(), userID, r); err == nil && ws != nil {
			workspaceID = ws.ID
		}
	}
	n, err := h.svc.DeleteAll(r.Context(), userID, workspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось удалить уведомления")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"deleted": n})
}

func (h *NotificationHandler) GetPrefs(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	prefs, err := h.svc.GetPrefs(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки")
		return
	}
	writeJSON(w, http.StatusOK, prefs)
}

type notificationPrefsRequest struct {
	Posts    *bool `json:"posts"`
	Channels *bool `json:"channels"`
	Billing  *bool `json:"billing"`
	Quota    *bool `json:"quota"`
	AI       *bool `json:"ai"`
	Files    *bool `json:"files"`
	Team     *bool `json:"team"`
}

func (h *NotificationHandler) UpdatePrefs(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	current, err := h.svc.GetPrefs(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки")
		return
	}
	var req notificationPrefsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	if req.Posts != nil {
		current.Posts = *req.Posts
	}
	if req.Channels != nil {
		current.Channels = *req.Channels
	}
	if req.Billing != nil {
		current.Billing = *req.Billing
	}
	if req.Quota != nil {
		current.Quota = *req.Quota
	}
	if req.AI != nil {
		current.AI = *req.AI
	}
	if req.Files != nil {
		current.Files = *req.Files
	}
	if req.Team != nil {
		current.Team = *req.Team
	}
	saved, err := h.svc.UpdatePrefs(r.Context(), userID, current)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки")
		return
	}
	writeJSON(w, http.StatusOK, saved)
}
