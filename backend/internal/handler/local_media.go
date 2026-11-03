package handler

import (
	"fmt"
	"net/http"
	"path"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/service"
)

type LocalMediaHandler struct{ store *service.LocalMediaStore }

func NewLocalMediaHandler(store *service.LocalMediaStore) *LocalMediaHandler {
	return &LocalMediaHandler{store: store}
}
func (h *LocalMediaHandler) Serve(w http.ResponseWriter, r *http.Request) {
	key := "local:" + chi.URLParam(r, "key")
	f, info, err := h.store.Open(key)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()
	w.Header().Set("Content-Type", httpContentType(path.Ext(info.Name())))
	w.Header().Set("Content-Length", formatInt(info.Size()))
	w.Header().Set("Cache-Control", "private, max-age=3600")
	http.ServeContent(w, r, info.Name(), info.ModTime(), f)
}
func httpContentType(ext string) string {
	switch ext {
	case ".png":
		return "image/png"
	case ".webp":
		return "image/webp"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".mp4":
		return "video/mp4"
	case ".webm":
		return "video/webm"
	default:
		return "application/octet-stream"
	}
}
func formatInt(n int64) string { return fmt.Sprintf("%d", n) }
