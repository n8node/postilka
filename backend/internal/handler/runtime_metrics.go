package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	appmetrics "github.com/postilka/postilka/internal/metrics"
	"github.com/postilka/postilka/internal/repository"
)

type RuntimeHealthHandler struct {
	registry *appmetrics.Registry
	db       *repository.Postgres
}

func NewRuntimeHealthHandler(registry *appmetrics.Registry, db *repository.Postgres) *RuntimeHealthHandler {
	return &RuntimeHealthHandler{registry: registry, db: db}
}

func (h *RuntimeHealthHandler) Health(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	status := "ok"
	code := http.StatusOK
	if err := h.db.Ping(ctx); err != nil {
		status = "degraded"
		code = http.StatusServiceUnavailable
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": status, "component": "worker"})
}

func (h *RuntimeHealthHandler) Metrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	_ = h.registry.SnapshotPrometheus(w)
}
