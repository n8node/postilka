package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/repository"
)

type AdminHandler struct {
	users *repository.UserRepository
}

func NewAdminHandler(users *repository.UserRepository) *AdminHandler {
	return &AdminHandler{users: users}
}

// Me confirms the caller is a platform admin (used as a smoke check for /admin routes).
func (h *AdminHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}
	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"status":            "ok",
		"is_platform_admin": true,
		"user": map[string]string{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
		},
	})
}

// ListUsers returns platform users with status and primary workspace.
func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := repository.ListUsersFilter{
		Query:  strings.TrimSpace(q.Get("q")),
		Limit:  parseIntDefault(q.Get("limit"), 50),
		Offset: parseIntDefault(q.Get("offset"), 0),
	}

	if v, ok := parseOptionalBool(q.Get("is_blocked")); ok {
		filter.IsBlocked = &v
	}
	if v, ok := parseOptionalBool(q.Get("is_platform_admin")); ok {
		filter.IsPlatformAdmin = &v
	}

	items, total, err := h.users.ListForAdmin(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить пользователей")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"total": total,
		"users": items,
	})
}

func parseIntDefault(raw string, fallback int) int {
	if raw == "" {
		return fallback
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return n
}

func parseOptionalBool(raw string) (bool, bool) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "true", "1":
		return true, true
	case "false", "0":
		return false, true
	default:
		return false, false
	}
}
