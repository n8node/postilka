package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/service"
)

type AnalyticsHandler struct {
	analytics *service.AnalyticsService
	metrika   *service.MetrikaConnectionService
	cfg       interface{ PublicAppURLNormalized() string }
}

func NewAnalyticsHandler(
	analytics *service.AnalyticsService,
	metrika *service.MetrikaConnectionService,
	cfg interface{ PublicAppURLNormalized() string },
) *AnalyticsHandler {
	return &AnalyticsHandler{analytics: analytics, metrika: metrika, cfg: cfg}
}

func (h *AnalyticsHandler) Overview(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	from, to := parseUserAnalyticsRange(r)
	overview, series, providers, err := h.analytics.Overview(r.Context(), userID, r, from, to)
	if err != nil {
		writeAnalyticsError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"overview":  overview,
		"series":    series,
		"providers": providers,
	})
}

func (h *AnalyticsHandler) ListPosts(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	from, to := parseUserAnalyticsRange(r)
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	items, total, err := h.analytics.ListPosts(r.Context(), userID, r, from, to, limit, offset)
	if err != nil {
		writeAnalyticsError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items":  items,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

func (h *AnalyticsHandler) PostAnalytics(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	postID := chi.URLParam(r, "id")
	resp, err := h.analytics.PostAnalytics(r.Context(), userID, r, postID)
	if err != nil {
		writeAnalyticsError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *AnalyticsHandler) MetrikaStatus(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	status, err := h.metrika.Status(r.Context(), userID, r)
	if err != nil {
		writeAnalyticsError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, status)
}

func (h *AnalyticsHandler) MetrikaConnectStart(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	var req struct {
		WorkspaceID string `json:"workspace_id"`
		CounterID   int64  `json:"counter_id"`
	}
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
			return
		}
	}
	if req.CounterID <= 0 {
		req.CounterID, _ = strconv.ParseInt(r.URL.Query().Get("counter_id"), 10, 64)
	}
	workspaceID := strings.TrimSpace(req.WorkspaceID)
	if workspaceID == "" {
		writeError(w, http.StatusBadRequest, "workspace_id обязателен")
		return
	}
	redirectURL, err := h.metrika.ConnectStart(r.Context(), userID, workspaceID, req.CounterID)
	if err != nil {
		writeAnalyticsError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"redirect_url": redirectURL})
}

func (h *AnalyticsHandler) MetrikaCallback(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	if errMsg := q.Get("error"); errMsg != "" {
		redirectMetrikaResult(w, r, h.cfg.PublicAppURLNormalized(), false, errMsg)
		return
	}
	if err := h.metrika.ConnectCallback(r.Context(), q.Get("state"), q.Get("code")); err != nil {
		redirectMetrikaResult(w, r, h.cfg.PublicAppURLNormalized(), false, err.Error())
		return
	}
	redirectMetrikaResult(w, r, h.cfg.PublicAppURLNormalized(), true, "")
}

func (h *AnalyticsHandler) MetrikaDisconnect(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	if err := h.metrika.Disconnect(r.Context(), userID, r); err != nil {
		writeAnalyticsError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func parseUserAnalyticsRange(r *http.Request) (time.Time, time.Time) {
	to := time.Now().UTC()
	from := to.AddDate(0, 0, -29)
	if raw := r.URL.Query().Get("from"); raw != "" {
		if parsed, err := time.Parse("2006-01-02", raw); err == nil {
			from = parsed.UTC()
		}
	}
	if raw := r.URL.Query().Get("to"); raw != "" {
		if parsed, err := time.Parse("2006-01-02", raw); err == nil {
			to = parsed.UTC()
		}
	}
	return from, to
}

func writeAnalyticsError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrForbidden):
		writeError(w, http.StatusForbidden, "Недостаточно прав")
	case errors.Is(err, service.ErrWorkspaceNotFound), errors.Is(err, service.ErrNotWorkspaceMember):
		writeError(w, http.StatusNotFound, "Рабочая область не найдена")
	case errors.Is(err, service.ErrMetrikaNotConfigured):
		writeError(w, http.StatusServiceUnavailable, "OAuth Яндекс Метрики не настроен на сервере")
	default:
		writeError(w, http.StatusBadRequest, err.Error())
	}
}

func redirectMetrikaResult(w http.ResponseWriter, r *http.Request, baseURL string, ok bool, message string) {
	target := baseURL + "/analytics?metrika="
	if ok {
		target += "connected"
	} else {
		target += "error&reason=" + url.QueryEscape(message)
	}
	http.Redirect(w, r, target, http.StatusFound)
}
