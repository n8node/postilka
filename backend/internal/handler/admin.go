package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
	"github.com/postilka/postilka/internal/service"
)

type AdminHandler struct {
	users      *repository.UserRepository
	adminUsers *service.AdminUserService
	plans      *service.PlanService
	oauth      *service.OAuthLoginService
	workspaces *service.AdminWorkspaceService
}

func NewAdminHandler(
	users *repository.UserRepository,
	adminUsers *service.AdminUserService,
	plans *service.PlanService,
	oauth *service.OAuthLoginService,
	workspaces *service.AdminWorkspaceService,
) *AdminHandler {
	return &AdminHandler{
		users: users, adminUsers: adminUsers, plans: plans, oauth: oauth, workspaces: workspaces,
	}
}

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

func (h *AdminHandler) ListPlans(w http.ResponseWriter, r *http.Request) {
	plans, err := h.plans.List(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить тарифы")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"plans": plans})
}

func (h *AdminHandler) GetPlan(w http.ResponseWriter, r *http.Request) {
	plan, err := h.plans.Get(r.Context(), chi.URLParam(r, "planID"))
	if errors.Is(err, service.ErrPlanNotFound) {
		writeError(w, http.StatusNotFound, "Тариф не найден")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
		return
	}
	writeJSON(w, http.StatusOK, plan)
}

type planBody struct {
	Slug                 string `json:"slug"`
	Name                 string `json:"name"`
	Description          string `json:"description"`
	IsFree               bool   `json:"is_free"`
	IsActive             *bool  `json:"is_active"`
	IsPopular            bool   `json:"is_popular"`
	PriceMonthlyCents    *int   `json:"price_monthly_cents"`
	PriceYearlyCents     *int   `json:"price_yearly_cents"`
	MaxChannels          *int   `json:"max_channels"`
	MaxPostsPerPeriod    *int   `json:"max_posts_per_period"`
	MaxSeats             *int   `json:"max_seats"`
	StorageBytes         *int64 `json:"storage_bytes"`
	AITextTokensQuota    *int   `json:"ai_text_tokens_quota"`
	AIMediaCreditsQuota  *int   `json:"ai_media_credits_quota"`
	FreePlanDurationDays *int   `json:"free_plan_duration_days"`
	SortOrder            int    `json:"sort_order"`
}

func (b planBody) toInput() service.PlanInput {
	active := true
	if b.IsActive != nil {
		active = *b.IsActive
	}
	return service.PlanInput{
		Slug:                 b.Slug,
		Name:                 b.Name,
		Description:          b.Description,
		IsFree:               b.IsFree,
		IsActive:             active,
		IsPopular:            b.IsPopular,
		PriceMonthlyCents:    b.PriceMonthlyCents,
		PriceYearlyCents:     b.PriceYearlyCents,
		MaxChannels:          b.MaxChannels,
		MaxPostsPerPeriod:    b.MaxPostsPerPeriod,
		MaxSeats:             b.MaxSeats,
		StorageBytes:         b.StorageBytes,
		AITextTokensQuota:    b.AITextTokensQuota,
		AIMediaCreditsQuota:  b.AIMediaCreditsQuota,
		FreePlanDurationDays: b.FreePlanDurationDays,
		SortOrder:            b.SortOrder,
	}
}

func (h *AdminHandler) CreatePlan(w http.ResponseWriter, r *http.Request) {
	var body planBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	plan, err := h.plans.Create(r.Context(), body.toInput())
	if err != nil {
		h.writePlanError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, plan)
}

func (h *AdminHandler) UpdatePlan(w http.ResponseWriter, r *http.Request) {
	var body planBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	plan, err := h.plans.Update(r.Context(), chi.URLParam(r, "planID"), body.toInput())
	if err != nil {
		h.writePlanError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, plan)
}

func (h *AdminHandler) DeletePlan(w http.ResponseWriter, r *http.Request) {
	err := h.plans.Delete(r.Context(), chi.URLParam(r, "planID"))
	if err != nil {
		h.writePlanError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

type assignPlanBody struct {
	PlanID string `json:"plan_id"`
}

func (h *AdminHandler) AssignUserPlan(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userID")
	var body assignPlanBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.PlanID) == "" {
		writeError(w, http.StatusBadRequest, "Укажите plan_id")
		return
	}

	if _, err := h.users.GetByID(r.Context(), userID); err != nil {
		writeError(w, http.StatusNotFound, "Пользователь не найден")
		return
	}

	plan, ws, err := h.plans.AssignToUserPrimaryWorkspace(r.Context(), userID, body.PlanID)
	if err != nil {
		h.writePlanError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"plan":      plan,
		"workspace": ws,
	})
}

func (h *AdminHandler) ListUserLoginIdentities(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userID")
	if _, err := h.users.GetByID(r.Context(), userID); err != nil {
		writeError(w, http.StatusNotFound, "Пользователь не найден")
		return
	}

	identities, err := h.oauth.ListIdentities(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить привязки")
		return
	}
	if identities == nil {
		identities = []model.UserLoginIdentity{}
	}

	writeJSON(w, http.StatusOK, map[string]any{"identities": identities})
}

type setBlockedBody struct {
	Blocked bool `json:"blocked"`
}

func (h *AdminHandler) SetUserBlocked(w http.ResponseWriter, r *http.Request) {
	actorID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	targetID := chi.URLParam(r, "userID")
	var body setBlockedBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	user, err := h.adminUsers.SetBlocked(r.Context(), actorID, targetID, body.Blocked)
	if err != nil {
		h.writeUserManageError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

func (h *AdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	actorID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Не авторизован")
		return
	}

	targetID := chi.URLParam(r, "userID")
	if err := h.adminUsers.Delete(r.Context(), actorID, targetID); err != nil {
		h.writeUserManageError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *AdminHandler) writeUserManageError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, repository.ErrNotFound):
		writeError(w, http.StatusNotFound, "Пользователь не найден")
	case errors.Is(err, service.ErrCannotModifySelf):
		writeError(w, http.StatusForbidden, "Нельзя изменить свой аккаунт")
	case errors.Is(err, service.ErrCannotDeleteAdmin):
		writeError(w, http.StatusForbidden, "Нельзя удалить platform admin")
	default:
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
	}
}

func (h *AdminHandler) writePlanError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrPlanNotFound):
		writeError(w, http.StatusNotFound, "Тариф не найден")
	case errors.Is(err, service.ErrPlanInUse):
		writeError(w, http.StatusConflict, "Тариф назначен workspace — снимите назначения перед удалением")
	case errors.Is(err, service.ErrPlanSlugTaken):
		writeError(w, http.StatusConflict, "Slug тарифа уже занят")
	case errors.Is(err, service.ErrNoPrimaryWS):
		writeError(w, http.StatusBadRequest, "У пользователя нет workspace")
	case errors.Is(err, service.ErrInvalidInput):
		writeError(w, http.StatusBadRequest, "Проверьте название тарифа")
	default:
		writeError(w, http.StatusInternalServerError, "Внутренняя ошибка")
	}
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
