package handler

import (
	"net/http"

	appmetrics "github.com/postilka/postilka/internal/metrics"
)

type MetricsHandler struct {
	registry *appmetrics.Registry
}

func NewMetricsHandler(registry *appmetrics.Registry) *MetricsHandler {
	return &MetricsHandler{registry: registry}
}

func (h *MetricsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	if err := h.registry.SnapshotPrometheus(w); err != nil {
		http.Error(w, "metrics unavailable", http.StatusServiceUnavailable)
	}
}
