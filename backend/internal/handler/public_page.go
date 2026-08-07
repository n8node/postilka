package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/service"
)

type PublicPageHandler struct {
	pages *service.PublicPageService
}

func NewPublicPageHandler(pages *service.PublicPageService) *PublicPageHandler {
	return &PublicPageHandler{pages: pages}
}

func (h *PublicPageHandler) ListAdmin(w http.ResponseWriter, r *http.Request) {
	pages, err := h.pages.List(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить страницы")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"pages": pages})
}

func (h *PublicPageHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	page, err := h.pages.Get(r.Context(), chi.URLParam(r, "pageID"))
	if errors.Is(err, service.ErrPublicPageNotFound) {
		writeError(w, http.StatusNotFound, "Страница не найдена")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить страницу")
		return
	}
	writeJSON(w, http.StatusOK, page)
}

type publicPageBody struct {
	Title           string  `json:"title"`
	Slug            string  `json:"slug"`
	MetaDescription string  `json:"meta_description"`
	ExternalURL     string  `json:"external_url"`
	Category        string  `json:"category"`
	Provider        *string `json:"provider"`
	IsPublished     bool    `json:"is_published"`
	SortOrder       int     `json:"sort_order"`
}

func (b publicPageBody) toInput() service.PublicPageInput {
	return service.PublicPageInput{
		Title:           b.Title,
		Slug:            b.Slug,
		MetaDescription: b.MetaDescription,
		ExternalURL:     b.ExternalURL,
		Category:        b.Category,
		Provider:        b.Provider,
		IsPublished:     b.IsPublished,
		SortOrder:       b.SortOrder,
	}
}

func (h *PublicPageHandler) CreateAdmin(w http.ResponseWriter, r *http.Request) {
	var body publicPageBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	page, err := h.pages.Create(r.Context(), body.toInput())
	if err != nil {
		h.writePublicPageError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, page)
}

func (h *PublicPageHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var body publicPageBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	page, err := h.pages.Update(r.Context(), chi.URLParam(r, "pageID"), body.toInput())
	if err != nil {
		h.writePublicPageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, page)
}

func (h *PublicPageHandler) DeleteAdmin(w http.ResponseWriter, r *http.Request) {
	err := h.pages.Delete(r.Context(), chi.URLParam(r, "pageID"))
	if err != nil {
		h.writePublicPageError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *PublicPageHandler) writePublicPageError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrPublicPageNotFound):
		writeError(w, http.StatusNotFound, "Страница не найдена")
	case errors.Is(err, service.ErrPublicPageSlugTaken):
		writeError(w, http.StatusConflict, "Slug уже занят")
	case errors.Is(err, service.ErrInvalidInput):
		writeError(w, http.StatusBadRequest, "Проверьте заголовок, slug и URL")
	default:
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
	}
}
