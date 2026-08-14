package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

type MissionHandler struct {
	svc *service.MissionService
}

func NewMissionHandler(svc *service.MissionService) *MissionHandler {
	return &MissionHandler{svc: svc}
}

func (h *MissionHandler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	items, err := h.svc.ListTemplates(r.Context(), userID, r)
	if err != nil {
		writeMissionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *MissionHandler) CreateTemplate(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	var req model.AgentTemplateSaveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректный запрос")
		return
	}
	item, err := h.svc.CreateUserTemplate(r.Context(), userID, r, req)
	if err != nil {
		writeMissionError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (h *MissionHandler) UpdateTemplate(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	var req model.AgentTemplateSaveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректный запрос")
		return
	}
	item, err := h.svc.UpdateUserTemplate(r.Context(), userID, r, chi.URLParam(r, "id"), req)
	if err != nil {
		writeMissionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *MissionHandler) DeleteTemplate(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	if err := h.svc.DeleteUserTemplate(r.Context(), userID, r, chi.URLParam(r, "id")); err != nil {
		writeMissionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *MissionHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	items, total, err := h.svc.List(r.Context(), userID, r, repository.MissionListFilter{
		Status: strings.TrimSpace(r.URL.Query().Get("status")),
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		writeMissionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items":  items,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

func (h *MissionHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	var req model.MissionCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректный запрос")
		return
	}
	item, err := h.svc.Create(r.Context(), userID, r, req)
	if err != nil {
		writeMissionError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (h *MissionHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	mission, msgs, posts, err := h.svc.Get(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		writeMissionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, model.MissionDetailResponse{
		Mission:  mission,
		Messages: msgs,
		Posts:    posts,
	})
}

func (h *MissionHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	var req model.MissionUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректный запрос")
		return
	}
	item, err := h.svc.Update(r.Context(), userID, r, chi.URLParam(r, "id"), req)
	if err != nil {
		writeMissionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *MissionHandler) UpdatePlan(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	var req model.MissionPlanUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректный запрос")
		return
	}
	item, err := h.svc.UpdatePlan(r.Context(), userID, r, chi.URLParam(r, "id"), req)
	if err != nil {
		writeMissionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *MissionHandler) Chat(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	var req model.MissionChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректный запрос")
		return
	}
	out, err := h.svc.Chat(r.Context(), userID, r, chi.URLParam(r, "id"), req.Message)
	if err != nil {
		writeMissionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *MissionHandler) CreateDrafts(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	mission, posts, err := h.svc.CreateDrafts(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		writeMissionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, model.MissionDraftsResponse{Mission: mission, Posts: posts})
}

func (h *MissionHandler) Approve(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	item, err := h.svc.ApprovePlan(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		writeMissionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *MissionHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	item, err := h.svc.Cancel(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		writeMissionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *MissionHandler) Complete(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	var req model.MissionCompleteRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	item, err := h.svc.Complete(r.Context(), userID, r, chi.URLParam(r, "id"), req)
	if err != nil {
		writeMissionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *MissionHandler) SaveTemplate(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	var req struct {
		Name string `json:"name"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	item, err := h.svc.SaveAsTemplate(r.Context(), userID, r, chi.URLParam(r, "id"), req.Name)
	if err != nil {
		writeMissionError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (h *MissionHandler) AdminListTemplates(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListAdminTemplates(r.Context())
	if err != nil {
		writeMissionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *MissionHandler) AdminUpdateTemplate(w http.ResponseWriter, r *http.Request) {
	var req model.AgentTemplateSaveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректный запрос")
		return
	}
	item, err := h.svc.UpdateAdminTemplate(r.Context(), chi.URLParam(r, "id"), req)
	if err != nil {
		writeMissionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func writeMissionError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrForbidden), errors.Is(err, service.ErrNotWorkspaceMember):
		writeError(w, http.StatusForbidden, "Недостаточно прав")
	case errors.Is(err, service.ErrNoPrimaryWS):
		writeError(w, http.StatusNotFound, "Workspace не найден")
	case errors.Is(err, repository.ErrNotFound):
		writeError(w, http.StatusNotFound, "Агент или шаблон не найдены")
	case errors.Is(err, service.ErrYandexGptNotConfigured):
		writeError(w, http.StatusServiceUnavailable, "Yandex GPT не настроен")
	case errors.Is(err, service.ErrMissionConflict):
		message := strings.TrimPrefix(err.Error(), service.ErrMissionConflict.Error()+": ")
		writeError(w, http.StatusConflict, message)
	case errors.Is(err, service.ErrInvalidMission), errors.Is(err, service.ErrInvalidPost):
		message := err.Error()
		for _, prefix := range []string{service.ErrInvalidMission.Error() + ": ", service.ErrInvalidPost.Error() + ": "} {
			if strings.HasPrefix(message, prefix) {
				message = strings.TrimPrefix(message, prefix)
				break
			}
		}
		writeError(w, http.StatusBadRequest, message)
	default:
		writeError(w, http.StatusInternalServerError, "Не удалось выполнить операцию с агентом")
	}
}
