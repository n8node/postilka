package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

type MediaProviderHandler struct{ svc *service.MediaProviderService }

func NewMediaProviderHandler(svc *service.MediaProviderService) *MediaProviderHandler {
	return &MediaProviderHandler{svc: svc}
}
func (h *MediaProviderHandler) List(w http.ResponseWriter, r *http.Request) {
	v, err := h.svc.List(r.Context())
	if err != nil {
		writeError(w, 500, "Не удалось загрузить провайдеров")
		return
	}
	writeJSON(w, 200, map[string]any{"providers": v})
}
func (h *MediaProviderHandler) Get(w http.ResponseWriter, r *http.Request) {
	v, err := h.svc.Get(r.Context(), chi.URLParam(r, "providerID"))
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, 404, "Провайдер не найден")
		return
	}
	if err != nil {
		writeError(w, 500, "Не удалось загрузить провайдера")
		return
	}
	writeJSON(w, 200, map[string]any{"provider": v})
}
func (h *MediaProviderHandler) Update(w http.ResponseWriter, r *http.Request) {
	var in model.MediaProviderUpdateRequest
	if json.NewDecoder(r.Body).Decode(&in) != nil {
		writeError(w, 400, "Некорректное тело запроса")
		return
	}
	v, err := h.svc.Update(r.Context(), chi.URLParam(r, "providerID"), in)
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, 404, "Провайдер не найден")
		return
	}
	if err != nil {
		writeError(w, 400, err.Error())
		return
	}
	writeJSON(w, 200, map[string]any{"provider": v})
}
func (h *MediaProviderHandler) Models(w http.ResponseWriter, r *http.Request) {
	v, err := h.svc.Models(r.Context(), chi.URLParam(r, "providerID"))
	if err != nil {
		writeError(w, 500, "Не удалось загрузить модели")
		return
	}
	writeJSON(w, 200, map[string]any{"models": v})
}
func (h *MediaProviderHandler) Pricing(w http.ResponseWriter, r *http.Request) {
	v, err := h.svc.Pricing(r.Context(), chi.URLParam(r, "providerID"))
	if err != nil {
		writeError(w, 500, "Не удалось загрузить биллинг")
		return
	}
	writeJSON(w, 200, map[string]any{"pricing": v})
}
func (h *MediaProviderHandler) Routes(w http.ResponseWriter, r *http.Request) {
	v, err := h.svc.Routes(r.Context())
	if err != nil {
		writeError(w, 500, "Не удалось загрузить маршрутизацию")
		return
	}
	writeJSON(w, 200, map[string]any{"routes": v})
}
func (h *MediaProviderHandler) UpdateRoutes(w http.ResponseWriter, r *http.Request) {
	var in model.MediaProviderRoutesUpdateRequest
	if json.NewDecoder(r.Body).Decode(&in) != nil {
		writeError(w, 400, "Некорректное тело запроса")
		return
	}
	if err := h.svc.UpdateRoutes(r.Context(), in); err != nil {
		writeError(w, 400, err.Error())
		return
	}
	h.Routes(w, r)
}

func (h *MediaProviderHandler) TestOneFast(w http.ResponseWriter, r *http.Request) {
	var in struct {
		APIBaseURL string `json:"api_base_url"`
		APIKey     string `json:"api_key"`
	}
	_ = json.NewDecoder(r.Body).Decode(&in)
	result, err := h.svc.TestOneFast(r.Context(), in.APIBaseURL, in.APIKey)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось проверить соединение OneFast")
		return
	}
	writeJSON(w, http.StatusOK, result)
}
