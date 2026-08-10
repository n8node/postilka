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

type PostHandler struct {
	posts *service.PostService
}

func NewPostHandler(posts *service.PostService) *PostHandler {
	return &PostHandler{posts: posts}
}

func postUserID(w http.ResponseWriter, r *http.Request) (string, bool) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
	}
	return userID, ok
}

func (h *PostHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	items, err := h.posts.List(r.Context(), userID, r, limit, offset)
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *PostHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	var req model.PostSaveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	post, err := h.posts.Create(r.Context(), userID, r, req)
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, post)
}

func (h *PostHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	post, err := h.posts.Get(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func (h *PostHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	var req model.PostSaveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	post, err := h.posts.Update(r.Context(), userID, r, chi.URLParam(r, "id"), req)
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func (h *PostHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	if err := h.posts.Delete(r.Context(), userID, r, chi.URLParam(r, "id")); err != nil {
		writePostError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *PostHandler) Schedule(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	var req model.PostScheduleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	post, err := h.posts.Schedule(r.Context(), userID, r, chi.URLParam(r, "id"), req.DueAt)
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func (h *PostHandler) Publish(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	post, err := h.posts.PublishNow(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func (h *PostHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	post, err := h.posts.Cancel(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func writePostError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrForbidden), errors.Is(err, service.ErrNotWorkspaceMember):
		writeError(w, http.StatusForbidden, "Недостаточно прав")
	case errors.Is(err, service.ErrNoPrimaryWS):
		writeError(w, http.StatusNotFound, "Workspace не найден")
	case errors.Is(err, repository.ErrNotFound):
		writeError(w, http.StatusNotFound, "Публикация не найдена или её состояние уже изменилось")
	case errors.Is(err, service.ErrPostConflict):
		writeError(w, http.StatusConflict, "Публикация уже выполняется или недоступна в текущем состоянии")
	case errors.Is(err, service.ErrInvalidPost):
		message := strings.TrimPrefix(err.Error(), service.ErrInvalidPost.Error()+": ")
		writeError(w, http.StatusBadRequest, message)
	default:
		writeError(w, http.StatusInternalServerError, "Не удалось выполнить операцию с публикацией")
	}
}
