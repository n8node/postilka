package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type MetrikaPlatformConfigHandler struct {
	metrika *service.MetrikaPlatformConfigService
}

func NewMetrikaPlatformConfigHandler(metrika *service.MetrikaPlatformConfigService) *MetrikaPlatformConfigHandler {
	return &MetrikaPlatformConfigHandler{metrika: metrika}
}

func (h *MetrikaPlatformConfigHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	view, err := h.metrika.GetAdminView(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки Яндекс Метрики")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *MetrikaPlatformConfigHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var req model.MetrikaPlatformAdminUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	view, err := h.metrika.Update(r.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidMetrikaPlatformConfig) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки Яндекс Метрики")
		return
	}
	writeJSON(w, http.StatusOK, view)
}
