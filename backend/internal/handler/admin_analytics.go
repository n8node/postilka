package handler

import (
	"net/http"
	"strings"
	"time"
)

func (h *AdminHandler) Analytics(w http.ResponseWriter, r *http.Request) {
	from, to := parseAnalyticsRange(r)
	overview, err := h.analytics.Overview(r.Context(), from, to)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить аналитику")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"from":     from.Format("2006-01-02"),
		"to":       to.Format("2006-01-02"),
		"overview": overview,
	})
}

func parseAnalyticsRange(r *http.Request) (from, to time.Time) {
	now := time.Now().UTC()
	to = time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, int(time.Second-time.Nanosecond), time.UTC)
	from = to.AddDate(0, 0, -29)
	from = time.Date(from.Year(), from.Month(), from.Day(), 0, 0, 0, 0, time.UTC)

	if raw := strings.TrimSpace(r.URL.Query().Get("from")); raw != "" {
		if t, ok := parseOptionalDate(raw); ok {
			from = time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
		}
	}
	if raw := strings.TrimSpace(r.URL.Query().Get("to")); raw != "" {
		if t, ok := parseOptionalDateEnd(raw); ok {
			to = *t
		}
	}
	if from.After(to) {
		from, to = to.AddDate(0, 0, -29), to
		from = time.Date(from.Year(), from.Month(), from.Day(), 0, 0, 0, 0, time.UTC)
	}
	return from, to
}
