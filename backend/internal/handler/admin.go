package handler

import (
	"net/http"

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
		"status":             "ok",
		"is_platform_admin":  true,
		"user": map[string]string{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
		},
	})
}
