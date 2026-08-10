package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

type LinkRedirectHandler struct {
	shortener *service.LinkShortenerService
}

func NewLinkRedirectHandler(shortener *service.LinkShortenerService) *LinkRedirectHandler {
	return &LinkRedirectHandler{shortener: shortener}
}

func (h *LinkRedirectHandler) Redirect(w http.ResponseWriter, r *http.Request) {
	code := strings.TrimSpace(chi.URLParam(r, "code"))
	if code == "" {
		writeError(w, http.StatusNotFound, "Ссылка не найдена")
		return
	}
	destination, err := h.shortener.Resolve(r.Context(), code, r.Referer(), r.UserAgent())
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Ссылка не найдена")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось обработать ссылку")
		return
	}
	http.Redirect(w, r, destination, http.StatusFound)
}
