package handler

import (
	"encoding/json"
	"net/http"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type LoadMonitorHandler struct {
	svc *service.LoadMonitorService
}

func NewLoadMonitorHandler(svc *service.LoadMonitorService) *LoadMonitorHandler {
	return &LoadMonitorHandler{svc: svc}
}

func (h *LoadMonitorHandler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	dash, err := h.svc.GetDashboard(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить мониторинг нагрузки")
		return
	}
	writeJSON(w, http.StatusOK, dash)
}

func (h *LoadMonitorHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	var req model.LoadMonitorSettings
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректный JSON")
		return
	}
	out, err := h.svc.UpdateSettings(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки")
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *LoadMonitorHandler) SendReportTest(w http.ResponseWriter, r *http.Request) {
	ok, msg := h.svc.SendReportNow(r.Context())
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": msg})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "message": msg})
}

func (h *LoadMonitorHandler) RecordSnapshotNow(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.RecordSnapshotNow(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось записать снимок")
		return
	}
	dash, err := h.svc.GetDashboard(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось обновить данные")
		return
	}
	writeJSON(w, http.StatusOK, dash)
}
