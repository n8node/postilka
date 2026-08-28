package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type BackupHandler struct {
	backups *service.BackupService
}

func NewBackupHandler(backups *service.BackupService) *BackupHandler {
	return &BackupHandler{backups: backups}
}

func (h *BackupHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	view, err := h.backups.GetAdminView(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки бекапов")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *BackupHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var req model.BackupSettingsUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	view, err := h.backups.UpdateSettings(r.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidBackupSettings) {
			writeError(w, http.StatusBadRequest, "Проверьте расписание и число копий")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки бекапов")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *BackupHandler) RunAdmin(w http.ResponseWriter, r *http.Request) {
	run, err := h.backups.EnqueueManual(r.Context())
	if err != nil {
		if errors.Is(err, service.ErrBackupBusy) {
			writeError(w, http.StatusConflict, "Бекап уже выполняется")
			return
		}
		if errors.Is(err, service.ErrBackupStorage) {
			writeError(w, http.StatusBadRequest, "Сначала настройте S3-хранилище")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось поставить бекап в очередь")
		return
	}
	writeJSON(w, http.StatusAccepted, run)
}

func (h *BackupHandler) DownloadAdmin(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	url, err := h.backups.PresignDownload(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"url": url})
}
