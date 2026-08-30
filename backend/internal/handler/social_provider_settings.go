package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type SocialProviderSettingsHandler struct {
	settings *service.SocialProviderSettingsService
	logos    *service.ProviderLogoService
}

func NewSocialProviderSettingsHandler(
	settings *service.SocialProviderSettingsService,
	logos *service.ProviderLogoService,
) *SocialProviderSettingsHandler {
	return &SocialProviderSettingsHandler{settings: settings, logos: logos}
}

func (h *SocialProviderSettingsHandler) ListAdmin(w http.ResponseWriter, r *http.Request) {
	view, err := h.settings.ListAdmin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки провайдеров")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *SocialProviderSettingsHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	provider, err := parseSocialProvider(chi.URLParam(r, "provider"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	view, err := h.settings.GetAdmin(r.Context(), provider)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки провайдера")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *SocialProviderSettingsHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	provider, err := parseSocialProvider(chi.URLParam(r, "provider"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	var cfg model.SocialProviderSettings
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}
	view, err := h.settings.UpdateAdmin(r.Context(), provider, cfg)
	if err != nil {
		if errors.Is(err, service.ErrInvalidSocialProviderSettings) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки провайдера")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *SocialProviderSettingsHandler) ListLogos(w http.ResponseWriter, r *http.Request) {
	items, err := h.logos.ListViews(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить логотипы")
		return
	}
	if items == nil {
		items = []model.ProviderLogoView{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"logos": items})
}

func (h *SocialProviderSettingsHandler) UploadLogo(w http.ResponseWriter, r *http.Request) {
	key, ok := parseProviderLogoKey(w, chi.URLParam(r, "provider"))
	if !ok {
		return
	}
	if err := r.ParseMultipartForm(6 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректная загрузка")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Файл не найден")
		return
	}
	view, err := h.logos.Upload(r.Context(), key, file, header)
	if err != nil {
		writeProviderLogoError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *SocialProviderSettingsHandler) DeleteLogo(w http.ResponseWriter, r *http.Request) {
	key, ok := parseProviderLogoKey(w, chi.URLParam(r, "provider"))
	if !ok {
		return
	}
	if err := h.logos.Delete(r.Context(), key); err != nil {
		writeProviderLogoError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func parseProviderLogoKey(w http.ResponseWriter, raw string) (model.ProviderLogoKey, bool) {
	key, ok := model.ParseProviderLogoKey(raw)
	if !ok {
		writeError(w, http.StatusBadRequest, "неизвестная сеть")
		return "", false
	}
	return key, true
}

func writeProviderLogoError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrProviderLogoInvalid):
		writeError(w, http.StatusBadRequest, "Загрузите PNG. Максимум 512×512, файл до 5 МБ")
	case errors.Is(err, service.ErrProviderLogoNotFound):
		writeError(w, http.StatusNotFound, "Логотип не найден")
	case errors.Is(err, service.ErrStorageNotConfigured):
		writeError(w, http.StatusServiceUnavailable, "Хранилище файлов не настроено")
	default:
		writeError(w, http.StatusInternalServerError, "Не удалось обработать логотип")
	}
}

func parseSocialProvider(raw string) (model.SocialProvider, error) {
	switch model.SocialProvider(raw) {
	case model.SocialProviderVK, model.SocialProviderMAX,
		model.SocialProviderRutube, model.SocialProviderDzen, model.SocialProviderYouTube:
		return model.SocialProvider(raw), nil
	default:
		return "", errors.New("неизвестный провайдер")
	}
}
