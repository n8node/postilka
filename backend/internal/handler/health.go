package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/postilka/postilka/internal/config"
	"github.com/postilka/postilka/internal/repository"
)

type HealthHandler struct {
	cfg   *config.Config
	db    *repository.Postgres
	start time.Time
}

func NewHealthHandler(cfg *config.Config, db *repository.Postgres) *HealthHandler {
	return &HealthHandler{cfg: cfg, db: db, start: time.Now()}
}

type healthResponse struct {
	Status        string `json:"status"`
	Version       string `json:"version"`
	UptimeSeconds int64  `json:"uptime_seconds"`
	Postgres      string `json:"postgres"`
	App           string `json:"app"`
}

func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	postgresStatus := "ok"
	if err := h.db.Ping(r.Context()); err != nil {
		postgresStatus = "error"
	}

	status := "ok"
	code := http.StatusOK
	if postgresStatus != "ok" {
		status = "degraded"
		code = http.StatusServiceUnavailable
	}

	resp := healthResponse{
		Status:        status,
		Version:       config.Version,
		UptimeSeconds: int64(time.Since(h.start).Seconds()),
		Postgres:      postgresStatus,
		App:           "postilka",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(resp)
}

type StatusHandler struct {
	cfg *config.Config
}

func NewStatusHandler(cfg *config.Config) *StatusHandler {
	return &StatusHandler{cfg: cfg}
}

type statusResponse struct {
	Message string `json:"message"`
	AppURL  string `json:"app_url"`
}

func (h *StatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(statusResponse{
		Message: "Postilka API scaffold",
		AppURL:  h.cfg.PublicAppURL,
	})
}
