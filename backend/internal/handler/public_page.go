package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

type PublicPageHandler struct {
	pages *service.PublicPageService
}

func NewPublicPageHandler(pages *service.PublicPageService) *PublicPageHandler {
	return &PublicPageHandler{pages: pages}
}

func (h *PublicPageHandler) GetPublic(w http.ResponseWriter, r *http.Request) {
	page, err := h.pages.GetPublishedBySlug(r.Context(), chi.URLParam(r, "slug"))
	if errors.Is(err, service.ErrPublicPageNotFound) || errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Страница не найдена")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить страницу")
		return
	}
	writeJSON(w, http.StatusOK, page)
}

func (h *PublicPageHandler) RenderPublic(w http.ResponseWriter, r *http.Request) {
	page, err := h.pages.GetPublishedBySlug(r.Context(), chi.URLParam(r, "slug"))
	if errors.Is(err, service.ErrPublicPageNotFound) || errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Страница не найдена", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Не удалось загрузить страницу", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	title := template.HTMLEscapeString(page.Title)
	description := template.HTMLEscapeString(page.MetaDescription)
	content := page.ContentHTML
	if content == "" && page.ExternalURL != "" {
		content = fmt.Sprintf("<p>Актуальная версия документа опубликована по адресу: <a href=\"%s\">%s</a>.</p>", template.HTMLEscapeString(page.ExternalURL), template.HTMLEscapeString(page.ExternalURL))
	}
	fmt.Fprintf(w, `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>%s — Postilka</title><meta name="description" content="%s"><style>body{margin:0;background:#f8fafc;color:#172033;font:16px/1.7 Arial,sans-serif}.wrap{max-width:880px;margin:0 auto;padding:32px 20px 64px}header{display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:18px;margin-bottom:28px}a{color:#2563eb}article{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:32px}h1{line-height:1.2}h2{margin-top:28px;font-size:21px}li{margin:8px 0}.updated-at{color:#64748b;font-size:14px}</style></head><body><div class="wrap"><header><a href="https://postilka.ru">Postilka</a><a href="https://postilka.ru/app">В приложение →</a></header><article><div>Юридические страницы</div><h1>%s</h1><div>%s</div></article></div></body></html>`, title, description, title, content)
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
	ContentHTML     string  `json:"content_html"`
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
		ContentHTML:     b.ContentHTML,
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
