package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

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
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))
	filter := repository.PostListFilter{
		Status:    strings.TrimSpace(q.Get("status")),
		ChannelID: strings.TrimSpace(q.Get("channel_id")),
		Query:     strings.TrimSpace(q.Get("q")),
		Format:    strings.TrimSpace(q.Get("format")),
		Origin:    strings.TrimSpace(q.Get("origin")),
		MissionID: strings.TrimSpace(q.Get("mission_id")),
		Limit:     limit,
		Offset:    offset,
	}
	if q.Get("calendar") == "1" || q.Get("calendar") == "true" {
		filter.Calendar = true
	}
	if q.Get("include_unscheduled") == "1" || q.Get("include_unscheduled") == "true" {
		filter.Calendar = true
		filter.IncludeUnscheduled = true
	}
	if fromRaw := strings.TrimSpace(q.Get("from")); fromRaw != "" {
		if t, err := time.Parse(time.RFC3339, fromRaw); err == nil {
			filter.From = &t
		} else if t, err := time.Parse("2006-01-02", fromRaw); err == nil {
			filter.From = &t
		}
	}
	if toRaw := strings.TrimSpace(q.Get("to")); toRaw != "" {
		if t, err := time.Parse(time.RFC3339, toRaw); err == nil {
			filter.To = &t
		} else if t, err := time.Parse("2006-01-02", toRaw); err == nil {
			filter.To = &t
		}
	}
	items, total, err := h.posts.List(r.Context(), userID, r, filter)
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items":  items,
		"total":  total,
		"limit":  filter.Limit,
		"offset": filter.Offset,
	})
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

func (h *PostHandler) SyncTelegramStory(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	post, err := h.posts.SyncTelegramStory(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func (h *PostHandler) DeleteTelegramStory(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	post, err := h.posts.DeleteTelegramStory(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func (h *PostHandler) SubmitApproval(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	var req model.PostApprovalSubmitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && r.ContentLength > 0 {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	post, err := h.posts.SubmitForApproval(r.Context(), userID, r, chi.URLParam(r, "id"), req)
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func (h *PostHandler) Approve(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	var req model.PostApprovalDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && r.ContentLength > 0 {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	post, err := h.posts.ApprovePost(r.Context(), userID, r, chi.URLParam(r, "id"), req)
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func (h *PostHandler) Reject(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	var req model.PostApprovalDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && r.ContentLength > 0 {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	post, err := h.posts.RejectPost(r.Context(), userID, r, chi.URLParam(r, "id"), req)
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func (h *PostHandler) Comment(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	var req model.PostApprovalCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	event, err := h.posts.CommentPost(r.Context(), userID, r, chi.URLParam(r, "id"), req)
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, event)
}

func (h *PostHandler) ListApprovalEvents(w http.ResponseWriter, r *http.Request) {
	userID, ok := postUserID(w, r)
	if !ok {
		return
	}
	items, err := h.posts.ListApprovalEvents(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func writePostError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrEmailNotVerified):
		writeEmailNotVerified(w)
	case errors.Is(err, service.ErrForbidden), errors.Is(err, service.ErrNotWorkspaceMember):
		writeError(w, http.StatusForbidden, "Недостаточно прав")
	case errors.Is(err, service.ErrNoPrimaryWS):
		writeError(w, http.StatusNotFound, "Workspace не найден")
	case errors.Is(err, repository.ErrNotFound):
		writeError(w, http.StatusNotFound, "Публикация не найдена или её состояние уже изменилось")
	case errors.Is(err, service.ErrPostConflict):
		writeError(w, http.StatusConflict, "Публикация уже выполняется или недоступна в текущем состоянии")
	case errors.Is(err, service.ErrQuotaExceeded):
		writeError(w, http.StatusPaymentRequired, "Достигнут лимит публикаций по тарифу")
	case errors.Is(err, service.ErrInvalidPost):
		message := strings.TrimPrefix(err.Error(), service.ErrInvalidPost.Error()+": ")
		writeError(w, http.StatusBadRequest, message)
	case errors.Is(err, service.ErrPublishFailed):
		message := strings.TrimPrefix(err.Error(), service.ErrPublishFailed.Error()+": ")
		if message == "" {
			message = "Не удалось опубликовать во все каналы"
		}
		writeError(w, http.StatusBadGateway, message)
	default:
		slog.Error("post operation failed", "error", err)
		msg := "Не удалось выполнить операцию с публикацией"
		errMsg := strings.TrimSpace(err.Error())
		if te := strings.TrimPrefix(errMsg, "telegram api: "); te != errMsg {
			writeError(w, http.StatusBadGateway, te)
			return
		}
		if strings.HasPrefix(errMsg, "max messages:") ||
			strings.HasPrefix(errMsg, "max upload") ||
			strings.Contains(errMsg, "MAX ") {
			writeError(w, http.StatusBadGateway, errMsg)
			return
		}
		writeError(w, http.StatusInternalServerError, msg)
	}
}
