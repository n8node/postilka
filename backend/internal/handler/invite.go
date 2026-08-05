package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	oauthclient "github.com/postilka/postilka/internal/oauth"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

type InviteHandler struct {
	invites *service.InviteService
	oauth   *service.OAuthLoginService
}

func NewInviteHandler(invites *service.InviteService, oauth *service.OAuthLoginService) *InviteHandler {
	return &InviteHandler{invites: invites, oauth: oauth}
}

type verifyInviteRequest struct {
	InviteCode string `json:"invite_code"`
}

func (h *InviteHandler) AuthMethods(w http.ResponseWriter, r *http.Request) {
	enabled, err := h.invites.IsRegistrationEnabled(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}
	payload := map[string]any{
		"invite_registration_enabled": enabled,
	}
	if h.oauth != nil {
		oauthMethods, err := h.oauth.AuthMethods(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
			return
		}
		for k, v := range oauthMethods {
			payload[k] = v
		}
	}
	writeJSON(w, http.StatusOK, payload)
}

func (h *InviteHandler) VerifyInvite(w http.ResponseWriter, r *http.Request) {
	enabled, err := h.invites.IsRegistrationEnabled(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}
	if !enabled {
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":              true,
			"invite_required": false,
		})
		return
	}

	var req verifyInviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	code, err := h.invites.VerifyInvite(r.Context(), req.InviteCode)
	if err != nil {
		h.writeInviteError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":              true,
		"invite_required": true,
		"invite_code":     code,
	})
}

func (h *InviteHandler) UserInvites(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	enabled, err := h.invites.IsRegistrationEnabled(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}

	invites, err := h.invites.ListForUser(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить инвайты")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"invite_registration_enabled": enabled,
		"invites":                     invites,
	})
}

func (h *InviteHandler) PublicSystemInvites(w http.ResponseWriter, r *http.Request) {
	invites, err := h.invites.ListPublicSystem(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"invites": invites})
}

func (h *InviteHandler) writeInviteError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrInvalidInviteCode):
		writeError(w, http.StatusBadRequest, "Некорректный формат инвайт-ключа")
	case errors.Is(err, service.ErrInviteNotActive):
		writeError(w, http.StatusBadRequest, "Инвайт-ключ недействителен или уже использован")
	case errors.Is(err, service.ErrInviteAlreadyUsed):
		writeError(w, http.StatusConflict, "Инвайт-ключ уже использован")
	case errors.Is(err, service.ErrInviteRequired):
		writeError(w, http.StatusBadRequest, "Требуется инвайт-ключ для регистрации")
	default:
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
	}
}

type AdminInviteHandler struct {
	invites *service.InviteService
	users   *repository.UserRepository
	oauth   *service.OAuthLoginService
}

func NewAdminInviteHandler(invites *service.InviteService, users *repository.UserRepository, oauth *service.OAuthLoginService) *AdminInviteHandler {
	return &AdminInviteHandler{invites: invites, users: users, oauth: oauth}
}

func (h *AdminInviteHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page := parseIntDefault(q.Get("page"), 1)
	limit := parseIntDefault(q.Get("limit"), 30)
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	filter := repository.ListInvitesFilter{
		Search: strings.TrimSpace(q.Get("search")),
		Status: strings.TrimSpace(q.Get("status")),
		Scope:  strings.TrimSpace(q.Get("scope")),
		Limit:  limit,
		Offset: offset,
	}

	invites, total, err := h.invites.ListForAdmin(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить инвайты")
		return
	}

	relations, err := h.invites.ListRelations(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить связи")
		return
	}

	stats, err := h.invites.AdminStats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}

	totalPages := (total + limit - 1) / limit
	if totalPages < 1 {
		totalPages = 1
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"invites":     invites,
		"relations":   relations,
		"stats":       stats,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": totalPages,
	})
}

type issueInvitesBody struct {
	Count int `json:"count"`
}

func (h *AdminInviteHandler) IssueSystem(w http.ResponseWriter, r *http.Request) {
	var body issueInvitesBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Count < 1 {
		writeError(w, http.StatusBadRequest, "Укажите count от 1 до 200")
		return
	}

	userID, _ := middleware.UserIDFromContext(r.Context())
	invites, err := h.invites.IssueSystemInvites(r.Context(), body.Count, userID)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			writeError(w, http.StatusBadRequest, "Количество должно быть от 1 до 200")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось выпустить инвайты")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"invites": invites,
		"count":   len(invites),
	})
}

type revokeInviteBody struct {
	InviteID string `json:"invite_id"`
}

func (h *AdminInviteHandler) Revoke(w http.ResponseWriter, r *http.Request) {
	var body revokeInviteBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.InviteID) == "" {
		writeError(w, http.StatusBadRequest, "Укажите invite_id")
		return
	}

	if err := h.invites.RevokeInvite(r.Context(), body.InviteID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "Активный инвайт не найден")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось отозвать инвайт")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *AdminInviteHandler) AuthSettingsGet(w http.ResponseWriter, r *http.Request) {
	if h.oauth != nil {
		settings, err := h.oauth.GetAdminSettings(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
			return
		}
		writeJSON(w, http.StatusOK, settings)
		return
	}
	enabled, err := h.invites.IsRegistrationEnabled(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"invite_registration_enabled": enabled,
	})
}

func (h *AdminInviteHandler) AuthSettingsPut(w http.ResponseWriter, r *http.Request) {
	var body model.AdminAuthSettingsInput
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	if h.oauth != nil {
		webhookErr, err := h.oauth.SaveAdminSettings(r.Context(), body)
		if err != nil {
			writeError(w, http.StatusInternalServerError, oauthclient.SanitizeOAuthDetail(err.Error()))
			return
		}
		settings, err := h.oauth.GetAdminSettings(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
			return
		}
		settings.MAXWebhookError = webhookErr
		settings.MAXWebhookRegistered = webhookErr == "" && settings.OAuth.MAX.Configured
		writeJSON(w, http.StatusOK, settings)
		return
	}
	if err := h.invites.SetRegistrationEnabled(r.Context(), body.InviteRegistrationEnabled); err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки")
		return
	}
	h.AuthSettingsGet(w, r)
}

func (h *AdminInviteHandler) UserInvites(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userID")
	if _, err := h.users.GetByID(r.Context(), userID); err != nil {
		writeError(w, http.StatusNotFound, "Пользователь не найден")
		return
	}

	invites, err := h.invites.ListForUser(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить инвайты")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"invites": invites})
}

type addUserInvitesBody struct {
	Count int `json:"count"`
}

func (h *AdminInviteHandler) AddUserInvites(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userID")
	if _, err := h.users.GetByID(r.Context(), userID); err != nil {
		writeError(w, http.StatusNotFound, "Пользователь не найден")
		return
	}

	var body addUserInvitesBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Count < 1 {
		writeError(w, http.StatusBadRequest, "Укажите count от 1 до 100")
		return
	}

	adminID, _ := middleware.UserIDFromContext(r.Context())
	invites, err := h.invites.IssueUserInvites(r.Context(), userID, body.Count, adminID)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			writeError(w, http.StatusBadRequest, "Количество должно быть от 1 до 100")
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось добавить инвайты")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"invites": invites})
}

func (h *AdminInviteHandler) UserInviteRelations(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userID")
	if _, err := h.users.GetByID(r.Context(), userID); err != nil {
		writeError(w, http.StatusNotFound, "Пользователь не найден")
		return
	}

	relations, err := h.invites.GetUserRelations(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить связи")
		return
	}
	writeJSON(w, http.StatusOK, relations)
}
