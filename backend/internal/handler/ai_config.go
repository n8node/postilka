package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/postilka/postilka/internal/model"
	"github.com/postilka/postilka/internal/service"
)

type YandexGptConfigHandler struct {
	yandex *service.YandexGptConfigService
}

func NewYandexGptConfigHandler(yandex *service.YandexGptConfigService) *YandexGptConfigHandler {
	return &YandexGptConfigHandler{yandex: yandex}
}

func (h *YandexGptConfigHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	view, err := h.yandex.GetAdminView(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки Yandex GPT")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *YandexGptConfigHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var req model.YandexGptAdminUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	view, err := h.yandex.Update(r.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidYandexGptConfig) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки Yandex GPT")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *YandexGptConfigHandler) TestConnection(w http.ResponseWriter, r *http.Request) {
	var req model.YandexGptTestRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	result, err := h.yandex.TestConnection(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось проверить соединение")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

type KieConfigHandler struct {
	kie *service.KieConfigService
}

func NewKieConfigHandler(kie *service.KieConfigService) *KieConfigHandler {
	return &KieConfigHandler{kie: kie}
}

func (h *KieConfigHandler) GetAdmin(w http.ResponseWriter, r *http.Request) {
	settings, err := h.kie.Get(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось загрузить настройки KIE")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"settings": settings})
}

func (h *KieConfigHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var req model.KieUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Некорректное тело запроса")
		return
	}

	settings, err := h.kie.Update(r.Context(), req)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "invalid") {
			writeError(w, http.StatusBadRequest, msg)
			return
		}
		writeError(w, http.StatusInternalServerError, "Не удалось сохранить настройки KIE")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"settings": settings})
}

func (h *KieConfigHandler) TestConnection(w http.ResponseWriter, r *http.Request) {
	var req model.KieTestRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	result, err := h.kie.TestConnection(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось проверить соединение")
		return
	}
	writeJSON(w, http.StatusOK, result)
}
