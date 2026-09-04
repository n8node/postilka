package handler

import (
	"io"
	"net/http"
)

const presignedRedirectCacheControl = "private, max-age=600, stale-while-revalidate=3600"

func redirectPresignedObject(w http.ResponseWriter, r *http.Request, presignedURL string) {
	if presignedURL == "" {
		writeError(w, http.StatusNotFound, "Не найдено")
		return
	}
	w.Header().Set("Cache-Control", presignedRedirectCacheControl)
	if r.URL.Query().Get("format") == "json" {
		writeJSON(w, http.StatusOK, map[string]any{"url": presignedURL})
		return
	}
	http.Redirect(w, r, presignedURL, http.StatusTemporaryRedirect)
}

func streamObject(w http.ResponseWriter, body io.ReadCloser, contentType, cacheControl, fallbackContentType string) {
	defer body.Close()
	if contentType == "" {
		contentType = fallbackContentType
	}
	if cacheControl != "" {
		w.Header().Set("Cache-Control", cacheControl)
	}
	w.Header().Set("Content-Type", contentType)
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, body)
}
