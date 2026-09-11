package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type CarouselHandler struct {
	svc *service.CarouselService
	ws  *service.WorkspaceService
}

func NewCarouselHandler(svc *service.CarouselService, ws *service.WorkspaceService) *CarouselHandler {
	return &CarouselHandler{svc: svc, ws: ws}
}

func (h *CarouselHandler) workspaceID(w http.ResponseWriter, r *http.Request, userID string) (string, bool) {
	workspace, _, err := h.ws.ResolveActive(r.Context(), userID, r)
	if err != nil || workspace == nil {
		writeError(w, http.StatusNotFound, "Workspace не найден")
		return "", false
	}
	return workspace.ID, true
}

func (h *CarouselHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	workspaceID, ok := h.workspaceID(w, r, userID)
	if !ok {
		return
	}
	items, err := h.svc.List(r.Context(), workspaceID)
	if err != nil {
		writeCarouselError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *CarouselHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	workspaceID, ok := h.workspaceID(w, r, userID)
	if !ok {
		return
	}
	item, err := h.svc.Get(r.Context(), chi.URLParam(r, "id"), workspaceID)
	if err != nil {
		writeCarouselError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *CarouselHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	workspaceID, ok := h.workspaceID(w, r, userID)
	if !ok {
		return
	}
	var req model.SaveCarouselRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректный запрос")
		return
	}
	item, err := h.svc.Create(r.Context(), workspaceID, userID, req)
	if err != nil {
		writeCarouselError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (h *CarouselHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	workspaceID, ok := h.workspaceID(w, r, userID)
	if !ok {
		return
	}
	var req model.SaveCarouselRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректный запрос")
		return
	}
	item, err := h.svc.Update(r.Context(), chi.URLParam(r, "id"), workspaceID, req)
	if err != nil {
		writeCarouselError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *CarouselHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	workspaceID, ok := h.workspaceID(w, r, userID)
	if !ok {
		return
	}
	if err := h.svc.Delete(r.Context(), chi.URLParam(r, "id"), workspaceID); err != nil {
		writeCarouselError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func writeCarouselError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrCarouselNotFound):
		writeError(w, http.StatusNotFound, "Карусель не найдена")
	default:
		writeError(w, http.StatusBadRequest, err.Error())
	}
}
