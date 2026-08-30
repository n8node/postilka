package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/service"
)

type HelpArticleHandler struct {
	help *service.HelpArticleService
}

func NewHelpArticleHandler(help *service.HelpArticleService) *HelpArticleHandler {
	return &HelpArticleHandler{help: help}
}

func (h *HelpArticleHandler) ListPublished(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.UserIDFromContext(r.Context()); !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	items, err := h.help.ListPublished(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить справку")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"articles": items})
}

func (h *HelpArticleHandler) GetByRoute(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.UserIDFromContext(r.Context()); !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	article, err := h.help.GetPublishedByRoute(r.Context(), r.URL.Query().Get("route"))
	if errors.Is(err, service.ErrHelpArticleNotFound) {
		writeJSON(w, http.StatusOK, map[string]any{"article": nil})
		return
	}
	if errors.Is(err, service.ErrHelpInvalid) {
		writeError(w, http.StatusBadRequest, "Неизвестный раздел справки")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить статью")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"article": article})
}

func (h *HelpArticleHandler) GetPublished(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.UserIDFromContext(r.Context()); !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	article, err := h.help.GetPublished(r.Context(), chi.URLParam(r, "id"))
	if errors.Is(err, service.ErrHelpArticleNotFound) {
		writeError(w, http.StatusNotFound, "Статья не найдена")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить статью")
		return
	}
	writeJSON(w, http.StatusOK, article)
}

func (h *HelpArticleHandler) ServeImage(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.UserIDFromContext(r.Context()); !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	body, contentType, err := h.help.OpenImage(r.Context(), chi.URLParam(r, "id"))
	if errors.Is(err, service.ErrHelpArticleNotFound) {
		writeError(w, http.StatusNotFound, "Изображение не найдено")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить изображение")
		return
	}
	defer body.Close()
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "private, max-age=86400")
	_, _ = io.Copy(w, body)
}

func (h *HelpArticleHandler) ListAdmin(w http.ResponseWriter, r *http.Request) {
	items, err := h.help.ListAdmin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить статьи")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"articles": items})
}

func (h *HelpArticleHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	article, err := h.help.GetAdmin(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		h.writeHelpError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, article)
}

type helpArticleBody struct {
	Title       string `json:"title"`
	RouteKey    string `json:"route_key"`
	BodyHTML    string `json:"body_html"`
	Excerpt     string `json:"excerpt"`
	IsPublished bool   `json:"is_published"`
	SortOrder   int    `json:"sort_order"`
}

func (b helpArticleBody) toInput() service.HelpArticleInput {
	return service.HelpArticleInput{
		Title:       b.Title,
		RouteKey:    b.RouteKey,
		BodyHTML:    b.BodyHTML,
		Excerpt:     b.Excerpt,
		IsPublished: b.IsPublished,
		SortOrder:   b.SortOrder,
	}
}

func (h *HelpArticleHandler) CreateAdmin(w http.ResponseWriter, r *http.Request) {
	var body helpArticleBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	article, err := h.help.Create(r.Context(), body.toInput())
	if err != nil {
		h.writeHelpError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, article)
}

func (h *HelpArticleHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var body helpArticleBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	article, err := h.help.Update(r.Context(), chi.URLParam(r, "id"), body.toInput())
	if err != nil {
		h.writeHelpError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, article)
}

func (h *HelpArticleHandler) DeleteAdmin(w http.ResponseWriter, r *http.Request) {
	if err := h.help.Delete(r.Context(), chi.URLParam(r, "id")); err != nil {
		h.writeHelpError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *HelpArticleHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(9 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "Не удалось прочитать файл")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Нужно изображение")
		return
	}
	img, url, err := h.help.UploadImage(r.Context(), file, header)
	if err != nil {
		h.writeHelpError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": img.ID, "url": url})
}

func (h *HelpArticleHandler) writeHelpError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrHelpArticleNotFound):
		writeError(w, http.StatusNotFound, "Статья не найдена")
	case errors.Is(err, service.ErrHelpRouteTaken):
		writeError(w, http.StatusConflict, "Для этого раздела уже есть статья")
	case errors.Is(err, service.ErrHelpInvalid):
		writeError(w, http.StatusBadRequest, "Проверьте заголовок и раздел кабинета")
	case errors.Is(err, service.ErrHelpImageInvalid):
		writeError(w, http.StatusBadRequest, "Нужен PNG, JPEG, WebP или GIF до 8 МБ")
	default:
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
	}
}
