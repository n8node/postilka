package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/postilka/postilka/internal/middleware"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/repository"
)

const headerButtonsKey = "header.quick_buttons"

type HeaderButtonsHandler struct {
	settings *repository.SettingsRepository
}

func NewHeaderButtonsHandler(settings *repository.SettingsRepository) *HeaderButtonsHandler {
	return &HeaderButtonsHandler{settings: settings}
}

func (h *HeaderButtonsHandler) get(r *http.Request) (model.HeaderButtonsView, error) {
	raw, err := h.settings.Get(r.Context(), headerButtonsKey)
	if err == repository.ErrNotFound || strings.TrimSpace(raw) == "" {
		return model.HeaderButtonsView{Buttons: []model.HeaderButton{}}, nil
	}
	if err != nil {
		return model.HeaderButtonsView{}, err
	}
	var view model.HeaderButtonsView
	if err := json.Unmarshal([]byte(raw), &view); err != nil {
		return model.HeaderButtonsView{Buttons: []model.HeaderButton{}}, nil
	}
	if view.Buttons == nil {
		view.Buttons = []model.HeaderButton{}
	}
	return view, nil
}

func (h *HeaderButtonsHandler) Get(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.UserIDFromContext(r.Context()); !ok {
		writeError(w, http.StatusUnauthorized, "Требуется авторизация")
		return
	}
	view, err := h.get(r)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить кнопки")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *HeaderButtonsHandler) GetAdmin(w http.ResponseWriter, r *http.Request) { h.Get(w, r) }

func (h *HeaderButtonsHandler) Update(w http.ResponseWriter, r *http.Request) {
	var view model.HeaderButtonsView
	if err := json.NewDecoder(r.Body).Decode(&view); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	if len(view.Buttons) > 20 {
		writeError(w, http.StatusBadRequest, "Можно создать не более 20 кнопок")
		return
	}
	for i := range view.Buttons {
		b := &view.Buttons[i]
		b.Text = strings.TrimSpace(b.Text)
		b.Href = strings.TrimSpace(b.Href)
		b.Icon = strings.TrimSpace(b.Icon)
		if b.ID == "" {
			b.ID = uuid.NewString()
		}
		if b.Text == "" || len([]rune(b.Text)) > 60 || b.Href == "" || len(b.Href) > 500 {
			writeError(w, http.StatusBadRequest, "Проверьте текст и ссылку кнопки")
			return
		}
		if b.Color == "" {
			b.Color = "#111827"
		}
		if b.Radius < 0 || b.Radius > 32 {
			writeError(w, http.StatusBadRequest, "Радиус должен быть от 0 до 32 px")
			return
		}
		if b.Shadow != "none" && b.Shadow != "sm" && b.Shadow != "md" && b.Shadow != "lg" {
			b.Shadow = "none"
		}
	}
	raw, err := json.Marshal(view)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Некорректные данные")
		return
	}
	if err := h.settings.Set(r.Context(), headerButtonsKey, string(raw)); err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить кнопки")
		return
	}
	writeJSON(w, http.StatusOK, view)
}
