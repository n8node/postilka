package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

type CompanyProfileHandler struct {
	profiles *service.CompanyProfileService
}

func NewCompanyProfileHandler(profiles *service.CompanyProfileService) *CompanyProfileHandler {
	return &CompanyProfileHandler{profiles: profiles}
}

func (h *CompanyProfileHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, 401, "Требуется авторизация")
		return
	}
	items, err := h.profiles.List(r.Context(), userID, r)
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"items": items})
}
func (h *CompanyProfileHandler) Create(w http.ResponseWriter, r *http.Request) {
	h.writeMutation(w, r, "create", "")
}
func (h *CompanyProfileHandler) Update(w http.ResponseWriter, r *http.Request) {
	h.writeMutation(w, r, "update", chi.URLParam(r, "id"))
}
func (h *CompanyProfileHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, 401, "Требуется авторизация")
		return
	}
	err := h.profiles.Delete(r.Context(), userID, r, chi.URLParam(r, "id"))
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"deleted": true})
}

func (h *CompanyProfileHandler) writeMutation(w http.ResponseWriter, r *http.Request, action, id string) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, 401, "Требуется авторизация")
		return
	}
	var in model.CompanyProfileInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, 400, "Некорректное тело запроса")
		return
	}
	var item *model.CompanyProfile
	var err error
	if action == "create" {
		item, err = h.profiles.Create(r.Context(), userID, r, in)
	} else {
		item, err = h.profiles.Update(r.Context(), userID, r, id, in)
	}
	if err != nil {
		h.mapError(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"item": item})
}

func (h *CompanyProfileHandler) mapError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, repository.ErrNotFound):
		writeError(w, 404, "Профиль не найден")
	case errors.Is(err, service.ErrForbidden), errors.Is(err, service.ErrNotWorkspaceMember):
		writeError(w, 403, "Недостаточно прав")
	case errors.Is(err, service.ErrInvalidCompanyProfile):
		writeError(w, 400, "Укажите название профиля")
	default:
		writeError(w, 500, "Внутренняя ошибка")
	}
}
